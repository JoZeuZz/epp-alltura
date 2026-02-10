const db = require('../db');

const CUSTODIA_STATE_BY_DISPOSICION = {
  devuelto: 'devuelta',
  perdido: 'perdida',
  baja: 'baja',
  mantencion: 'mantencion',
};

const ACTIVO_STATE_BY_DISPOSICION = {
  devuelto: 'en_stock',
  perdido: 'perdido',
  baja: 'dado_de_baja',
  mantencion: 'mantencion',
};

const MOV_ACTIVO_TYPE_BY_DISPOSICION = {
  devuelto: 'devolucion',
  perdido: 'ajuste',
  baja: 'baja',
  mantencion: 'mantencion',
};

const MOV_STOCK_TYPE_BY_DISPOSICION = {
  devuelto: 'devolucion',
  perdido: 'ajuste',
  baja: 'baja',
  mantencion: 'ajuste',
};

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const toQuantity = (value, fieldName = 'cantidad') => {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw buildError(`El campo ${fieldName} debe ser mayor que cero`, 400, 'INVALID_QUANTITY');
  }
  return qty;
};

const appendDispositionNote = (note, disposition) => {
  const suffix = `[disposicion:${disposition}]`;
  if (!note) {
    return suffix;
  }
  return `${note} ${suffix}`;
};

