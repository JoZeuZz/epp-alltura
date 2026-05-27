const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { uploadFile, deleteFileByUrl, resolveHeaderImages } = require('../lib/googleCloud');

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const { buildError } = require('../lib/errors');

const isUuid = (value) => UUID_REGEX.test(String(value || '').trim());

const mapHeaderRow = (row) => ({
  id: row.id,
  creado_por_usuario_id: row.creado_por_usuario_id,
  trabajador_id: row.trabajador_id,
  nombres: row.nombres,
  apellidos: row.apellidos,
  rut: row.rut,
  ubicacion_origen_id: row.ubicacion_origen_id,
  ubicacion_destino_id: row.ubicacion_destino_id,
  tipo: row.tipo,
  estado: row.estado,
  nota_destino: row.nota_destino,
  motivo_anulacion: row.motivo_anulacion,
  creado_en: row.creado_en,
  confirmada_en: row.confirmada_en,
  fecha_devolucion_esperada: row.fecha_devolucion_esperada,
  evidencia_foto_url: row.evidencia_foto_url || null,
  firmado_en: row.firmado_en,
  firma_imagen_url: row.firma_imagen_url,
  cantidad_items: Number(row.cantidad_items || 0),
  creador_nombres: row.creador_nombres || null,
  creador_apellidos: row.creador_apellidos || null,
});

