const crypto = require('crypto');
const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const signatureEvents = require('../lib/signatureEvents');

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

const normalizeAcceptanceText = (generalText, detailText) => {
  const general = String(generalText || '').trim();
  if (!general) {
    throw buildError('El texto de aceptación es obligatorio', 400, 'ACCEPTANCE_TEXT_REQUIRED');
  }

  if (!Array.isArray(detailText) || detailText.length === 0) {
    return general;
  }

  const normalizedDetails = detailText
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      detalle_id: item.detalle_id || null,
      texto: String(item.texto || '').trim(),
    }))
    .filter((item) => item.texto.length > 0)
    .sort((a, b) => String(a.detalle_id).localeCompare(String(b.detalle_id)));

  if (normalizedDetails.length === 0) {
    return general;
  }

  return JSON.stringify({
    general,
    detalle: normalizedDetails,
  });
};

const buildTokenUrl = (token) => `/firmas/tokens/${token}`;

const toExpiryMinutes = (expiraEn) => {
  const diffMs = new Date(expiraEn).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil(diffMs / 60000));
};

const getExpectedSignerWorkerId = (entrega) => {
  if (entrega?.tipo === 'traslado') {
    return entrega.transportista_trabajador_id || entrega.trabajador_id;
  }

  return entrega?.trabajador_id || null;
};

class FirmasService {
  static async createSignatureInDevice(entregaId, payload, meta, actor = null) {
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
        [entregaId]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
      }

      const entrega = entregaResult.rows[0];
      const expectedSignerWorkerId = getExpectedSignerWorkerId(entrega);

      if (actor) {
        const actorRoles = new Set(Array.isArray(actor.roles) ? actor.roles : [actor.role]);
        const isPrivileged =
          actorRoles.has('admin') || actorRoles.has('supervisor') || actorRoles.has('bodega');

        if (!isPrivileged) {
          const workerResult = await client.query(
            `
            SELECT id
            FROM trabajador
            WHERE usuario_id = $1
            LIMIT 1
            `,
            [actor.id]
          );

          if (!workerResult.rows.length || workerResult.rows[0].id !== expectedSignerWorkerId) {
            throw buildError(
              'No tienes permisos para firmar esta entrega',
              403,
              'DELIVERY_WORKER_FORBIDDEN'
            );
          }
        }
      }

      const trabajadorId = payload.trabajador_id || expectedSignerWorkerId;

