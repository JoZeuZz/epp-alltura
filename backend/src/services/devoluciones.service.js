const crypto = require('crypto');
const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { uploadFile, deleteFileByUrl, resolveImageUrl, resolveHeaderImages } = require('../lib/googleCloud');

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

const MOVIMIENTO_TYPE_BY_DISPOSICION = {
  devuelto: 'devolucion',
  perdido: 'ajuste',
  baja: 'baja',
  mantencion: 'mantencion',
};

const { buildError } = require('../lib/errors');

const isUuid = (value) => UUID_REGEX.test(String(value || '').trim());

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

const mapHeaderRow = (row) => ({
  id: row.id,
  trabajador_id: row.trabajador_id,
  recibido_por_usuario_id: row.recibido_por_usuario_id,
  ubicacion_recepcion_id: row.ubicacion_recepcion_id,
  estado: row.estado,
  creado_en: row.creado_en,
  confirmada_en: row.confirmada_en,
  notas: row.notas,
  evidencia_foto_url: row.evidencia_foto_url || null,
  nombres: row.nombres,
  apellidos: row.apellidos,
  cantidad_detalles: Number(row.cantidad_detalles || 0),
  firma_imagen_url: row.firma_imagen_url,
  firmado_en: row.firmado_en,
});

class DevolucionesService {

  static async _validateWorkerActive(client, trabajadorId) {
    const { rows } = await client.query(
      `SELECT t.id, t.estado, p.estado AS persona_estado
       FROM trabajador t
       INNER JOIN persona p ON p.id = t.persona_id
       WHERE t.id = $1
       LIMIT 1`,
      [trabajadorId]
    );

    if (!rows.length) {
      throw buildError('Trabajador no encontrado', 400, 'WORKER_NOT_FOUND');
    }

    const worker = rows[0];
    if (worker.estado !== 'activo' || worker.persona_estado !== 'activo') {
      throw buildError(
        'El trabajador debe estar activo para registrar una devolución',
        400,
        'WORKER_NOT_ACTIVE'
      );
    }
  }

