const db = require('../db');

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const toQuantity = (value) => {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw buildError('La cantidad debe ser mayor que cero', 400, 'INVALID_QUANTITY');
  }
  return qty;
};

class EgresosService {
  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.tipo_motivo) {
      values.push(filters.tipo_motivo);
      conditions.push(`e.tipo_motivo = $${values.length}`);
    }

    if (filters.creado_por_usuario_id) {
      values.push(filters.creado_por_usuario_id);
      conditions.push(`e.creado_por_usuario_id = $${values.length}`);
    }

    if (filters.desde) {
      values.push(filters.desde);
      conditions.push(`e.creado_en >= $${values.length}`);
    }

    if (filters.hasta) {
      values.push(filters.hasta);
      conditions.push(`e.creado_en <= $${values.length}`);
    }

    let query = `
      SELECT
        e.*,
        u.nombre_usuario AS creado_por_nombre,
        COUNT(ed.id)::int AS cantidad_items,
        COALESCE(SUM(ed.cantidad), 0) AS cantidad_total
      FROM egreso e
      LEFT JOIN usuario u ON u.id = e.creado_por_usuario_id
      LEFT JOIN egreso_detalle ed ON ed.egreso_id = e.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY e.id, u.nombre_usuario
      ORDER BY e.creado_en DESC
    `;

    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    query += ` LIMIT ${limit}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getById(id) {
    const egresoResult = await db.query(
      `
      SELECT
        e.*,
        u.nombre_usuario AS creado_por_nombre
      FROM egreso e
      LEFT JOIN usuario u ON u.id = e.creado_por_usuario_id
      WHERE e.id = $1
      `,
      [id]
    );

    if (!egresoResult.rows.length) {
      throw buildError('Egreso no encontrado', 404, 'EGRESO_NOT_FOUND');
    }

    const detallesResult = await db.query(
      `
      SELECT
        ed.*,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        ub.nombre AS ubicacion_nombre,
        l.codigo_lote,
        l.fecha_vencimiento AS lote_fecha_vencimiento
      FROM egreso_detalle ed
      INNER JOIN articulo a ON a.id = ed.articulo_id
      INNER JOIN ubicacion ub ON ub.id = ed.ubicacion_id
      LEFT JOIN lote l ON l.id = ed.lote_id
      WHERE ed.egreso_id = $1
      ORDER BY ed.id
      `,
      [id]
    );

    return {
      ...egresoResult.rows[0],
      detalles: detallesResult.rows,
    };
  }

  static async create(payload, userId) {
    const detalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (!detalles.length) {
      throw buildError('Debe incluir al menos un detalle en el egreso', 400, 'DETAIL_REQUIRED');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insertar encabezado del egreso
      const egresoResult = await client.query(
        `
        INSERT INTO egreso (
          creado_por_usuario_id,
          tipo_motivo,
          notas
        )
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [userId, payload.tipo_motivo, payload.notas || null]
      );

      const egresoId = egresoResult.rows[0].id;

      for (const detalle of detalles) {
        const qty = toQuantity(detalle.cantidad);

        // 2. Validar ubicación
        const ubicacionResult = await client.query(
          `SELECT id FROM ubicacion WHERE id = $1`,
          [detalle.ubicacion_id]
        );
        if (!ubicacionResult.rows.length) {
          throw buildError(
            `Ubicación ${detalle.ubicacion_id} no encontrada`,
            400,
            'LOCATION_NOT_FOUND'
          );
        }

        // 3. Validar artículo
        const articuloResult = await client.query(
          `SELECT id, nombre, tracking_mode FROM articulo WHERE id = $1`,
          [detalle.articulo_id]
        );
        if (!articuloResult.rows.length) {
          throw buildError(
            `Artículo ${detalle.articulo_id} no encontrado`,
            400,
            'ARTICLE_NOT_FOUND'
          );
        }

        const articulo = articuloResult.rows[0];
        const loteId = detalle.lote_id || null;

        // 4. Bloquear y verificar stock disponible
        let stockResult;
        if (loteId) {
          stockResult = await client.query(
            `
            SELECT id, cantidad_disponible
            FROM stock
            WHERE articulo_id = $1 AND lote_id = $2 AND ubicacion_id = $3
            FOR UPDATE
            `,
            [detalle.articulo_id, loteId, detalle.ubicacion_id]
          );
        } else {
          stockResult = await client.query(
            `
            SELECT id, cantidad_disponible
            FROM stock
            WHERE articulo_id = $1 AND lote_id IS NULL AND ubicacion_id = $2
            FOR UPDATE
            `,
            [detalle.articulo_id, detalle.ubicacion_id]
          );
        }

        if (!stockResult.rows.length) {
          throw buildError(
            `No hay stock registrado para el artículo "${articulo.nombre}" en la ubicación indicada.`,
            409,
            'STOCK_NOT_FOUND'
          );
        }

        const stockDisponible = Number(stockResult.rows[0].cantidad_disponible);
        if (stockDisponible < qty) {
          throw buildError(
            `Stock insuficiente para "${articulo.nombre}": disponible ${stockDisponible}, requerido ${qty}.`,
            409,
            'STOCK_INSUFICIENTE'
          );
        }

        // 5. Descontar stock
        if (loteId) {
          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible - $1, actualizado_en = NOW()
            WHERE articulo_id = $2 AND lote_id = $3 AND ubicacion_id = $4
            `,
            [qty, detalle.articulo_id, loteId, detalle.ubicacion_id]
          );
        } else {
          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible - $1, actualizado_en = NOW()
            WHERE articulo_id = $2 AND lote_id IS NULL AND ubicacion_id = $3
            `,
            [qty, detalle.articulo_id, detalle.ubicacion_id]
          );
        }

        // 6. Registrar detalle del egreso
        await client.query(
          `
          INSERT INTO egreso_detalle (
            egreso_id,
            articulo_id,
            ubicacion_id,
            lote_id,
            cantidad,
            notas
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [egresoId, detalle.articulo_id, detalle.ubicacion_id, loteId, qty, detalle.notas || null]
        );

        // 7. Registrar movimiento de stock
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
            egreso_id,
            notas
          )
          VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)
          `,
          [
            detalle.articulo_id,
            loteId,
            payload.tipo_motivo,
            detalle.ubicacion_id,
            qty,
            userId,
            egresoId,
            detalle.notas || null,
          ]
        );
      }

      await client.query('COMMIT');
      return this.getById(egresoId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteEgreso(id) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verificar que el egreso existe
      const egresoCheck = await client.query(
        `SELECT id FROM egreso WHERE id = $1`,
        [id]
      );
      if (!egresoCheck.rows.length) {
        throw buildError('Egreso no encontrado', 404, 'EGRESO_NOT_FOUND');
      }

      // 2. Obtener movimientos de stock asociados a este egreso
      const movimientosResult = await client.query(
        `
        SELECT
          ms.articulo_id,
          ms.lote_id,
          ms.ubicacion_origen_id AS ubicacion_id,
          ms.cantidad
        FROM movimiento_stock ms
        WHERE ms.egreso_id = $1
        `,
        [id]
      );

      // 3. Revertir stock para cada movimiento
      for (const mov of movimientosResult.rows) {
        if (mov.lote_id) {
          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible + $1, actualizado_en = NOW()
            WHERE articulo_id = $2 AND lote_id = $3 AND ubicacion_id = $4
            `,
            [mov.cantidad, mov.articulo_id, mov.lote_id, mov.ubicacion_id]
          );
        } else {
          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible + $1, actualizado_en = NOW()
            WHERE articulo_id = $2 AND lote_id IS NULL AND ubicacion_id = $3
            `,
            [mov.cantidad, mov.articulo_id, mov.ubicacion_id]
          );
        }
      }

      // 4. Eliminar movimientos de stock
      await client.query(
        `DELETE FROM movimiento_stock WHERE egreso_id = $1`,
        [id]
      );

      // 5. Eliminar egreso (cascade a egreso_detalle)
      await client.query(
        `DELETE FROM egreso WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EgresosService;