class DevolucionesService {
  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`d.estado = $${values.length}`);
    }

    if (filters.trabajador_id) {
      values.push(filters.trabajador_id);
      conditions.push(`d.trabajador_id = $${values.length}`);
    }

    if (filters.recibido_por_usuario_id) {
      values.push(filters.recibido_por_usuario_id);
      conditions.push(`d.recibido_por_usuario_id = $${values.length}`);
    }

    let query = `
      SELECT
        d.*,
        p.nombres,
        p.apellidos,
        COUNT(dd.id)::int AS cantidad_detalles
      FROM devolucion d
      INNER JOIN trabajador t ON t.id = d.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN devolucion_detalle dd ON dd.devolucion_id = d.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY d.id, p.id
      ORDER BY d.creado_en DESC
    `;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getById(id) {
    const devolucionResult = await db.query(
      `
      SELECT
        d.*,
        p.rut,
        p.nombres,
        p.apellidos,
        p.email,
        p.telefono,
        u.email_login AS recibido_por_email
      FROM devolucion d
      INNER JOIN trabajador t ON t.id = d.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      INNER JOIN usuario u ON u.id = d.recibido_por_usuario_id
      WHERE d.id = $1
      `,
      [id]
    );

    if (!devolucionResult.rows.length) {
      throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
    }

    const detallesResult = await db.query(
      `
      SELECT
        dd.*,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        a.retorno_mode,
        ac.codigo AS activo_codigo,
        ac.nro_serie AS activo_nro_serie,
        l.codigo_lote,
        c.estado AS custodia_estado
      FROM devolucion_detalle dd
      LEFT JOIN articulo a ON a.id = dd.articulo_id
      LEFT JOIN activo ac ON ac.id = dd.activo_id
      LEFT JOIN lote l ON l.id = dd.lote_id
      LEFT JOIN custodia_activo c ON c.id = dd.custodia_activo_id
      WHERE dd.devolucion_id = $1
      ORDER BY dd.id
      `,
      [id]
    );

    return {
      ...devolucionResult.rows[0],
      detalles: detallesResult.rows,
    };
  }

  static async create(payload, userId) {
    const detalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (detalles.length === 0) {
      throw buildError('Debe incluir al menos un detalle en la devolución', 400, 'DETAIL_REQUIRED');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const trabajadorResult = await client.query(
        `
        SELECT id
        FROM trabajador
        WHERE id = $1
        `,
        [payload.trabajador_id]
      );

      if (!trabajadorResult.rows.length) {
        throw buildError('Trabajador no encontrado', 400, 'WORKER_NOT_FOUND');
      }

      const ubicacionResult = await client.query(
        `
        SELECT id
        FROM ubicacion
        WHERE id = $1
        `,
        [payload.ubicacion_recepcion_id]
      );

      if (!ubicacionResult.rows.length) {
        throw buildError('Ubicación de recepción no encontrada', 400, 'LOCATION_NOT_FOUND');
      }

      const devolucionInsertResult = await client.query(
        `
        INSERT INTO devolucion (
          trabajador_id,
          recibido_por_usuario_id,
          ubicacion_recepcion_id,
          estado,
          notas
        )
        VALUES ($1, $2, $3, 'borrador', $4)
        RETURNING id
        `,
        [
          payload.trabajador_id,
          userId,
          payload.ubicacion_recepcion_id,
          payload.notas || null,
        ]
      );

      const devolucionId = devolucionInsertResult.rows[0].id;

      for (const detalle of detalles) {
        const qty = toQuantity(detalle.cantidad);

        let articuloId = detalle.articulo_id || null;
        let activoId = detalle.activo_id || null;

        if (activoId) {
          const activoResult = await client.query(
            `
            SELECT id, articulo_id
            FROM activo
            WHERE id = $1
            `,
            [activoId]
          );

          if (!activoResult.rows.length) {
            throw buildError(`Activo ${activoId} no encontrado`, 400, 'ASSET_NOT_FOUND');
          }

          articuloId = activoResult.rows[0].articulo_id;
          if (qty !== 1) {
            throw buildError('Los detalles con activo_id deben tener cantidad 1', 400, 'INVALID_ASSET_QTY');
          }
        }

        if (!articuloId) {
          throw buildError('Cada detalle debe indicar articulo_id o activo_id', 400, 'ARTICLE_REQUIRED');
        }

        await client.query(
          `
          INSERT INTO devolucion_detalle (
            devolucion_id,
            custodia_activo_id,
            articulo_id,
            activo_id,
            lote_id,
            cantidad,
            condicion_entrada,
            disposicion,
            notas
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            devolucionId,
            detalle.custodia_activo_id || null,
            articuloId,
            activoId,
            detalle.lote_id || null,
            qty,
            detalle.condicion_entrada || 'ok',
            detalle.disposicion || 'devuelto',
            detalle.notas || null,
          ]
        );
      }

      await client.query('COMMIT');
      return this.getById(devolucionId);
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

      const devolucionResult = await client.query(
        `
        SELECT *
        FROM devolucion
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

      if (!devolucionResult.rows.length) {
        throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
      }

      const devolucion = devolucionResult.rows[0];
      if (devolucion.estado !== 'borrador') {
        throw buildError(
          `No se puede confirmar una devolución en estado "${devolucion.estado}"`,
          400,
          'INVALID_RETURN_STATE'
        );
      }

      const detallesResult = await client.query(
        `
        SELECT *
        FROM devolucion_detalle
        WHERE devolucion_id = $1
        ORDER BY id
        FOR UPDATE
        `,
        [id]
      );

      const detalles = detallesResult.rows;
      if (detalles.length === 0) {
        throw buildError('La devolución no tiene detalles', 400, 'DETAIL_REQUIRED');
      }

      for (const detalle of detalles) {
        const qty = toQuantity(detalle.cantidad);
        const disposition = detalle.disposicion;

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
            throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400, 'ASSET_NOT_FOUND');
          }

          const activo = activoResult.rows[0];
          let custodiaId = detalle.custodia_activo_id;

          let custodiaResult;
          if (custodiaId) {
            custodiaResult = await client.query(
              `
              SELECT *
              FROM custodia_activo
              WHERE id = $1
              FOR UPDATE
              `,
              [custodiaId]
            );
          } else {
            custodiaResult = await client.query(
              `
              SELECT *
              FROM custodia_activo
              WHERE activo_id = $1
                AND trabajador_id = $2
                AND estado = 'activa'
                AND hasta_en IS NULL
              ORDER BY desde_en DESC
              LIMIT 1
              FOR UPDATE
              `,
              [detalle.activo_id, devolucion.trabajador_id]
            );
          }

          if (!custodiaResult.rows.length) {
            throw buildError(
              `No existe custodia activa para el activo ${detalle.activo_id}`,
              400,
              'ACTIVE_CUSTODY_NOT_FOUND'
            );
          }

          const custodia = custodiaResult.rows[0];
          custodiaId = custodia.id;

          await client.query(
            `
            UPDATE devolucion_detalle
            SET custodia_activo_id = $1
            WHERE id = $2
            `,
            [custodiaId, detalle.id]
          );

          await client.query(
            `
            UPDATE custodia_activo
            SET estado = $1,
                hasta_en = NOW()
            WHERE id = $2
            `,
            [CUSTODIA_STATE_BY_DISPOSICION[disposition], custodiaId]
          );

          const newAssetState = ACTIVO_STATE_BY_DISPOSICION[disposition];
          const destinationLocation = ['devuelto', 'mantencion'].includes(disposition)
            ? devolucion.ubicacion_recepcion_id
            : null;

          await client.query(
            `
            UPDATE activo
            SET estado = $1,
                ubicacion_actual_id = COALESCE($2, ubicacion_actual_id)
            WHERE id = $3
            `,
            [newAssetState, destinationLocation, detalle.activo_id]
          );

          await client.query(
            `
            INSERT INTO movimiento_activo (
              activo_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              responsable_usuario_id,
              devolucion_id,
              notas
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
              detalle.activo_id,
              MOV_ACTIVO_TYPE_BY_DISPOSICION[disposition],
              activo.ubicacion_actual_id,
              destinationLocation,
              userId,
              devolucion.id,
              appendDispositionNote(detalle.notas, disposition),
            ]
          );
        } else {
          if (!detalle.articulo_id) {
            throw buildError('Detalle sin artículo no puede ser confirmado', 400, 'ARTICLE_REQUIRED');
          }

          const movementType = MOV_STOCK_TYPE_BY_DISPOSICION[disposition];

          if (disposition === 'devuelto') {
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
                [devolucion.ubicacion_recepcion_id, detalle.articulo_id, detalle.lote_id, qty]
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
                [devolucion.ubicacion_recepcion_id, detalle.articulo_id, qty]
              );
            }
          }

          if (disposition === 'mantencion') {
            if (detalle.lote_id) {
              await client.query(
                `
                INSERT INTO stock (
                  ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
                )
                VALUES ($1, $2, $3, 0, $4)
                ON CONFLICT (ubicacion_id, articulo_id, lote_id) WHERE lote_id IS NOT NULL
                DO UPDATE SET
                  cantidad_reservada = stock.cantidad_reservada + EXCLUDED.cantidad_reservada,
                  actualizado_en = NOW()
                `,
                [devolucion.ubicacion_recepcion_id, detalle.articulo_id, detalle.lote_id, qty]
              );
            } else {
              await client.query(
                `
                INSERT INTO stock (
                  ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
                )
                VALUES ($1, $2, NULL, 0, $3)
                ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
                DO UPDATE SET
                  cantidad_reservada = stock.cantidad_reservada + EXCLUDED.cantidad_reservada,
                  actualizado_en = NOW()
                `,
                [devolucion.ubicacion_recepcion_id, detalle.articulo_id, qty]
              );
            }
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
              devolucion_id,
              notas
            )
            VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8)
            `,
            [
              detalle.articulo_id,
              detalle.lote_id || null,
              movementType,
              ['devuelto', 'mantencion'].includes(disposition)
                ? devolucion.ubicacion_recepcion_id
                : null,
              qty,
              userId,
              devolucion.id,
              appendDispositionNote(detalle.notas, disposition),
            ]
          );
        }
      }

      await client.query(
        `
        UPDATE devolucion
        SET estado = 'confirmada',
            recibido_por_usuario_id = $2,
            confirmada_en = NOW()
        WHERE id = $1
        `,
        [id, userId]
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

  static async getActiveCustodiasForUser(userId) {
    const trabajadorResult = await db.query(
      `
      SELECT id
      FROM trabajador
      WHERE usuario_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!trabajadorResult.rows.length) {
      return {
        trabajador_id: null,
        custodias: [],
      };
    }

    const trabajadorId = trabajadorResult.rows[0].id;
    const custodiasResult = await db.query(
      `
      SELECT
        c.*,
        a.codigo AS activo_codigo,
        a.nro_serie AS activo_nro_serie,
        ar.nombre AS articulo_nombre,
        ar.tipo AS articulo_tipo,
        ar.tracking_mode,
        u.nombre AS ubicacion_destino_nombre
      FROM custodia_activo c
      INNER JOIN activo a ON a.id = c.activo_id
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      INNER JOIN ubicacion u ON u.id = c.ubicacion_destino_id
      WHERE c.trabajador_id = $1
        AND c.estado = 'activa'
        AND c.hasta_en IS NULL
      ORDER BY c.desde_en DESC
      `,
      [trabajadorId]
    );

    return {
      trabajador_id: trabajadorId,
      custodias: custodiasResult.rows,
    };
  }
}

module.exports = DevolucionesService;