  static async _validateReceivingBodega(client, bodegaRecepcionId) {
    if (!isUuid(bodegaRecepcionId)) {
      throw buildError('Ubicación de recepción inválida', 400, 'RECEPTION_LOCATION_INVALID');
    }

    const { rows } = await client.query(
      `SELECT id, estado
       FROM bodegas
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [bodegaRecepcionId]
    );

    if (!rows.length) {
      throw buildError('Bodega de recepción no encontrada', 400, 'BODEGA_NOT_FOUND');
    }

    if (rows[0].estado !== 'activo') {
      throw buildError('La bodega de recepción debe estar activa', 400, 'BODEGA_NOT_ACTIVE');
    }
  }

  static async _validateDraftDetails(client, detalles, trabajadorId) {
    if (!Array.isArray(detalles) || !detalles.length) {
      throw buildError('Debe incluir al menos un detalle de devolución', 400, 'DETAILS_REQUIRED');
    }

    const normalized = [];
    const selectedAssetIds = new Set();

    for (const detail of detalles) {
      const articuloId = String(detail?.articulo_id || '').trim();
      if (!isUuid(articuloId)) {
        throw buildError('Artículo inválido en detalle de devolución', 400, 'DETAIL_ARTICLE_INVALID');
      }

      const articuloResult = await client.query(
        `SELECT id, nombre, tracking_mode
         FROM articulo
         WHERE id = $1
         LIMIT 1`,
        [articuloId]
      );

      if (!articuloResult.rows.length) {
        throw buildError('Artículo no encontrado en detalle de devolución', 400, 'DETAIL_ARTICLE_NOT_FOUND');
      }

      const articulo = articuloResult.rows[0];
      if (articulo.tracking_mode !== 'serial') {
        throw buildError(
          `El artículo ${articulo.nombre} no cumple política V2: solo serializados`,
          400,
          'NON_SERIAL_NOT_SUPPORTED'
        );
      }

      const assetIds = Array.isArray(detail?.activo_ids)
        ? detail.activo_ids.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

      if (!assetIds.length) {
        throw buildError(
          `El artículo ${articulo.nombre} requiere al menos un activo serializado`,
          400,
          'SERIAL_ASSETS_REQUIRED'
        );
      }

      for (const assetId of assetIds) {
        if (!isUuid(assetId)) {
          throw buildError('Activo inválido en detalle de devolución', 400, 'DETAIL_ASSET_INVALID');
        }

        if (selectedAssetIds.has(assetId)) {
          throw buildError(
            'No puedes repetir el mismo activo en más de un ítem',
            409,
            'DUPLICATED_ASSET'
          );
        }
        selectedAssetIds.add(assetId);

        const assetResult = await client.query(
          `SELECT id, articulo_id, estado, proyecto_actual_id
           FROM activo
           WHERE id = $1
           FOR UPDATE`,
          [assetId]
        );

        if (!assetResult.rows.length) {
          throw buildError('Activo no encontrado en detalle de devolución', 404, 'ASSET_NOT_FOUND');
        }

        const asset = assetResult.rows[0];
        if (asset.articulo_id !== articulo.id) {
          throw buildError(
            `El activo ${assetId} no corresponde al artículo ${articulo.nombre}`,
            409,
            'ASSET_ARTICLE_MISMATCH'
          );
        }

        if (asset.estado !== 'asignado') {
          throw buildError(
            `El activo ${assetId} no está asignado para devolución`,
            409,
            'ASSET_NOT_ASSIGNED'
          );
        }

        const custodyResult = await client.query(
          `SELECT id, trabajador_id, proyecto_id, estado, entrega_id
           FROM custodia_activo
           WHERE activo_id = $1
             AND estado = 'activa'
           ORDER BY desde_en DESC
           LIMIT 1
           FOR UPDATE`,
          [assetId]
        );

        if (!custodyResult.rows.length) {
          throw buildError(
            `El activo ${assetId} no tiene custodia activa`,
            400,
            'NO_ACTIVE_CUSTODY'
          );
        }

        const custody = custodyResult.rows[0];
        if (custody.trabajador_id !== trabajadorId) {
          throw buildError(
            `El activo ${assetId} no pertenece al trabajador seleccionado`,
            409,
            'WORKER_CUSTODY_MISMATCH'
          );
        }

        if (asset.proyecto_actual_id !== custody.proyecto_id) {
          throw buildError(
            `El activo ${assetId} no está en el proyecto esperado`,
            409,
            'ASSET_WRONG_PROJECT'
          );
        }

        normalized.push({
          custodia_activo_id: custody.id,
          articulo_id: articulo.id,
          activo_id: asset.id,
          cantidad: 1,
          condicion_entrada: detail?.condicion_entrada || 'ok',
          disposicion: detail?.disposicion,
          notas: detail?.notas || null,
        });
      }
    }

    return normalized;
  }

  static async _getByIdWithClient(client, id) {
    const headerResult = await client.query(
      `SELECT
         d.id,
         d.trabajador_id,
         d.recibido_por_usuario_id,
         d.bodega_recepcion_id AS ubicacion_recepcion_id,
         d.estado,
         d.creado_en,
         d.confirmada_en,
         d.notas,
         d.evidencia_foto_url,
         p.nombres,
         p.apellidos,
         fd.firma_imagen_url,
         fd.firmado_en,
         COALESCE((
           SELECT COUNT(*)::int
           FROM devolucion_detalle dd_count
           WHERE dd_count.devolucion_id = d.id
         ), 0) AS cantidad_detalles
       FROM devolucion d
       INNER JOIN trabajador t ON t.id = d.trabajador_id
       INNER JOIN persona p ON p.id = t.persona_id
       LEFT JOIN firma_devolucion fd ON fd.devolucion_id = d.id
       WHERE d.id = $1
       LIMIT 1`,
      [id]
    );

    if (!headerResult.rows.length) {
      throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
    }

    const detailResult = await client.query(
      `SELECT
         dd.id,
         dd.devolucion_id,
         dd.custodia_activo_id,
         dd.articulo_id,
         a.nombre AS articulo_nombre,
         dd.activo_id,
         ac.codigo AS activo_codigo,
         ac.nro_serie AS activo_nro_serie,
         COALESCE(ac.foto_url, a.foto_url) AS foto_url,
         dd.cantidad,
         dd.condicion_entrada,
         dd.disposicion,
         dd.notas,
         ca.entrega_id AS entrega_origen_id,
         e.creado_en AS entrega_origen_fecha
       FROM devolucion_detalle dd
       LEFT JOIN custodia_activo ca ON ca.id = dd.custodia_activo_id
       LEFT JOIN entrega e ON e.id = ca.entrega_id
       LEFT JOIN articulo a ON a.id = dd.articulo_id
       LEFT JOIN activo ac ON ac.id = dd.activo_id
       WHERE dd.devolucion_id = $1
       ORDER BY dd.id ASC`,
      [id]
    );

    const row = mapHeaderRow(headerResult.rows[0]);
    row.detalles = detailResult.rows;
    return resolveHeaderImages(row);
  }

  static async listEligibleAssets(filters = {}) {
    const values = [];
    const conditions = ["ca.estado = 'activa'", "ac.estado = 'asignado'"];

    if (!isUuid(filters?.trabajador_id)) {
      throw buildError('trabajador_id es requerido', 400, 'WORKER_ID_REQUIRED');
    }

    values.push(filters.trabajador_id);
    conditions.push(`ca.trabajador_id = $${values.length}`);

    if (filters?.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`ac.articulo_id = $${values.length}`);
    }

    if (filters?.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(ac.codigo ILIKE $${values.length} OR COALESCE(ac.nro_serie, '') ILIKE $${values.length})`);
    }

