const db = require('../db');

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

class EntregasService {
  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`e.estado = $${values.length}`);
    }

    if (filters.trabajador_id) {
      values.push(filters.trabajador_id);
      conditions.push(`e.trabajador_id = $${values.length}`);
    }

    if (filters.creado_por_usuario_id) {
      values.push(filters.creado_por_usuario_id);
      conditions.push(`e.creado_por_usuario_id = $${values.length}`);
    }

    let query = `
      SELECT
        e.*,
        p.nombres,
        p.apellidos
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY e.creado_en DESC';

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getById(id) {
    const entregaResult = await db.query(
      `
      SELECT
        e.*,
        p.rut,
        p.nombres,
        p.apellidos
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      WHERE e.id = $1
      `,
      [id]
    );

    if (!entregaResult.rows.length) {
      throw buildError('Entrega not found', 404);
    }

    const detalleResult = await db.query(
      `
      SELECT
        d.*,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        a.retorno_mode,
        ac.codigo AS activo_codigo,
        l.codigo_lote
      FROM entrega_detalle d
      INNER JOIN articulo a ON a.id = d.articulo_id
      LEFT JOIN activo ac ON ac.id = d.activo_id
      LEFT JOIN lote l ON l.id = d.lote_id
      WHERE d.entrega_id = $1
      ORDER BY d.id
      `,
      [id]
    );

    return {
      ...entregaResult.rows[0],
      detalles: detalleResult.rows,
    };
  }

  static async create(payload, userId) {
    const detalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (detalles.length === 0) {
      throw buildError('Debe incluir al menos un detalle en la entrega', 400);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `
        INSERT INTO entrega (
          creado_por_usuario_id,
          trabajador_id,
          ubicacion_origen_id,
          ubicacion_destino_id,
          tipo,
          estado,
          nota_destino
        )
        VALUES ($1, $2, $3, $4, $5, 'borrador', $6)
        RETURNING id
        `,
        [
          userId,
          payload.trabajador_id,
          payload.ubicacion_origen_id,
          payload.ubicacion_destino_id,
          payload.tipo,
          payload.nota_destino || null,
        ]
      );

      const entregaId = entregaResult.rows[0].id;

      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO entrega_detalle (
            entrega_id, articulo_id, activo_id, lote_id, cantidad, condicion_salida, notas
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            entregaId,
            detalle.articulo_id,
            detalle.activo_id || null,
            detalle.lote_id || null,
            detalle.cantidad,
            detalle.condicion_salida || 'ok',
            detalle.notas || null,
          ]
        );
      }

      await client.query('COMMIT');
      return this.getById(entregaId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async confirm(id, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `
        SELECT *
        FROM entrega
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega not found', 404);
      }

      const entrega = entregaResult.rows[0];
      if (!['borrador', 'pendiente_firma'].includes(entrega.estado)) {
        throw buildError(`No se puede confirmar una entrega en estado "${entrega.estado}"`, 400);
      }

      const signatureResult = await client.query(
        `
        SELECT id
        FROM firma_entrega
        WHERE entrega_id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!signatureResult.rows.length) {
        throw buildError(
          'No se puede confirmar la entrega sin una firma de recepción registrada',
          400
        );
      }

      const detalleResult = await client.query(
        `
        SELECT *
        FROM entrega_detalle
        WHERE entrega_id = $1
        ORDER BY id
        `,
        [id]
      );

      const detalles = detalleResult.rows;
      if (detalles.length === 0) {
        throw buildError('La entrega no tiene detalles', 400);
      }

      for (const detalle of detalles) {
        if (detalle.activo_id) {
          const activoResult = await client.query(
            `
            SELECT *
            FROM activo
            WHERE id = $1
            FOR UPDATE
            `,
            [detalle.activo_id]
          );

          if (!activoResult.rows.length) {
            throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400);
          }

          const activo = activoResult.rows[0];
          if (activo.estado !== 'en_stock') {
            throw buildError(`Activo ${detalle.activo_id} no está disponible para entrega`, 400);
          }

          if (activo.ubicacion_actual_id !== entrega.ubicacion_origen_id) {
            throw buildError(`Activo ${detalle.activo_id} no está en la ubicación de origen`, 400);
          }

          await client.query(
            `
            UPDATE activo
            SET estado = 'asignado', ubicacion_actual_id = $1
            WHERE id = $2
            `,
            [entrega.ubicacion_destino_id, detalle.activo_id]
          );

          await client.query(
            `
            INSERT INTO movimiento_activo (
              activo_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              responsable_usuario_id,
              entrega_id,
              notas
            )
            VALUES ($1, 'entrega', $2, $3, $4, $5, $6)
            `,
            [
              detalle.activo_id,
              entrega.ubicacion_origen_id,
              entrega.ubicacion_destino_id,
              userId,
              entrega.id,
              detalle.notas || null,
            ]
          );

          await client.query(
            `
            INSERT INTO custodia_activo (
              activo_id,
              trabajador_id,
              ubicacion_destino_id,
              entrega_id,
              estado
            )
            VALUES ($1, $2, $3, $4, 'activa')
            `,
            [
              detalle.activo_id,
              entrega.trabajador_id,
              entrega.ubicacion_destino_id,
              entrega.id,
            ]
          );
        } else {
          const originStockResult = await client.query(
            `
            SELECT *
            FROM stock
            WHERE ubicacion_id = $1
              AND articulo_id = $2
              AND lote_id IS NOT DISTINCT FROM $3
            FOR UPDATE
            `,
            [entrega.ubicacion_origen_id, detalle.articulo_id, detalle.lote_id]
          );

          if (!originStockResult.rows.length) {
            throw buildError(
              `No existe stock de artículo ${detalle.articulo_id} en la ubicación origen`,
              400
            );
          }

          const originStock = originStockResult.rows[0];
          const qty = Number(detalle.cantidad);
          if (Number(originStock.cantidad_disponible) < qty) {
            throw buildError(
              `Stock insuficiente para artículo ${detalle.articulo_id} en ubicación origen`,
              400
            );
          }

          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible - $1,
                actualizado_en = NOW()
            WHERE id = $2
            `,
            [qty, originStock.id]
          );

          if (detalle.lote_id) {
            await client.query(
              `
              INSERT INTO stock (
                ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
              )
              VALUES ($1, $2, $3, $4, 0)
              ON CONFLICT (ubicacion_id, articulo_id, lote_id) WHERE lote_id IS NOT NULL
              DO UPDATE SET
                cantidad_disponible = stock.cantidad_disponible + EXCLUDED.cantidad_disponible,
                actualizado_en = NOW()
              `,
              [entrega.ubicacion_destino_id, detalle.articulo_id, detalle.lote_id, qty]
            );
          } else {
            await client.query(
              `
              INSERT INTO stock (
                ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
              )
              VALUES ($1, $2, NULL, $3, 0)
              ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
              DO UPDATE SET
                cantidad_disponible = stock.cantidad_disponible + EXCLUDED.cantidad_disponible,
                actualizado_en = NOW()
              `,
              [entrega.ubicacion_destino_id, detalle.articulo_id, qty]
            );
          }

          await client.query(
            `
            INSERT INTO movimiento_stock (
              articulo_id,
              lote_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              cantidad,
              responsable_usuario_id,
              entrega_id,
              notas
            )
            VALUES ($1, $2, 'entrega', $3, $4, $5, $6, $7, $8)
            `,
            [
              detalle.articulo_id,
              detalle.lote_id || null,
              entrega.ubicacion_origen_id,
              entrega.ubicacion_destino_id,
              qty,
              userId,
              entrega.id,
              detalle.notas || null,
            ]
          );
        }
      }

      await client.query(
        `
        UPDATE entrega
        SET estado = 'confirmada', confirmada_en = NOW()
        WHERE id = $1
        `,
        [id]
      );

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async anular(id, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `SELECT * FROM entrega WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404);
      }

      const entrega = entregaResult.rows[0];
      if (!['borrador', 'pendiente_firma'].includes(entrega.estado)) {
        throw buildError(
          `No se puede anular una entrega en estado "${entrega.estado}"`,
          400
        );
      }

      await client.query(
        `UPDATE entrega SET estado = 'anulada' WHERE id = $1`,
        [id]
      );

      // No se revierten movimientos de stock porque la entrega nunca fue confirmada
      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EntregasService;
