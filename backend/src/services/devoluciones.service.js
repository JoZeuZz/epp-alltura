const db = require('../db');
const crypto = require('crypto');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { resolveImageUrl } = require('../lib/googleCloud');

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

const hashValue = (value) =>
  crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');

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
  static normalizeCreateDetails(rawDetalles) {
    const normalized = [];
    const seenAssetIds = new Set();

    for (const rawDetalle of rawDetalles) {
      if (rawDetalle.activo_id) {
        throw buildError(
          'Payload legacy no soportado: use activo_ids para devoluciones de activos',
          400,
          'LEGACY_ASSET_PAYLOAD_NOT_ALLOWED'
        );
      }

      const activoIds = Array.isArray(rawDetalle.activo_ids)
        ? rawDetalle.activo_ids.filter(Boolean)
        : [];

      if (activoIds.length > 0) {
        if (Number(rawDetalle.cantidad) !== 1) {
          throw buildError(
            'Los detalles con activo_ids deben usar cantidad 1',
            400,
            'INVALID_ASSET_QTY'
          );
        }

        if (rawDetalle.lote_id) {
          throw buildError(
            'No debe enviar lote_id junto con activo_ids',
            400,
            'INVALID_ASSET_LOTE'
          );
        }

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
            custodia_activo_id: rawDetalle.custodia_activo_id || null,
            articulo_id: rawDetalle.articulo_id || null,
            activo_id: activoId,
            lote_id: null,
            cantidad: 1,
            condicion_entrada: rawDetalle.condicion_entrada,
            disposicion: rawDetalle.disposicion,
            notas: rawDetalle.notas,
          });
        }

        continue;
      }

      if (rawDetalle.cantidad === undefined || rawDetalle.cantidad === null) {
        throw buildError(
          'Debe enviar cantidad para devoluciones sin activo_ids',
          400,
          'INVALID_QUANTITY'
        );
      }

      normalized.push({
        custodia_activo_id: rawDetalle.custodia_activo_id || null,
        articulo_id: rawDetalle.articulo_id || null,
        activo_id: null,
        lote_id: rawDetalle.lote_id || null,
        cantidad: rawDetalle.cantidad,
        condicion_entrada: rawDetalle.condicion_entrada,
        disposicion: rawDetalle.disposicion,
        notas: rawDetalle.notas,
      });
    }

    return normalized;
  }

  static async validateReceivingLocationOperational(client, ubicacionId) {
    const locationResult = await client.query(
      `
      SELECT id, tipo, estado, fecha_inicio_operacion, fecha_cierre_operacion
      FROM ubicacion
      WHERE id = $1
      LIMIT 1
      `,
      [ubicacionId]
    );

    if (!locationResult.rows.length) {
      throw buildError('Ubicación de recepción no encontrada', 400, 'LOCATION_NOT_FOUND');
    }

    const location = locationResult.rows[0];
    if (location.estado !== 'activo') {
      throw buildError('La ubicación de recepción debe estar activa', 400, 'LOCATION_NOT_ACTIVE');
    }

    const now = Date.now();
    if (location.fecha_inicio_operacion) {
      const startAt = new Date(location.fecha_inicio_operacion).getTime();
      if (Number.isFinite(startAt) && startAt > now) {
        throw buildError(
          'La ubicación de recepción aún no inicia su vigencia operativa',
          400,
          'LOCATION_NOT_YET_OPERATIONAL'
        );
      }
    }

    if (location.fecha_cierre_operacion) {
      const closedAt = new Date(location.fecha_cierre_operacion).getTime();
      if (Number.isFinite(closedAt) && closedAt <= now) {
        throw buildError(
          'La ubicación de recepción está fuera de vigencia operativa',
          400,
          'LOCATION_CLOSED'
        );
      }
    }
  }

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
        u.email_login AS recibido_por_email,
        f.firma_imagen_url,
        f.firmado_en,
        f.receptor_usuario_id
      FROM devolucion d
      INNER JOIN trabajador t ON t.id = d.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      INNER JOIN usuario u ON u.id = d.recibido_por_usuario_id
      LEFT JOIN firma_devolucion f ON f.devolucion_id = d.id
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

    const devolucion = devolucionResult.rows[0];
    const firmaImagenUrl = devolucion.firma_imagen_url
      ? await resolveImageUrl(devolucion.firma_imagen_url)
      : devolucion.firma_imagen_url;

    return {
      ...devolucion,
      firma_imagen_url: firmaImagenUrl,
      detalles: detallesResult.rows,
    };
  }

  static async signInDevice(id, payload, meta, actorUserId) {
    const acceptanceText = String(payload?.texto_aceptacion || '').trim();
    if (!acceptanceText) {
      throw buildError('El texto de aceptación es obligatorio', 400, 'ACCEPTANCE_TEXT_REQUIRED');
    }

    const signatureImageUrl = String(payload?.firma_imagen_url || '').trim();
    if (!signatureImageUrl) {
      throw buildError('La firma es obligatoria', 400, 'SIGNATURE_IMAGE_REQUIRED');
    }

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
      if (!['borrador', 'pendiente_firma'].includes(devolucion.estado)) {
        throw buildError(
          `No se puede firmar una devolución en estado "${devolucion.estado}"`,
          400,
          'INVALID_RETURN_STATE'
        );
      }

      const existingSignatureResult = await client.query(
        `
        SELECT id
        FROM firma_devolucion
        WHERE devolucion_id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [id]
      );

      if (existingSignatureResult.rows.length) {
        throw buildError('La devolución ya tiene una firma registrada', 409, 'RETURN_ALREADY_SIGNED');
      }

      await client.query(
        `
        INSERT INTO firma_devolucion (
          devolucion_id,
          receptor_usuario_id,
          metodo,
          texto_aceptacion,
          texto_hash,
          firma_imagen_url,
          ip,
          user_agent
        )
        VALUES ($1, $2, 'en_dispositivo', $3, $4, $5, $6, $7)
        `,
        [
          id,
          actorUserId,
          acceptanceText,
          hashValue(acceptanceText),
          signatureImageUrl,
          meta?.ip || null,
          meta?.userAgent || null,
        ]
      );

      if (devolucion.estado === 'borrador') {
        await client.query(
          `
          UPDATE devolucion
          SET estado = 'pendiente_firma'
          WHERE id = $1
          `,
          [id]
        );
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'devolucion',
        entidadId: id,
        accion: 'firmar',
        usuarioId: actorUserId,
        diff: {
          estado_anterior: devolucion.estado,
          estado_nuevo: devolucion.estado === 'borrador' ? 'pendiente_firma' : devolucion.estado,
        },
        ip: meta?.ip || null,
        userAgent: meta?.userAgent || null,
      });

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async create(payload, userId) {
    const rawDetalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (rawDetalles.length === 0) {
      throw buildError('Debe incluir al menos un detalle en la devolución', 400, 'DETAIL_REQUIRED');
    }

    const detalles = this.normalizeCreateDetails(rawDetalles);

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

      await this.validateReceivingLocationOperational(client, payload.ubicacion_recepcion_id);

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

          if (articuloId && articuloId !== activoResult.rows[0].articulo_id) {
            throw buildError(
              `El activo ${activoId} no corresponde al artículo ${articuloId}`,
              400,
              'ASSET_ARTICLE_MISMATCH'
            );
          }

          articuloId = activoResult.rows[0].articulo_id;
          if (qty !== 1) {
            throw buildError('Los detalles con activo_id deben tener cantidad 1', 400, 'INVALID_ASSET_QTY');
          }
        }

        if (!articuloId) {
          throw buildError('Cada detalle debe indicar articulo_id o activo_id', 400, 'ARTICLE_REQUIRED');
        }

        const articleResult = await client.query(
          `
          SELECT id, nombre, retorno_mode
          FROM articulo
          WHERE id = $1
          `,
          [articuloId]
        );

        if (!articleResult.rows.length) {
          throw buildError(`Artículo ${articuloId} no encontrado`, 400, 'ARTICLE_NOT_FOUND');
        }

        const article = articleResult.rows[0];
        if (article.retorno_mode === 'consumible') {
          throw buildError(
            `El artículo ${article.nombre} es consumible y no admite devolución estándar. Regístralo como ajuste excepcional de inventario.`,
            400,
            'CONSUMABLE_RETURN_NOT_ALLOWED'
          );
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

      await writeAuditEvent({
        client,
        entidadTipo: 'devolucion',
        entidadId: devolucionId,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          estado: 'borrador',
          trabajador_id: payload.trabajador_id,
          ubicacion_recepcion_id: payload.ubicacion_recepcion_id,
          detalles_count: detalles.length,
        },
      });

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
      if (devolucion.estado !== 'pendiente_firma') {
        throw buildError(
          `No se puede confirmar una devolución en estado "${devolucion.estado}"`,
          400,
          'INVALID_RETURN_STATE'
        );
      }

      const signatureResult = await client.query(
        `
        SELECT id
        FROM firma_devolucion
        WHERE devolucion_id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!signatureResult.rows.length) {
        throw buildError(
          'No se puede confirmar la devolución sin una firma de recepción registrada',
          400,
          'RETURN_SIGNATURE_REQUIRED'
        );
      }

      await this.validateReceivingLocationOperational(client, devolucion.ubicacion_recepcion_id);

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

          const articleResult = await client.query(
            `
            SELECT id, nombre, retorno_mode
            FROM articulo
            WHERE id = $1
            `,
            [detalle.articulo_id]
          );

          if (!articleResult.rows.length) {
            throw buildError(
              `Artículo ${detalle.articulo_id} no encontrado`,
              400,
              'ARTICLE_NOT_FOUND'
            );
          }

          const article = articleResult.rows[0];
          if (article.retorno_mode === 'consumible') {
            throw buildError(
              `El artículo ${article.nombre} es consumible y no admite devolución estándar. Usa un ajuste excepcional autorizado.`,
              400,
              'CONSUMABLE_RETURN_NOT_ALLOWED'
            );
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

      await writeAuditEvent({
        client,
        entidadTipo: 'devolucion',
        entidadId: id,
        accion: 'devolver',
        usuarioId: userId,
        diff: {
          estado_anterior: devolucion.estado,
          estado_nuevo: 'confirmada',
          detalles_count: detalles.length,
        },
      });

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

  static async getEligibleAssets(filters = {}) {
    const trabajadorId = String(filters.trabajador_id || '').trim();
    if (!trabajadorId) {
      throw buildError('Debe enviar trabajador_id para consultar activos elegibles.', 400, 'WORKER_REQUIRED');
    }

    const values = [trabajadorId];
    const conditions = [
      'c.trabajador_id = $1',
      "c.estado = 'activa'",
      'c.hasta_en IS NULL',
      "ar.tracking_mode = 'serial'",
      "ar.retorno_mode = 'retornable'",
    ];

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`ar.id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie, '') ILIKE $${values.length} OR ar.nombre ILIKE $${values.length})`
      );
    }

    const rawLimit = Number(filters.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200)
      : 25;
    values.push(limit);

    const { rows } = await db.query(
      `
      SELECT
        c.id AS custodia_activo_id,
        c.trabajador_id,
        c.desde_en,
        a.id AS activo_id,
        a.codigo,
        a.nro_serie,
        a.estado AS activo_estado,
        ar.id AS articulo_id,
        ar.nombre AS articulo_nombre,
        u.id AS ubicacion_actual_id,
        u.nombre AS ubicacion_actual_nombre
      FROM custodia_activo c
      INNER JOIN activo a ON a.id = c.activo_id
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN ubicacion u ON u.id = a.ubicacion_actual_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.desde_en DESC
      LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }
}

module.exports = DevolucionesService;