class EntregasService {
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
        'El trabajador debe estar activo para recibir una entrega',
        400,
        'WORKER_NOT_ACTIVE'
      );
    }
  }

  static async _validateRoute(client, ubicacionOrigenId, ubicacionDestinoId) {
    if (!isUuid(ubicacionOrigenId) || !isUuid(ubicacionDestinoId)) {
      throw buildError('Ubicación de origen o destino inválida', 400, 'LOCATION_INVALID');
    }

    if (ubicacionOrigenId === ubicacionDestinoId) {
      throw buildError(
        'La ubicación de origen y destino no puede ser la misma',
        400,
        'LOCATION_SAME'
      );
    }

    const [bodegaResult, proyectoResult] = await Promise.all([
      client.query('SELECT id, estado FROM bodegas WHERE id = $1 LIMIT 1', [ubicacionOrigenId]),
      client.query('SELECT id, estado FROM proyectos WHERE id = $1 LIMIT 1', [ubicacionDestinoId]),
    ]);

    if (!bodegaResult.rows.length) {
      throw buildError(
        'La ubicación de origen debe ser una bodega válida',
        400,
        'ORIGIN_MUST_BE_BODEGA'
      );
    }

    if (!proyectoResult.rows.length) {
      throw buildError(
        'La ubicación de destino debe ser un proyecto válido',
        400,
        'DESTINATION_MUST_BE_PROJECT'
      );
    }

    if (bodegaResult.rows[0].estado !== 'activo') {
      throw buildError('La bodega de origen debe estar activa', 400, 'ORIGIN_BODEGA_NOT_ACTIVE');
    }

    if (proyectoResult.rows[0].estado === 'inactivo') {
      throw buildError('El proyecto de destino no puede estar inactivo', 400, 'DESTINATION_PROJECT_INACTIVE');
    }
  }

  static async _validateDraftDetails(client, detalles, ubicacionOrigenId) {
    if (!Array.isArray(detalles) || !detalles.length) {
      throw buildError('Debe incluir al menos un detalle de entrega', 400, 'DETAILS_REQUIRED');
    }

    const normalized = [];
    const selectedArticuloIds = new Set();

    for (const detail of detalles) {
      const articuloId = String(detail?.articulo_id || '').trim();
      if (!isUuid(articuloId)) {
        throw buildError('Artículo inválido en detalle de entrega', 400, 'DETAIL_ARTICLE_INVALID');
      }

      if (selectedArticuloIds.has(articuloId)) {
        throw buildError(
          'No puedes repetir el mismo artículo en más de un ítem',
          409,
          'DUPLICATED_ARTICULO'
        );
      }
      selectedArticuloIds.add(articuloId);

      const assetResult = await client.query(
        `SELECT id, estado, bodega_actual_id
         FROM articulo
         WHERE id = $1
         FOR UPDATE`,
        [articuloId]
      );

      if (!assetResult.rows.length) {
        throw buildError('Artículo no encontrado en detalle de entrega', 404, 'ASSET_NOT_FOUND');
      }

      const asset = assetResult.rows[0];

      if (asset.estado !== 'en_stock') {
        throw buildError(
          `El artículo ${articuloId} no está disponible para entregar`,
          409,
          'ASSET_NOT_AVAILABLE'
        );
      }

      if (asset.bodega_actual_id !== ubicacionOrigenId) {
        throw buildError(
          `El artículo ${articuloId} no se encuentra en la bodega de origen`,
          409,
          'ASSET_WRONG_LOCATION'
        );
      }

      const custodyResult = await client.query(
        `SELECT id
         FROM custodia_activo
         WHERE articulo_id = $1
           AND estado = 'activa'
         LIMIT 1
         FOR UPDATE`,
        [articuloId]
      );

      if (custodyResult.rows.length) {
        throw buildError(
          `El artículo ${articuloId} ya tiene custodia activa`,
          409,
          'ACTIVE_CUSTODY_EXISTS'
        );
      }

      normalized.push({
        articulo_id: articuloId,
        condicion_salida: detail?.condicion_salida || 'ok',
        notas: detail?.notas || null,
      });
    }

    return normalized;
  }


  static async _getByIdWithClient(client, id) {
    const headerResult = await client.query(
      `SELECT
         e.id,
         e.creado_por_usuario_id,
         e.trabajador_id,
         p.nombres,
         p.apellidos,
         p.rut,
         p_creator.nombres AS creador_nombres,
         p_creator.apellidos AS creador_apellidos,
         e.bodega_origen_id AS ubicacion_origen_id,
         e.proyecto_destino_id AS ubicacion_destino_id,
         e.tipo,
         e.estado,
         e.nota_destino,
         e.motivo_anulacion,
         e.creado_en,
         e.confirmada_en,
         e.fecha_devolucion_esperada,
         e.evidencia_foto_url,
         fe.firmado_en,
         fe.firma_imagen_url,
         COALESCE((
           SELECT COUNT(*)::int
           FROM entrega_detalle ed_count
           WHERE ed_count.entrega_id = e.id
         ), 0) AS cantidad_items
       FROM entrega e
       INNER JOIN trabajador t ON t.id = e.trabajador_id
       INNER JOIN persona p ON p.id = t.persona_id
       LEFT JOIN firma_entrega fe ON fe.entrega_id = e.id
       LEFT JOIN usuario uc ON uc.id = e.creado_por_usuario_id
       LEFT JOIN persona p_creator ON p_creator.id = uc.persona_id
       WHERE e.id = $1
       LIMIT 1`,
      [id]
    );

    if (!headerResult.rows.length) {
      throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
    }

    const detallesResult = await client.query(
      `SELECT
         ed.id,
         ed.entrega_id,
         ed.articulo_id,
         a.nombre AS articulo_nombre,
         a.tipo AS articulo_tipo,
         a.nro_serie,
         a.codigo,
         a.valor,
         a.foto_url,
         a.estado AS articulo_estado,
         ed.condicion_salida,
         ed.notas
       FROM entrega_detalle ed
       JOIN articulo a ON a.id = ed.articulo_id
       WHERE ed.entrega_id = $1
       ORDER BY ed.id ASC`,
      [id]
    );

    const row = mapHeaderRow(headerResult.rows[0]);
    row.detalles = detallesResult.rows;
    return resolveHeaderImages(row);
  }

  static async create(payload, userId, imageFile = null) {
    let uploadedEvidenceUrl = null;
    if (imageFile) {
      uploadedEvidenceUrl = await uploadFile(imageFile, { folder: 'entregas/evidencias' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      await this._validateWorkerActive(client, payload.trabajador_id);
      await this._validateRoute(client, payload.ubicacion_origen_id, payload.ubicacion_destino_id);
      const normalizedDetails = await this._validateDraftDetails(
        client,
        payload.detalles,
        payload.ubicacion_origen_id
      );

      const entregaResult = await client.query(
        `INSERT INTO entrega (
           creado_por_usuario_id,
           trabajador_id,
           bodega_origen_id,
           proyecto_destino_id,
           tipo,
           estado,
           nota_destino,
           fecha_devolucion_esperada,
           evidencia_foto_url
         )
         VALUES ($1, $2, $3, $4, 'entrega', 'borrador', $5, $6, $7)
         RETURNING id`,
        [
          userId,
          payload.trabajador_id,
          payload.ubicacion_origen_id,
          payload.ubicacion_destino_id,
          payload.nota_destino || null,
          payload.fecha_devolucion_esperada || null,
          uploadedEvidenceUrl || payload.evidencia_foto_url || null,
        ]
      );

      const entregaId = entregaResult.rows[0].id;

      for (const detail of normalizedDetails) {
        await client.query(
          `INSERT INTO entrega_detalle (entrega_id, articulo_id, condicion_salida, notas)
           VALUES ($1, $2, $3, $4)`,
          [entregaId, detail.articulo_id, detail.condicion_salida, detail.notas || null]
        );
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: entregaId,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          trabajador_id: payload.trabajador_id,
          cantidad_items: normalizedDetails.length,
          origen: payload.ubicacion_origen_id,
          destino: payload.ubicacion_destino_id,
        },
      });

      const data = await this._getByIdWithClient(client, entregaId);
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

  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters?.estado) {
      values.push(String(filters.estado));
      conditions.push(`e.estado = $${values.length}`);
    }

    if (filters?.trabajador_id) {
      values.push(String(filters.trabajador_id));
      conditions.push(`e.trabajador_id = $${values.length}`);
    }

    let query = `SELECT
      e.id,
      e.creado_por_usuario_id,
      e.trabajador_id,
      p.nombres,
      p.apellidos,
      p.rut,
      p_creator.nombres AS creador_nombres,
      p_creator.apellidos AS creador_apellidos,
      e.bodega_origen_id AS ubicacion_origen_id,
      e.proyecto_destino_id AS ubicacion_destino_id,
      e.tipo,
      e.estado,
      e.nota_destino,
      e.motivo_anulacion,
      e.creado_en,
      e.confirmada_en,
      e.fecha_devolucion_esperada,
      e.evidencia_foto_url,
      fe.firmado_en,
      fe.firma_imagen_url,
      COALESCE((
        SELECT COUNT(*)::int
        FROM entrega_detalle ed_count
        WHERE ed_count.entrega_id = e.id
      ), 0) AS cantidad_items
    FROM entrega e
    INNER JOIN trabajador t ON t.id = e.trabajador_id
    INNER JOIN persona p ON p.id = t.persona_id
    LEFT JOIN firma_entrega fe ON fe.entrega_id = e.id
    LEFT JOIN usuario uc ON uc.id = e.creado_por_usuario_id
    LEFT JOIN persona p_creator ON p_creator.id = uc.persona_id`;

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY e.creado_en DESC LIMIT 200';

    const headerResult = await db.query(query, values);
    if (!headerResult.rows.length) {
      return [];
    }

    const ids = headerResult.rows.map((row) => row.id);
    const detailResult = await db.query(
      `SELECT
         ed.id,
         ed.entrega_id,
         ed.articulo_id,
         a.nombre AS articulo_nombre,
         a.tipo AS articulo_tipo,
         a.nro_serie,
         a.codigo,
         a.valor,
         a.foto_url,
         a.estado AS articulo_estado,
         ed.condicion_salida,
         ed.notas
       FROM entrega_detalle ed
       JOIN articulo a ON a.id = ed.articulo_id
       WHERE ed.entrega_id = ANY($1::uuid[])
       ORDER BY ed.entrega_id ASC, ed.id ASC`,
      [ids]
    );

    const detailByEntrega = new Map();
    for (const detail of detailResult.rows) {
      const list = detailByEntrega.get(detail.entrega_id) || [];
      list.push(detail);
      detailByEntrega.set(detail.entrega_id, list);
    }

    return Promise.all(headerResult.rows.map((row) => resolveHeaderImages({
      ...mapHeaderRow(row),
      detalles: detailByEntrega.get(row.id) || [],
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

  static async confirm(id, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `SELECT *
         FROM entrega
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
      }

      const entrega = entregaResult.rows[0];
      if (entrega.estado === 'confirmada') {
        throw buildError('La entrega ya está confirmada', 409, 'DELIVERY_ALREADY_CONFIRMED');
      }

      if (entrega.estado === 'anulada') {
        throw buildError('No se puede confirmar una entrega anulada', 409, 'DELIVERY_CANCELLED');
      }

      const signatureResult = await client.query(
        `SELECT id
         FROM firma_entrega
         WHERE entrega_id = $1
         LIMIT 1
         FOR UPDATE`,
        [id]
      );

      if (!signatureResult.rows.length) {
        throw buildError(
          'La entrega debe estar firmada antes de confirmar',
          409,
          'SIGNATURE_REQUIRED'
        );
      }

      const detailResult = await client.query(
        `SELECT id, articulo_id, notas
         FROM entrega_detalle
         WHERE entrega_id = $1
         ORDER BY id ASC
         FOR UPDATE`,
        [id]
      );

      if (!detailResult.rows.length) {
        throw buildError('La entrega no tiene detalles para confirmar', 409, 'DELIVERY_WITHOUT_DETAILS');
      }

      for (const detail of detailResult.rows) {
        const assetResult = await client.query(
          `SELECT id, estado, bodega_actual_id
           FROM articulo
           WHERE id = $1
           FOR UPDATE`,
          [detail.articulo_id]
        );

        if (!assetResult.rows.length) {
          throw buildError('Artículo no encontrado al confirmar la entrega', 404, 'ASSET_NOT_FOUND');
        }

        const asset = assetResult.rows[0];

        if (asset.estado !== 'en_stock') {
          throw buildError(
            `El artículo ${asset.id} ya no está disponible para confirmar`,
            409,
            'ASSET_NOT_AVAILABLE'
          );
        }

        if (asset.bodega_actual_id !== entrega.bodega_origen_id) {
          throw buildError(
            `El artículo ${asset.id} ya no se encuentra en la bodega de origen`,
            409,
            'ASSET_WRONG_LOCATION'
          );
        }

        const custodyResult = await client.query(
          `SELECT id
           FROM custodia_activo
           WHERE articulo_id = $1
             AND estado = 'activa'
           LIMIT 1
           FOR UPDATE`,
          [asset.id]
        );

        if (custodyResult.rows.length) {
          throw buildError(
            `El artículo ${asset.id} ya tiene custodia activa`,
            409,
            'ACTIVE_CUSTODY_EXISTS'
          );
        }

        await client.query(
          `UPDATE articulo
           SET estado = 'asignado',
               bodega_actual_id = NULL,
               proyecto_actual_id = $1
           WHERE id = $2`,
          [entrega.proyecto_destino_id, asset.id]
        );

        await client.query(
          `INSERT INTO custodia_activo (
             articulo_id,
             trabajador_id,
             proyecto_id,
             entrega_id,
             estado,
             fecha_devolucion_esperada
           ) VALUES ($1, $2, $3, $4, 'activa', $5)`,
          [
            asset.id,
            entrega.trabajador_id,
            entrega.proyecto_destino_id,
            entrega.id,
            entrega.fecha_devolucion_esperada || null,
          ]
        );

        await client.query(
          `INSERT INTO movimiento_activo (
             articulo_id,
             tipo,
             bodega_origen_id,
             proyecto_destino_id,
             responsable_usuario_id,
             entrega_id,
             notas
           ) VALUES ($1, 'entrega', $2, $3, $4, $5, $6)`,
          [
            asset.id,
            entrega.bodega_origen_id,
            entrega.proyecto_destino_id,
            userId,
            entrega.id,
            detail.notas || entrega.nota_destino || null,
          ]
        );
      }

      await client.query(
        `UPDATE entrega
         SET estado = 'confirmada',
             confirmada_en = NOW()
         WHERE id = $1`,
        [id]
      );
      // afterSignatureBeforeConfirm extension point (frontend):
      // photo evidence or other async steps can be injected in frontend
      // before this service call is triggered. Backend contract unchanged.

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
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

      const entregaResult = await client.query(
        `SELECT id, estado
         FROM entrega
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404, 'DELIVERY_NOT_FOUND');
      }

      const entrega = entregaResult.rows[0];

      if (entrega.estado === 'confirmada') {
        throw buildError(
          'No se puede anular una entrega confirmada',
          409,
          'DELIVERY_ALREADY_CONFIRMED'
        );
      }

      if (entrega.estado === 'anulada') {
        return await this._getByIdWithClient(client, id);
      }

      await client.query(
        `UPDATE entrega
         SET estado = 'anulada',
             motivo_anulacion = $2
         WHERE id = $1`,
        [id, payload?.motivo || null]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado: 'anulada',
          motivo_anulacion: payload?.motivo || null,
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

module.exports = EntregasService;