    const limitRaw = Number(filters?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 50;

    values.push(limit);

    const query = `
      SELECT
        ca.id AS custodia_activo_id,
        ca.trabajador_id,
        ca.desde_en,
        ac.id AS activo_id,
        ac.codigo,
        ac.nro_serie,
        ac.estado AS activo_estado,
        ac.articulo_id,
        ar.nombre AS articulo_nombre,
        COALESCE(ac.foto_url, ar.foto_url) AS foto_url,
        ac.proyecto_actual_id AS ubicacion_actual_id,
        pr.nombre AS ubicacion_actual_nombre
      FROM custodia_activo ca
      INNER JOIN activo ac ON ac.id = ca.activo_id
      INNER JOIN articulo ar ON ar.id = ac.articulo_id
      LEFT JOIN proyectos pr ON pr.id = ac.proyecto_actual_id
      WHERE ${conditions.join(' AND ')}
        AND NOT EXISTS (
          SELECT 1
          FROM devolucion_detalle dd
          INNER JOIN devolucion d ON d.id = dd.devolucion_id
          WHERE dd.custodia_activo_id = ca.id
            AND d.estado <> 'anulada'
        )
      ORDER BY ca.desde_en ASC
      LIMIT $${values.length}
    `;

    const { rows } = await db.query(query, values);
    return Promise.all(rows.map(async (row) => ({
      ...row,
      foto_url: await resolveImageUrl(row.foto_url),
    })));
  }

  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters?.estado) {
      values.push(String(filters.estado));
      conditions.push(`d.estado = $${values.length}`);
    }

    if (filters?.trabajador_id) {
      values.push(String(filters.trabajador_id));
      conditions.push(`d.trabajador_id = $${values.length}`);
    }

    let query = `SELECT
      d.id,
      d.trabajador_id,
      d.recibido_por_usuario_id,
      d.bodega_recepcion_id AS ubicacion_recepcion_id,
      d.estado,
      d.creado_en,
      d.confirmada_en,
      d.notas,
      d.evidencia_foto_url,
      p.nombres,
      p.apellidos,
      fd.firma_imagen_url,
      fd.firmado_en,
      COALESCE((
        SELECT COUNT(*)::int
        FROM devolucion_detalle dd_count
        WHERE dd_count.devolucion_id = d.id
      ), 0) AS cantidad_detalles
    FROM devolucion d
    INNER JOIN trabajador t ON t.id = d.trabajador_id
    INNER JOIN persona p ON p.id = t.persona_id
    LEFT JOIN firma_devolucion fd ON fd.devolucion_id = d.id`;

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY d.creado_en DESC LIMIT 200';

    const headerResult = await db.query(query, values);
    if (!headerResult.rows.length) {
      return [];
    }

    const ids = headerResult.rows.map((row) => row.id);
    const detailResult = await db.query(
      `SELECT
         dd.id,
         dd.devolucion_id,
         dd.custodia_activo_id,
         dd.articulo_id,
         a.nombre AS articulo_nombre,
         dd.activo_id,
         ac.codigo AS activo_codigo,
         ac.nro_serie AS activo_nro_serie,
         COALESCE(ac.foto_url, a.foto_url) AS foto_url,
         dd.cantidad,
         dd.condicion_entrada,
         dd.disposicion,
         dd.notas,
         ca.entrega_id AS entrega_origen_id,
         e.creado_en AS entrega_origen_fecha
       FROM devolucion_detalle dd
       LEFT JOIN custodia_activo ca ON ca.id = dd.custodia_activo_id
       LEFT JOIN entrega e ON e.id = ca.entrega_id
       LEFT JOIN articulo a ON a.id = dd.articulo_id
       LEFT JOIN activo ac ON ac.id = dd.activo_id
       WHERE dd.devolucion_id = ANY($1::uuid[])
       ORDER BY dd.devolucion_id ASC, dd.id ASC`,
      [ids]
    );

    const detailByDevolucion = new Map();
    for (const detail of detailResult.rows) {
      const list = detailByDevolucion.get(detail.devolucion_id) || [];
      list.push(detail);
      detailByDevolucion.set(detail.devolucion_id, list);
    }

    return Promise.all(headerResult.rows.map((row) => resolveHeaderImages({
      ...mapHeaderRow(row),
      detalles: detailByDevolucion.get(row.id) || [],
    })));
  }

  static async getById(id) {
    const client = await db.pool.connect();
    try {
      return await this._getByIdWithClient(client, id);
    } finally {
      client.release();
    }
  }

  static async create(payload, userId, imageFile = null) {
    let uploadedEvidenceUrl = null;
    if (imageFile) {
      uploadedEvidenceUrl = await uploadFile(imageFile);
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      await this._validateWorkerActive(client, payload.trabajador_id);
      await this._validateReceivingBodega(client, payload.ubicacion_recepcion_id);
      const normalizedDetails = await this._validateDraftDetails(
        client,
        payload.detalles,
        payload.trabajador_id
      );

      const devolucionResult = await client.query(
        `INSERT INTO devolucion (
           trabajador_id,
           recibido_por_usuario_id,
           bodega_recepcion_id,
           estado,
           notas,
           evidencia_foto_url
         )
         VALUES ($1, $2, $3, 'borrador', $4, $5)
         RETURNING id`,
        [
          payload.trabajador_id,
          userId,
          payload.ubicacion_recepcion_id,
          payload.notas || null,
          uploadedEvidenceUrl || payload.evidencia_foto_url || null,
        ]
      );

      const devolucionId = devolucionResult.rows[0].id;

      for (const detail of normalizedDetails) {
        await client.query(
          `INSERT INTO devolucion_detalle (
             devolucion_id,
             custodia_activo_id,
             articulo_id,
             activo_id,
             cantidad,
             condicion_entrada,
             disposicion,
             notas
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            devolucionId,
            detail.custodia_activo_id,
            detail.articulo_id,
            detail.activo_id,
            detail.cantidad,
            detail.condicion_entrada,
            detail.disposicion,
            detail.notas,
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
          trabajador_id: payload.trabajador_id,
          ubicacion_recepcion_id: payload.ubicacion_recepcion_id,
          cantidad_detalles: normalizedDetails.length,
        },
      });

      const data = await this._getByIdWithClient(client, devolucionId);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      if (uploadedEvidenceUrl) {
        await deleteFileByUrl(uploadedEvidenceUrl);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async signInDevice(devolucionId, payload, meta, actor) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const devolucionResult = await client.query(
        `SELECT *
         FROM devolucion
         WHERE id = $1
         FOR UPDATE`,
        [devolucionId]
      );

      if (!devolucionResult.rows.length) {
        throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
      }

      const devolucion = devolucionResult.rows[0];

      const actorRoles = new Set(Array.isArray(actor?.roles) ? actor.roles : [actor?.role]);
      const isPrivileged = actorRoles.has('admin') || actorRoles.has('supervisor');
      if (!isPrivileged) {
        throw buildError('No tienes permisos para firmar esta devolución', 403, 'RETURN_SIGN_FORBIDDEN');
      }

      if (devolucion.estado === 'confirmada') {
        throw buildError('La devolución ya fue confirmada', 409, 'RETURN_CONFIRMED');
      }

      if (devolucion.estado === 'anulada') {
        throw buildError('La devolución se encuentra anulada', 409, 'RETURN_CANCELLED');
      }

      const trabajadorId = payload?.trabajador_id || devolucion.trabajador_id;
      if (trabajadorId !== devolucion.trabajador_id) {
        throw buildError(
          'El trabajador de la firma no coincide con la devolución',
          403,
          'WORKER_MISMATCH'
        );
      }

      const signatureExists = await client.query(
        `SELECT id
         FROM firma_devolucion
         WHERE devolucion_id = $1
         LIMIT 1
         FOR UPDATE`,
        [devolucionId]
      );

      if (signatureExists.rows.length) {
        throw buildError('La devolución ya tiene una firma registrada', 409, 'RETURN_ALREADY_SIGNED');
      }

      const acceptanceText = normalizeAcceptanceText(
        payload?.texto_aceptacion,
        payload?.texto_aceptacion_detalle
      );

      const signatureImageUrl = String(payload?.firma_imagen_url || '').trim();
      if (!signatureImageUrl) {
        throw buildError('La firma es obligatoria', 400, 'SIGNATURE_IMAGE_REQUIRED');
      }

      const signatureResult = await client.query(
        `INSERT INTO firma_devolucion (
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
        RETURNING id`,
        [
          devolucionId,
          actor.id,
          acceptanceText,
          hashValue(acceptanceText),
          signatureImageUrl,
          meta?.ip || null,
          meta?.userAgent || null,
        ]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'firma_devolucion',
        entidadId: signatureResult.rows[0].id,
        accion: 'firmar',
        usuarioId: actor.id,
        diff: {
          devolucion_id: devolucionId,
          trabajador_id: trabajadorId,
          metodo: 'en_dispositivo',
        },
      });

      if (devolucion.estado === 'borrador') {
        await client.query(
          `UPDATE devolucion
           SET estado = 'pendiente_firma'
           WHERE id = $1`,
          [devolucionId]
        );
      }

      await client.query('COMMIT');
      return await this.getById(devolucionId);
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
        `SELECT *
         FROM devolucion
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!devolucionResult.rows.length) {
        throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
      }

      const devolucion = devolucionResult.rows[0];

      if (devolucion.estado === 'confirmada') {
        throw buildError('La devolución ya está confirmada', 409, 'RETURN_ALREADY_CONFIRMED');
      }

      if (devolucion.estado === 'anulada') {
        throw buildError('No se puede confirmar una devolución anulada', 409, 'RETURN_CANCELLED');
      }

      const signatureResult = await client.query(
        `SELECT id
         FROM firma_devolucion
         WHERE devolucion_id = $1
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

      if (!signatureResult.rows.length) {
        throw buildError(
          'La devolución debe estar firmada antes de confirmar',
          409,
          'SIGNATURE_REQUIRED'
        );
      }

      const detailResult = await client.query(
        `SELECT id, custodia_activo_id, activo_id, disposicion, notas
         FROM devolucion_detalle
         WHERE devolucion_id = $1
         ORDER BY id ASC
         FOR UPDATE`,
        [id]
      );

      if (!detailResult.rows.length) {
        throw buildError('La devolución no tiene detalles para confirmar', 409, 'RETURN_WITHOUT_DETAILS');
      }

      for (const detail of detailResult.rows) {
        if (!detail.custodia_activo_id || !detail.activo_id) {
          throw buildError(
            'No se puede confirmar una devolución sin activos serializados',
            409,
            'NON_SERIAL_CONFIRM_NOT_SUPPORTED'
          );
        }

        const custodyResult = await client.query(
          `SELECT id, activo_id, trabajador_id, proyecto_id, estado
           FROM custodia_activo
           WHERE id = $1
           FOR UPDATE`,
          [detail.custodia_activo_id]
        );

        if (!custodyResult.rows.length) {
          throw buildError('Custodia no encontrada al confirmar devolución', 404, 'CUSTODY_NOT_FOUND');
        }

        const custody = custodyResult.rows[0];
        if (custody.estado !== 'activa') {
          throw buildError('La custodia no está activa', 409, 'CUSTODY_NOT_ACTIVE');
        }

        if (custody.trabajador_id !== devolucion.trabajador_id) {
          throw buildError(
            'La custodia no corresponde al trabajador de la devolución',
            409,
            'CUSTODY_WORKER_MISMATCH'
          );
        }

        const assetResult = await client.query(
          `SELECT id, estado, proyecto_actual_id
           FROM activo
           WHERE id = $1
           FOR UPDATE`,
          [detail.activo_id]
        );

        if (!assetResult.rows.length) {
          throw buildError('Activo no encontrado al confirmar devolución', 404, 'ASSET_NOT_FOUND');
        }

        const asset = assetResult.rows[0];
        if (asset.estado !== 'asignado') {
          throw buildError(
            `El activo ${asset.id} no está en estado asignado`,
            409,
            'ASSET_NOT_ASSIGNED'
          );
        }

        if (asset.proyecto_actual_id !== custody.proyecto_id) {
          throw buildError(
            `El activo ${asset.id} no está en el proyecto esperado`,
            409,
            'ASSET_WRONG_PROJECT'
          );
        }

        const disposicion = detail.disposicion;
        const nextCustodyState = CUSTODIA_STATE_BY_DISPOSICION[disposicion];
        const nextAssetState = ACTIVO_STATE_BY_DISPOSICION[disposicion];
        const movementType = MOVIMIENTO_TYPE_BY_DISPOSICION[disposicion];
        const returnsToStock = disposicion === 'devuelto' || disposicion === 'mantencion';

        await client.query(
          `UPDATE custodia_activo
           SET estado = $1,
               hasta_en = NOW()
           WHERE id = $2`,
          [nextCustodyState, custody.id]
        );

        if (returnsToStock) {
          await client.query(
            `UPDATE activo
             SET estado = $1,
                 bodega_actual_id = $2,
                 proyecto_actual_id = NULL
             WHERE id = $3`,
            [nextAssetState, devolucion.bodega_recepcion_id, asset.id]
          );
        } else {
          await client.query(
            `UPDATE activo
             SET estado = $1,
                 bodega_actual_id = NULL,
                 proyecto_actual_id = NULL
             WHERE id = $2`,
            [nextAssetState, asset.id]
          );
        }

        await client.query(
          `INSERT INTO movimiento_activo (
             activo_id,
             tipo,
             proyecto_origen_id,
             bodega_destino_id,
             responsable_usuario_id,
             devolucion_id,
             notas
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            asset.id,
            movementType,
            custody.proyecto_id,
            returnsToStock ? devolucion.bodega_recepcion_id : null,
            userId,
            devolucion.id,
            detail.notas || devolucion.notas || null,
          ]
        );
      }

      await client.query(
        `UPDATE devolucion
         SET estado = 'confirmada',
             confirmada_en = NOW()
         WHERE id = $1`,
        [id]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'devolucion',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado: 'confirmada',
          confirmado_en: new Date().toISOString(),
        },
      });

      const data = await this._getByIdWithClient(client, id);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async anular(id, payload, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const devolucionResult = await client.query(
        `SELECT id, estado
         FROM devolucion
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!devolucionResult.rows.length) {
        throw buildError('Devolución no encontrada', 404, 'RETURN_NOT_FOUND');
      }

      const devolucion = devolucionResult.rows[0];

      if (devolucion.estado === 'confirmada') {
        throw buildError(
          'No se puede anular una devolución confirmada',
          409,
          'RETURN_ALREADY_CONFIRMED'
        );
      }

      if (devolucion.estado === 'anulada') {
        return await this._getByIdWithClient(client, id);
      }

      const motivo = String(payload?.motivo || '').trim();
      if (motivo.length < 5) {
        throw buildError(
          'El motivo de anulación debe tener al menos 5 caracteres',
          400,
          'CANCEL_REASON_TOO_SHORT'
        );
      }

      await client.query(
        `UPDATE devolucion
         SET estado = 'anulada',
             motivo_anulacion = $2
         WHERE id = $1`,
        [id, motivo]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'devolucion',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado: 'anulada',
          motivo_anulacion: motivo,
        },
      });

      const data = await this._getByIdWithClient(client, id);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DevolucionesService;