      const firma = await this.insertSignature(client, {
        entrega,
        trabajadorId,
        metodo: 'en_dispositivo',
        actorUserId: actor?.id || null,
        textoAceptacion: payload.texto_aceptacion,
        textoAceptacionDetalle: payload.texto_aceptacion_detalle,
        firmaImagenUrl: payload.firma_imagen_url,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      await client.query('COMMIT');

      signatureEvents.publishDeliverySigned({
        signatureId: firma.id,
        entregaId: entrega.id,
        metodo: 'en_dispositivo',
        firmadoEn: firma.firmado_en,
        trabajadorId: firma.trabajador_id,
      });

      return {
        ...firma,
        token_consumido: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async generateToken(entregaId, creadoPorUsuarioId, payload = {}) {
    const expiryMinutes = Math.min(
      Math.max(Number(payload.expira_minutos || 60), 5),
      24 * 60
    );

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashValue(token);

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
        [entregaId]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
      }

      const entrega = entregaResult.rows[0];
      const expectedSignerWorkerId = getExpectedSignerWorkerId(entrega);
      if (entrega.estado === 'confirmada') {
        throw buildError('No se puede generar token para una entrega confirmada', 400, 'DELIVERY_CONFIRMED');
      }

      if (entrega.estado === 'anulada') {
        throw buildError('No se puede generar token para una entrega anulada', 400, 'DELIVERY_CANCELLED');
      }

      const signatureResult = await client.query(
        `
        SELECT id
        FROM firma_entrega
        WHERE entrega_id = $1
        LIMIT 1
        `,
        [entregaId]
      );

      if (signatureResult.rows.length) {
        throw buildError('La entrega ya se encuentra firmada', 409, 'DELIVERY_ALREADY_SIGNED');
      }

      const activeTokenResult = await client.query(
        `
        SELECT id, entrega_id, trabajador_id, expira_en, token_publico
        FROM firma_token
        WHERE entrega_id = $1
          AND usado_en IS NULL
          AND expira_en > NOW()
        ORDER BY expira_en DESC, id DESC
        LIMIT 1
        FOR UPDATE
        `,
        [entregaId]
      );

      const activeToken = activeTokenResult.rows[0] || null;
      if (activeToken && activeToken.token_publico) {
        if (entrega.estado === 'borrador') {
          await client.query(
            `
            UPDATE entrega
            SET estado = 'pendiente_firma'
            WHERE id = $1
            `,
            [entregaId]
          );
        }

        await client.query('COMMIT');
        return {
          id: activeToken.id,
          entrega_id: activeToken.entrega_id,
          trabajador_id: activeToken.trabajador_id,
          expira_en: activeToken.expira_en,
          token: activeToken.token_publico,
          url: buildTokenUrl(activeToken.token_publico),
          reused: true,
          time_to_expiry_minutes: toExpiryMinutes(activeToken.expira_en),
        };
      }

      // Si existe token activo legacy sin token_publico, se invalida y se regenera.
      if (activeToken && !activeToken.token_publico) {
        await client.query(
          `
          UPDATE firma_token
          SET expira_en = NOW() - INTERVAL '1 second'
          WHERE id = $1
          `,
          [activeToken.id]
        );
      }

      const tokenResult = await client.query(
        `
        INSERT INTO firma_token (
          entrega_id,
          trabajador_id,
          creado_por_usuario_id,
          token_hash,
          token_publico,
          expira_en
        )
        VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' minutes')::interval)
        RETURNING id, entrega_id, trabajador_id, expira_en
        `,
        [
          entregaId,
          expectedSignerWorkerId,
          creadoPorUsuarioId,
          tokenHash,
          token,
          String(expiryMinutes),
        ]
      );

          await writeAuditEvent({
            client,
            entidadTipo: 'firma_token',
            entidadId: tokenResult.rows[0].id,
            accion: 'crear',
            usuarioId: creadoPorUsuarioId,
            diff: {
              entrega_id: entregaId,
              trabajador_id: expectedSignerWorkerId,
              expira_minutos: expiryMinutes,
            },
          });

      if (entrega.estado === 'borrador') {
        await client.query(
          `
          UPDATE entrega
          SET estado = 'pendiente_firma'
          WHERE id = $1
          `,
          [entregaId]
        );
      }

      await client.query('COMMIT');

      const tokenRecord = tokenResult.rows[0];
      return {
        id: tokenRecord.id,
        entrega_id: tokenRecord.entrega_id,
        trabajador_id: tokenRecord.trabajador_id,
        expira_en: tokenRecord.expira_en,
        token,
        url: buildTokenUrl(token),
        reused: false,
        time_to_expiry_minutes: toExpiryMinutes(tokenRecord.expira_en),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async consumeTokenAndSign(token, payload, meta) {
    if (!token) {
      throw buildError('Token inválido', 400, 'TOKEN_INVALID');
    }

    const tokenHash = hashValue(token);
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `
        SELECT
          ft.*,
          e.estado AS entrega_estado,
          e.trabajador_id AS entrega_trabajador_id,
          e.ubicacion_origen_id,
          e.ubicacion_destino_id
        FROM firma_token ft
        INNER JOIN entrega e ON e.id = ft.entrega_id
        WHERE ft.token_hash = $1
        FOR UPDATE OF ft, e
        `,
        [tokenHash]
      );

      if (!tokenResult.rows.length) {
        throw buildError('Token no encontrado', 404, 'TOKEN_NOT_FOUND');
      }

      const tokenRow = tokenResult.rows[0];
      if (tokenRow.usado_en) {
        throw buildError('El token ya fue utilizado', 409, 'TOKEN_ALREADY_USED');
      }

      if (new Date(tokenRow.expira_en).getTime() <= Date.now()) {
        throw buildError('El token se encuentra expirado', 410, 'TOKEN_EXPIRED');
      }

      const entregaResult = await client.query(
        `
        SELECT *
        FROM entrega
        WHERE id = $1
        FOR UPDATE
        `,
        [tokenRow.entrega_id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
      }

      const firma = await this.insertSignature(client, {
        entrega: entregaResult.rows[0],
        trabajadorId: tokenRow.trabajador_id,
        metodo: 'qr_link',
        actorUserId: tokenRow.creado_por_usuario_id,
        textoAceptacion: payload.texto_aceptacion,
        textoAceptacionDetalle: payload.texto_aceptacion_detalle,
        firmaImagenUrl: payload.firma_imagen_url,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      await client.query(
        `
        UPDATE firma_token
        SET usado_en = NOW(),
            usado_ip = $2,
            usado_user_agent = $3
        WHERE id = $1
        `,
        [tokenRow.id, meta.ip || null, meta.userAgent || null]
      );

      await client.query('COMMIT');

      signatureEvents.publishDeliverySigned({
        signatureId: firma.id,
        entregaId: tokenRow.entrega_id,
        metodo: 'qr_link',
        firmadoEn: firma.firmado_en,
        trabajadorId: firma.trabajador_id,
      });

      return {
        ...firma,
        token_consumido: true,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTokenInfo(token) {
    if (!token) {
      throw buildError('Token inválido', 400, 'TOKEN_INVALID');
    }

    const tokenHash = hashValue(token);
    const { rows } = await db.query(
      `
      SELECT
        ft.id,
        ft.entrega_id,
        ft.trabajador_id,
        ft.expira_en,
        ft.usado_en,
        e.estado AS entrega_estado,
        e.tipo AS entrega_tipo,
        e.nota_destino,
        uo.nombre AS ubicacion_origen_nombre,
        ud.nombre AS ubicacion_destino_nombre,
        p.nombres,
        p.apellidos,
        p.rut,
        fe.id AS firma_id,
        fe.firmado_en
      FROM firma_token ft
      INNER JOIN entrega e ON e.id = ft.entrega_id
      INNER JOIN trabajador t ON t.id = ft.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN firma_entrega fe ON fe.entrega_id = e.id
      LEFT JOIN ubicacion uo ON uo.id = e.ubicacion_origen_id
      LEFT JOIN ubicacion ud ON ud.id = e.ubicacion_destino_id
      WHERE ft.token_hash = $1
      LIMIT 1
      `,
      [tokenHash]
    );

    if (!rows.length) {
      throw buildError('Token no encontrado', 404, 'TOKEN_NOT_FOUND');
    }

    const tokenInfo = rows[0];
    let estadoToken = 'disponible';

    if (tokenInfo.usado_en) {
      estadoToken = 'usado';
    } else if (new Date(tokenInfo.expira_en).getTime() <= Date.now()) {
      estadoToken = 'expirado';
    } else if (tokenInfo.firma_id) {
      estadoToken = 'firmado';
    }

    // Incluir detalles de la entrega para que la página pública pueda mostrarlos
    const detallesResult = await db.query(
      `
      SELECT
        ed.id,
        ed.cantidad,
        ed.tipo_item_entrega,
        ed.condicion_salida,
        ed.notas,
        a.nombre AS articulo_nombre,
        a.tipo AS articulo_tipo,
        a.tracking_mode,
        ac.codigo AS activo_codigo,
        l.codigo_lote
      FROM entrega_detalle ed
      INNER JOIN articulo a ON a.id = ed.articulo_id
      LEFT JOIN activo ac ON ac.id = ed.activo_id
      LEFT JOIN lote l ON l.id = ed.lote_id
      WHERE ed.entrega_id = $1
      ORDER BY ed.id
      `,
      [tokenInfo.entrega_id]
    );

    return {
      ...tokenInfo,
      estado_token: estadoToken,
      detalles: detallesResult.rows,
    };
  }

  static async getPendingDeliveriesForUser(userId) {
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
        entregas: [],
      };
    }

    const trabajadorId = trabajadorResult.rows[0].id;

    const entregasResult = await db.query(
      `
      SELECT
        e.*,
        COUNT(d.id)::int AS cantidad_items,
        COALESCE(SUM(d.cantidad), 0) AS cantidad_total
      FROM entrega e
      INNER JOIN entrega_detalle d ON d.entrega_id = e.id
      LEFT JOIN firma_entrega f ON f.entrega_id = e.id
      WHERE (
        e.trabajador_id = $1
        OR (e.tipo = 'traslado' AND COALESCE(e.transportista_trabajador_id, e.trabajador_id) = $1)
      )
        AND e.estado IN ('borrador', 'pendiente_firma')
        AND f.id IS NULL
      GROUP BY e.id
      ORDER BY e.creado_en DESC
      `,
      [trabajadorId]
    );

    return {
      trabajador_id: trabajadorId,
      entregas: entregasResult.rows,
    };
  }

  static async insertSignature(client, signatureInput) {
    const entrega = signatureInput.entrega;

    if (entrega.estado === 'confirmada') {
      throw buildError('La entrega ya fue confirmada, no se puede firmar nuevamente', 409, 'DELIVERY_CONFIRMED');
    }

    if (entrega.estado === 'anulada') {
      throw buildError('La entrega se encuentra anulada', 400, 'DELIVERY_CANCELLED');
    }

    const expectedSignerWorkerId = getExpectedSignerWorkerId(entrega);

    if (expectedSignerWorkerId !== signatureInput.trabajadorId) {
      throw buildError('El trabajador de la firma no coincide con la entrega', 403, 'WORKER_MISMATCH');
    }

    const signatureExists = await client.query(
      `
      SELECT id
      FROM firma_entrega
      WHERE entrega_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [entrega.id]
    );

    if (signatureExists.rows.length) {
      throw buildError('La entrega ya tiene una firma registrada', 409, 'DELIVERY_ALREADY_SIGNED');
    }

    const acceptanceText = normalizeAcceptanceText(
      signatureInput.textoAceptacion,
      signatureInput.textoAceptacionDetalle
    );

    const signatureImageUrl = String(signatureInput.firmaImagenUrl || '').trim();
    if (!signatureImageUrl) {
      throw buildError('La firma es obligatoria', 400, 'SIGNATURE_IMAGE_REQUIRED');
    }

    const signatureResult = await client.query(
      `
      INSERT INTO firma_entrega (
        entrega_id,
        trabajador_id,
        metodo,
        texto_aceptacion,
        texto_hash,
        firma_imagen_url,
        ip,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        entrega.id,
        signatureInput.trabajadorId,
        signatureInput.metodo,
        acceptanceText,
        hashValue(acceptanceText),
        signatureImageUrl,
        signatureInput.ip || null,
        signatureInput.userAgent || null,
      ]
    );

    await writeAuditEvent({
      client,
      entidadTipo: 'firma_entrega',
      entidadId: signatureResult.rows[0].id,
      accion: 'firmar',
      usuarioId: signatureInput.actorUserId || null,
      diff: {
        entrega_id: entrega.id,
        trabajador_id: signatureInput.trabajadorId,
        metodo: signatureInput.metodo,
      },
    });

    if (entrega.estado === 'borrador') {
      await client.query(
        `
        UPDATE entrega
        SET estado = 'pendiente_firma'
        WHERE id = $1
        `,
        [entrega.id]
      );
    }

    return signatureResult.rows[0];
  }
}

module.exports = FirmasService;
