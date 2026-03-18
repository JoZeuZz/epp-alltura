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

const ACTIVO_STATE_BY_EGRESO = {
  salida: 'perdido',
  consumo: 'perdido',
  ajuste: 'perdido',
  baja: 'dado_de_baja',
};

const MOV_ACTIVO_TYPE_BY_EGRESO = {
  salida: 'salida',
  consumo: 'ajuste',
  ajuste: 'ajuste',
  baja: 'baja',
};

class EgresosService {
  static normalizeCreateDetails(rawDetalles) {
    const normalized = [];
    const seenAssetIds = new Set();

    for (const rawDetalle of rawDetalles) {
      if (rawDetalle.activo_id) {
        throw buildError(
          'Payload legacy no soportado: use activo_ids para egresos serializados',
          400,
          'LEGACY_ASSET_PAYLOAD_NOT_ALLOWED'
        );
      }

      const activoIds = Array.isArray(rawDetalle.activo_ids)
        ? rawDetalle.activo_ids.filter(Boolean)
        : [];

      if (activoIds.length > 0) {
        for (const activoId of activoIds) {
          if (seenAssetIds.has(activoId)) {
            throw buildError(
              `Activo duplicado en payload: ${activoId}`,
              400,
              'DUPLICATE_ASSET_IN_PAYLOAD'
            );
          }
          seenAssetIds.add(activoId);

          normalized.push({
            articulo_id: rawDetalle.articulo_id,
            ubicacion_id: rawDetalle.ubicacion_id,
            activo_id: activoId,
            lote_id: null,
            cantidad: 1,
            notas: rawDetalle.notas,
          });
        }

        continue;
      }

      normalized.push({
        articulo_id: rawDetalle.articulo_id,
        ubicacion_id: rawDetalle.ubicacion_id,
        activo_id: null,
        lote_id: rawDetalle.lote_id || null,
        cantidad: rawDetalle.cantidad,
        notas: rawDetalle.notas,
      });
    }

    return normalized;
  }

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
        u.email_login AS creado_por_nombre,
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
      GROUP BY e.id, u.email_login
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
        u.email_login AS creado_por_nombre
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
        ac.codigo AS activo_codigo,
        ac.nro_serie AS activo_nro_serie,
        l.codigo_lote,
        l.fecha_vencimiento AS lote_fecha_vencimiento
      FROM egreso_detalle ed
      INNER JOIN articulo a ON a.id = ed.articulo_id
      INNER JOIN ubicacion ub ON ub.id = ed.ubicacion_id
      LEFT JOIN activo ac ON ac.id = ed.activo_id
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
    const rawDetalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (!rawDetalles.length) {
      throw buildError('Debe incluir al menos un detalle en el egreso', 400, 'DETAIL_REQUIRED');
    }

    const detalles = this.normalizeCreateDetails(rawDetalles);

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
          `SELECT id, nombre, tracking_mode, retorno_mode FROM articulo WHERE id = $1`,
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

        if (detalle.activo_id) {
          if (articulo.tracking_mode !== 'serial') {
            throw buildError(
              `El artículo "${articulo.nombre}" no admite activo_ids por no ser serial`,
              400,
              'INVALID_SERIAL_ASSET'
            );
          }

          const activoResult = await client.query(
            `
            SELECT id, articulo_id, estado, ubicacion_actual_id
            FROM activo
            WHERE id = $1
            FOR UPDATE
            `,
            [detalle.activo_id]
          );

          if (!activoResult.rows.length) {
            throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400, 'ASSET_NOT_FOUND');
          }

          const activo = activoResult.rows[0];
          if (activo.articulo_id !== detalle.articulo_id) {
            throw buildError(
              `El activo ${detalle.activo_id} no corresponde al artículo ${detalle.articulo_id}`,
              400,
              'ASSET_ARTICLE_MISMATCH'
            );
          }

          if (activo.estado !== 'en_stock') {
            throw buildError(
              `Activo ${detalle.activo_id} no está disponible para egreso`,
              409,
              'ASSET_NOT_AVAILABLE'
            );
          }

          if (activo.ubicacion_actual_id !== detalle.ubicacion_id) {
            throw buildError(
              `Activo ${detalle.activo_id} no pertenece a la ubicación indicada`,
              409,
              'ASSET_LOCATION_MISMATCH'
            );
          }

          const activeCustodyResult = await client.query(
            `
            SELECT id
            FROM custodia_activo
            WHERE activo_id = $1
              AND estado = 'activa'
            LIMIT 1
            FOR UPDATE
            `,
            [detalle.activo_id]
          );

          if (activeCustodyResult.rows.length > 0) {
            throw buildError(
              `Activo ${detalle.activo_id} tiene custodia activa y no puede egresarse`,
              409,
              'ASSET_HAS_ACTIVE_CUSTODY'
            );
          }

          const newAssetState = ACTIVO_STATE_BY_EGRESO[payload.tipo_motivo] || 'perdido';
          const movActivoType = MOV_ACTIVO_TYPE_BY_EGRESO[payload.tipo_motivo] || 'ajuste';

          await client.query(
            `
            UPDATE activo
            SET estado = $1
            WHERE id = $2
            `,
            [newAssetState, detalle.activo_id]
          );

          await client.query(
            `
            INSERT INTO egreso_detalle (
              egreso_id,
              articulo_id,
              ubicacion_id,
              activo_id,
              lote_id,
              cantidad,
              notas
            )
            VALUES ($1, $2, $3, $4, NULL, 1, $5)
            `,
            [
              egresoId,
              detalle.articulo_id,
              detalle.ubicacion_id,
              detalle.activo_id,
              detalle.notas || null,
            ]
          );

          await client.query(
            `
            INSERT INTO movimiento_activo (
              activo_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              responsable_usuario_id,
              egreso_id,
              notas
            )
            VALUES ($1, $2, $3, NULL, $4, $5, $6)
            `,
            [
              detalle.activo_id,
              movActivoType,
              detalle.ubicacion_id,
              userId,
              egresoId,
              detalle.notas || null,
            ]
          );

          continue;
        }

        if (articulo.tracking_mode === 'serial') {
          throw buildError(
            `El artículo "${articulo.nombre}" requiere activo_ids para egreso serializado`,
            400,
            'SERIAL_ASSETS_REQUIRED'
          );
        }

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
            activo_id,
            lote_id,
            cantidad,
            notas
          )
          VALUES ($1, $2, $3, NULL, $4, $5, $6)
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

      const serialDetailsResult = await client.query(
        `
        SELECT activo_id
        FROM egreso_detalle
        WHERE egreso_id = $1
          AND activo_id IS NOT NULL
        FOR UPDATE
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

      // 4.1 Revertir activos serializados
      for (const detalle of serialDetailsResult.rows) {
        await client.query(
          `
          UPDATE activo
          SET estado = 'en_stock'
          WHERE id = $1
          `,
          [detalle.activo_id]
        );
      }

      await client.query(
        `DELETE FROM movimiento_activo WHERE egreso_id = $1`,
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
