const db = require('../db');
const crypto = require('crypto');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { buildEntregaActaPdfBuffer } = require('../lib/actaPdf');
const { logger } = require('../lib/logger');
const { uploadDocument, deleteFileByUrl, resolveImageUrl } = require('../lib/googleCloud');

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const appendAdminUndoNote = (note, motivo) => {
  const suffix = `[reversa_admin:${motivo}]`;
  if (!note) return suffix;
  return `${note} ${suffix}`;
};

const ROUTE_RULES = {
  entrega: { origen: 'bodega', destino: 'planta' },
};

const resolveEntregaTipo = () => 'entrega';

const normalizeOptionalText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const computeSha256 = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex');

class EntregasService {
  static normalizeCreateDetails(rawDetalles) {
    const normalized = [];
    const seenAssetIds = new Set();

    for (const rawDetalle of rawDetalles) {
      if (rawDetalle.lote_id) {
        throw buildError('No debe enviar lote_id en el nuevo contrato de entregas', 400);
      }

      if (rawDetalle.activo_id) {
        throw buildError(
          'Payload legacy no soportado: use activo_ids para artículos serializados',
          400
        );
      }

      const activoIds = Array.isArray(rawDetalle.activo_ids)
        ? rawDetalle.activo_ids.filter(Boolean)
        : [];

      if (activoIds.length > 0) {
        if (rawDetalle.cantidad !== undefined && rawDetalle.cantidad !== null) {
          throw buildError(
            'No debe enviar cantidad junto con activo_ids para artículos serializados',
            400
          );
        }

        for (const activoId of activoIds) {
          if (seenAssetIds.has(activoId)) {
            throw buildError(`Activo duplicado en payload: ${activoId}`, 400);
          }
          seenAssetIds.add(activoId);

          normalized.push({
            articulo_id: rawDetalle.articulo_id,
            activo_id: activoId,
            lote_id: null,
            cantidad: 1,
            condicion_salida: rawDetalle.condicion_salida,
            notas: rawDetalle.notas,
          });
        }

        continue;
      }

      if (rawDetalle.cantidad === undefined || rawDetalle.cantidad === null) {
        throw buildError(
          `Debe enviar cantidad para artículo ${rawDetalle.articulo_id} cuando no use activo_ids`,
          400
        );
      }

      normalized.push({
        articulo_id: rawDetalle.articulo_id,
        activo_id: null,
        lote_id: null,
        cantidad: rawDetalle.cantidad,
        condicion_salida: rawDetalle.condicion_salida,
        notas: rawDetalle.notas,
      });
    }

    return normalized;
  }

  static async validateWorkerActive(client, trabajadorId) {
    const { rows } = await client.query(
      `
      SELECT t.id, t.estado, p.estado AS persona_estado
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
      WHERE t.id = $1
      LIMIT 1
      `,
      [trabajadorId]
    );

    if (!rows.length) {
      throw buildError('Trabajador no encontrado', 400);
    }

    const worker = rows[0];
    if (worker.estado !== 'activo' || worker.persona_estado !== 'activo') {
      throw buildError('El trabajador debe estar activo para recibir movimientos', 400);
    }
  }

  static async validateTemplateItemsAgainstArticles(client, rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw buildError('La plantilla debe contener al menos un ítem', 400);
    }

    const articleIds = Array.from(new Set(rawItems.map((item) => item.articulo_id).filter(Boolean)));
    const articleResult = await client.query(
      `
      SELECT id, nombre, tracking_mode, estado
      FROM articulo
      WHERE id = ANY($1::uuid[])
      `,
      [articleIds]
    );

    const articleMap = new Map(articleResult.rows.map((row) => [row.id, row]));
    const seenArticles = new Set();
    const normalizedItems = [];

    for (const item of rawItems) {
      const article = articleMap.get(item.articulo_id);
      if (!article) {
        throw buildError(`Artículo ${item.articulo_id} no encontrado`, 400);
      }

      if (article.estado !== 'activo') {
        throw buildError(`El artículo ${article.nombre} debe estar activo`, 400);
      }

      if (seenArticles.has(item.articulo_id)) {
        throw buildError(`La plantilla repite el artículo ${article.nombre}`, 400);
      }
      seenArticles.add(item.articulo_id);

      const qty = Number(item.cantidad);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw buildError(`Cantidad inválida para artículo ${article.nombre}`, 400);
      }

      const requiresSerial =
        typeof item.requiere_serial === 'boolean'
          ? item.requiere_serial
          : article.tracking_mode === 'serial';

      if (article.tracking_mode === 'serial' && !requiresSerial) {
        throw buildError(`El artículo ${article.nombre} es de control serial y requiere_serial debe ser true`, 400);
      }

      if (article.tracking_mode !== 'serial' && requiresSerial) {
        throw buildError(`El artículo ${article.nombre} se controla por cantidad y requiere_serial debe ser false`, 400);
      }

      normalizedItems.push({
        articulo_id: item.articulo_id,
        cantidad: qty,
        requiere_serial: requiresSerial,
        notas_default: normalizeOptionalText(item.notas_default) || null,
      });
    }

    return normalizedItems;
  }

  static async listTemplates(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`t.estado = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${String(filters.search).trim().toLowerCase()}%`);
      conditions.push(`LOWER(t.nombre) LIKE $${values.length}`);
    }

    let query = `
      SELECT
        t.id,
        t.nombre,
        t.descripcion,
        t.estado,
        t.scope_cargo,
        t.scope_proyecto,
        t.creado_por_usuario_id,
        t.creado_en,
        t.actualizado_en,
        creator.email_login AS creado_por_email,
        COALESCE(item_stats.cantidad_items, 0)::int AS cantidad_items
      FROM entrega_template t
      LEFT JOIN usuario creator ON creator.id = t.creado_por_usuario_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cantidad_items
        FROM entrega_template_item i
        WHERE i.template_id = t.id
      ) item_stats ON true
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY t.creado_en DESC';

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getTemplateById(templateId, options = {}) {
    const includeInactive = options.includeInactive !== false;

    const templateResult = await db.query(
      `
      SELECT
        t.id,
        t.nombre,
        t.descripcion,
        t.estado,
        t.scope_cargo,
        t.scope_proyecto,
        t.creado_por_usuario_id,
        t.creado_en,
        t.actualizado_en,
        creator.email_login AS creado_por_email
      FROM entrega_template t
      LEFT JOIN usuario creator ON creator.id = t.creado_por_usuario_id
      WHERE t.id = $1
        AND ($2::boolean OR t.estado = 'activo')
      LIMIT 1
      `,
      [templateId, includeInactive]
    );

    if (!templateResult.rows.length) {
      throw buildError('Plantilla de entrega no encontrada', 404);
    }

    const itemsResult = await db.query(
      `
      SELECT
        i.id,
        i.template_id,
        i.articulo_id,
        i.cantidad,
        i.requiere_serial,
        i.notas_default,
        i.orden,
        a.nombre AS articulo_nombre
      FROM entrega_template_item i
      INNER JOIN articulo a ON a.id = i.articulo_id
      WHERE i.template_id = $1
      ORDER BY i.orden ASC, i.creado_en ASC, i.id ASC
      `,
      [templateId]
    );

    return {
      ...templateResult.rows[0],
      items: itemsResult.rows,
    };
  }

  static async createTemplate(payload, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedItems = await this.validateTemplateItemsAgainstArticles(client, payload.items);

      const templateResult = await client.query(
        `
        INSERT INTO entrega_template (
          nombre,
          descripcion,
          estado,
          scope_cargo,
          scope_proyecto,
          creado_por_usuario_id
        )
        VALUES ($1, $2, COALESCE($3, 'activo'), $4, $5, $6)
        RETURNING id
        `,
        [
          String(payload.nombre || '').trim(),
          normalizeOptionalText(payload.descripcion) || null,
          payload.estado || 'activo',
          normalizeOptionalText(payload.scope_cargo) || null,
          normalizeOptionalText(payload.scope_proyecto) || null,
          userId,
        ]
      );

      const templateId = templateResult.rows[0].id;

      for (let index = 0; index < normalizedItems.length; index += 1) {
        const item = normalizedItems[index];
        await client.query(
          `
          INSERT INTO entrega_template_item (
            template_id,
            articulo_id,
            cantidad,
            requiere_serial,
            notas_default,
            orden
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            templateId,
            item.articulo_id,
            item.cantidad,
            item.requiere_serial,
            item.notas_default || null,
            index,
          ]
        );
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega_template',
        entidadId: templateId,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          nombre: payload.nombre,
          estado: payload.estado || 'activo',
          items_count: normalizedItems.length,
        },
      });

      await client.query('COMMIT');
      return this.getTemplateById(templateId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateTemplate(templateId, payload, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        `
        SELECT id, nombre, estado
        FROM entrega_template
        WHERE id = $1
        FOR UPDATE
        `,
        [templateId]
      );

      if (!existingResult.rows.length) {
        throw buildError('Plantilla de entrega no encontrada', 404);
      }

      const updates = [];
      const values = [templateId];

      if (Object.prototype.hasOwnProperty.call(payload, 'nombre')) {
        values.push(String(payload.nombre || '').trim());
        updates.push(`nombre = $${values.length}`);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'descripcion')) {
        values.push(normalizeOptionalText(payload.descripcion));
        updates.push(`descripcion = $${values.length}`);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'estado')) {
        values.push(payload.estado);
        updates.push(`estado = $${values.length}`);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'scope_cargo')) {
        values.push(normalizeOptionalText(payload.scope_cargo));
        updates.push(`scope_cargo = $${values.length}`);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'scope_proyecto')) {
        values.push(normalizeOptionalText(payload.scope_proyecto));
        updates.push(`scope_proyecto = $${values.length}`);
      }

      if (updates.length > 0) {
        await client.query(
          `
          UPDATE entrega_template
          SET ${updates.join(', ')}
          WHERE id = $1
          `,
          values
        );
      }

      let normalizedItems = null;
      if (Array.isArray(payload.items)) {
        normalizedItems = await this.validateTemplateItemsAgainstArticles(client, payload.items);

        await client.query(
          `
          DELETE FROM entrega_template_item
          WHERE template_id = $1
          `,
          [templateId]
        );

        for (let index = 0; index < normalizedItems.length; index += 1) {
          const item = normalizedItems[index];
          await client.query(
            `
            INSERT INTO entrega_template_item (
              template_id,
              articulo_id,
              cantidad,
              requiere_serial,
              notas_default,
              orden
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              templateId,
              item.articulo_id,
              item.cantidad,
              item.requiere_serial,
              item.notas_default || null,
              index,
            ]
          );
        }
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega_template',
        entidadId: templateId,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          campos_actualizados: updates.length,
          items_actualizados: Array.isArray(payload.items),
          items_count: normalizedItems ? normalizedItems.length : undefined,
        },
      });

      await client.query('COMMIT');
      return this.getTemplateById(templateId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deactivateTemplate(templateId, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const templateResult = await client.query(
        `
        SELECT id, estado
        FROM entrega_template
        WHERE id = $1
        FOR UPDATE
        `,
        [templateId]
      );

      if (!templateResult.rows.length) {
        throw buildError('Plantilla de entrega no encontrada', 404);
      }

      await client.query(
        `
        UPDATE entrega_template
        SET estado = 'inactivo'
        WHERE id = $1
        `,
        [templateId]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega_template',
        entidadId: templateId,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_nuevo: 'inactivo',
        },
      });

      await client.query('COMMIT');
      return this.getTemplateById(templateId, { includeInactive: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async previewTemplate(templateId, filters = {}) {
    const template = await this.getTemplateById(templateId, { includeInactive: true });
    const ubicacionOrigenId = filters.ubicacion_origen_id || null;

    if (!ubicacionOrigenId) {
      return template;
    }

    const enrichedItems = [];
    for (const item of template.items) {
      if (item.requiere_serial) {
        const availableAssetsResult = await db.query(
          `
          SELECT COUNT(*)::int AS disponibles
          FROM activo
          WHERE articulo_id = $1
            AND estado = 'en_stock'
            AND ubicacion_actual_id = $2
          `,
          [item.articulo_id, ubicacionOrigenId]
        );

        enrichedItems.push({
          ...item,
          disponibilidad_origen: availableAssetsResult.rows[0]?.disponibles || 0,
        });
        continue;
      }

      const stockResult = await db.query(
        `
        SELECT COALESCE(SUM(cantidad_disponible), 0)::int AS disponibles
        FROM stock
        WHERE articulo_id = $1
          AND ubicacion_id = $2
        `,
        [item.articulo_id, ubicacionOrigenId]
      );

      enrichedItems.push({
        ...item,
        disponibilidad_origen: stockResult.rows[0]?.disponibles || 0,
      });
    }

    return {
      ...template,
      items: enrichedItems,
      ubicacion_origen_id: ubicacionOrigenId,
    };
  }

  static resolveTemplateDetails(templateItems, rawOverrides = [], options = {}) {
    const requireSerialAssignments = options.requireSerialAssignments !== false;

    const overrides = Array.isArray(rawOverrides) ? rawOverrides : [];
    const overrideByArticle = new Map();

    for (const override of overrides) {
      const articleId = override.articulo_id;
      if (!articleId) {
        throw buildError('Cada override debe incluir articulo_id', 400);
      }

      if (overrideByArticle.has(articleId)) {
        throw buildError(`Override duplicado para artículo ${articleId}`, 400);
      }

      overrideByArticle.set(articleId, override);
    }

    const templateArticleIds = new Set(templateItems.map((item) => item.articulo_id));
    for (const articleId of overrideByArticle.keys()) {
      if (!templateArticleIds.has(articleId)) {
        throw buildError(
          `El override del artículo ${articleId} no pertenece a la plantilla seleccionada`,
          400
        );
      }
    }

    const details = [];
    for (const item of templateItems) {
      const override = overrideByArticle.get(item.articulo_id) || {};
      const qty = Number(override.cantidad ?? item.cantidad);

      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw buildError(`Cantidad inválida para artículo ${item.articulo_nombre || item.articulo_id}`, 400);
      }

      const notas =
        normalizeOptionalText(
          Object.prototype.hasOwnProperty.call(override, 'notas')
            ? override.notas
            : item.notas_default
        ) || null;

      const condicionSalida = override.condicion_salida || 'ok';

      if (item.requiere_serial) {
        const activoIds = Array.isArray(override.activo_ids)
          ? override.activo_ids.filter(Boolean)
          : [];

        if (requireSerialAssignments && activoIds.length === 0) {
          throw buildError(
            `El artículo ${item.articulo_nombre || item.articulo_id} requiere activo_ids para crear la entrega`,
            400
          );
        }

        if (new Set(activoIds).size !== activoIds.length) {
          throw buildError(
            `El artículo ${item.articulo_nombre || item.articulo_id} tiene activo_ids duplicados`,
            400
          );
        }

        if (activoIds.length > 0) {
          details.push({
            articulo_id: item.articulo_id,
            activo_ids: activoIds,
            condicion_salida: condicionSalida,
            notas,
          });
        }

        continue;
      }

      details.push({
        articulo_id: item.articulo_id,
        cantidad: qty,
        condicion_salida: condicionSalida,
        notas,
      });
    }

    return details;
  }

  static async createFromTemplate(templateId, payload, userId) {
    const template = await this.getTemplateById(templateId, { includeInactive: false });

    const detalles = this.resolveTemplateDetails(template.items, payload.detalles_overrides || [], {
      requireSerialAssignments: true,
    });

    const createPayload = {
      trabajador_id: payload.trabajador_id,
      ubicacion_origen_id: payload.ubicacion_origen_id,
      ubicacion_destino_id: payload.ubicacion_destino_id,
      tipo: payload.tipo,
      nota_destino: payload.nota_destino || null,
      fecha_devolucion_esperada: payload.fecha_devolucion_esperada || null,
      detalles,
    };

    if (!createPayload.tipo) {
      createPayload.tipo = 'entrega';
    }

    if (createPayload.tipo !== 'entrega') {
      throw buildError('Solo se permite tipo "entrega" en el flujo actual', 400);
    }

    return this.create(createPayload, userId);
  }

  static async createBatchFromTemplate(templateId, payload, userId) {
    const template = await this.getTemplateById(templateId, { includeInactive: false });

    if (template.items.some((item) => item.requiere_serial)) {
      throw buildError(
        'La creación masiva desde plantilla no admite artículos serializados en este MVP',
        400
      );
    }

    const workerIds = Array.from(new Set((payload.trabajador_ids || []).filter(Boolean)));
    if (workerIds.length === 0) {
      throw buildError('Debe seleccionar al menos un trabajador para creación masiva', 400);
    }

    const detalles = this.resolveTemplateDetails(template.items, payload.detalles_overrides || [], {
      requireSerialAssignments: false,
    });

    const entregas = [];
    for (const trabajadorId of workerIds) {
      const createPayload = {
        trabajador_id: trabajadorId,
        ubicacion_origen_id: payload.ubicacion_origen_id,
        ubicacion_destino_id: payload.ubicacion_destino_id,
        tipo: payload.tipo,
        nota_destino: payload.nota_destino || null,
        fecha_devolucion_esperada: payload.fecha_devolucion_esperada || null,
        detalles: detalles.map((item) => ({ ...item })),
      };

      if (!createPayload.tipo) {
        createPayload.tipo = 'entrega';
      }

      if (createPayload.tipo !== 'entrega') {
        throw buildError('Solo se permite tipo "entrega" en el flujo actual', 400);
      }

      const created = await this.create(createPayload, userId);
      entregas.push({
        id: created.id,
        trabajador_id: created.trabajador_id,
        estado: created.estado,
      });
    }

    return {
      template_id: templateId,
      total_creadas: entregas.length,
      entregas,
    };
  }

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
        p.apellidos,
        COUNT(d.id)::int AS cantidad_items,
        /* estado_devolucion computado desde custodia_activo */
        CASE
          WHEN e.estado <> 'confirmada' THEN NULL
          WHEN retornables.total IS NULL OR retornables.total = 0 THEN NULL
          WHEN retornables.cerradas = retornables.total THEN 'devuelta_completa'
          WHEN retornables.cerradas > 0 THEN 'parcialmente_devuelta'
          ELSE 'pendiente_devolucion'
        END AS estado_devolucion,
        retornables.total   AS retornables_total,
        retornables.cerradas AS retornables_cerradas
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN entrega_detalle d ON d.entrega_id = e.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE ca.estado <> 'activa')::int AS cerradas
        FROM custodia_activo ca
        WHERE ca.entrega_id = e.id
      ) retornables ON true
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY e.id, p.id, retornables.total, retornables.cerradas
      ORDER BY e.creado_en DESC
    `;

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
        p.apellidos,
        f.firma_imagen_url,
        f.firmado_en,
        CASE
          WHEN e.estado <> 'confirmada' THEN NULL
          WHEN retornables.total IS NULL OR retornables.total = 0 THEN NULL
          WHEN retornables.cerradas = retornables.total THEN 'devuelta_completa'
          WHEN retornables.cerradas > 0 THEN 'parcialmente_devuelta'
          ELSE 'pendiente_devolucion'
        END AS estado_devolucion,
        retornables.total   AS retornables_total,
        retornables.cerradas AS retornables_cerradas
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN firma_entrega f ON f.entrega_id = e.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE ca.estado <> 'activa')::int AS cerradas
        FROM custodia_activo ca
        WHERE ca.entrega_id = e.id
      ) retornables ON true
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
        ac.codigo AS activo_codigo,
        /* estado de devolución por ítem */
        ca.estado   AS custodia_estado,
        ca.hasta_en AS custodia_cerrada_en,
        CASE
          WHEN ca.id IS NULL THEN NULL
          WHEN ca.estado = 'activa' THEN false
          ELSE true
        END AS devuelto,
        ca.estado AS devolucion_disposicion
      FROM entrega_detalle d
      INNER JOIN articulo a ON a.id = d.articulo_id
      LEFT JOIN activo ac ON ac.id = d.activo_id
      LEFT JOIN custodia_activo ca ON ca.activo_id = d.activo_id
                                  AND ca.entrega_id = $1
      WHERE d.entrega_id = $1
      ORDER BY d.id
      `,
      [id]
    );

    const entrega = entregaResult.rows[0];
    const firmaImagenUrl = entrega.firma_imagen_url
      ? await resolveImageUrl(entrega.firma_imagen_url)
      : entrega.firma_imagen_url;

    return {
      ...entrega,
      firma_imagen_url: firmaImagenUrl,
      detalles: detalleResult.rows,
    };
  }

  static async findExistingActaDocument(queryExecutor, entregaId, lock = false) {
    const lockClause = lock ? 'FOR UPDATE OF d' : '';
    const result = await queryExecutor.query(
      `
      SELECT
        d.id AS documento_id,
        d.tipo,
        d.archivo_url,
        d.archivo_hash,
        d.creado_en,
        d.creado_por_usuario_id
      FROM documento d
      INNER JOIN documento_referencia dr ON dr.documento_id = d.id
      WHERE dr.entidad_tipo = 'entrega'
        AND dr.entidad_id = $1
        AND d.tipo = 'acta_entrega'
      ORDER BY d.creado_en DESC, d.id DESC
      LIMIT 1
      ${lockClause}
      `,
      [entregaId]
    );

    return result.rows[0] || null;
  }

  static async getActaEntregaData(client, entregaId) {
    const entregaResult = await client.query(
      `
      SELECT
        e.id,
        e.tipo,
        e.estado,
        e.creado_en,
        e.confirmada_en,
        e.nota_destino,
        e.fecha_devolucion_esperada,
        e.ubicacion_origen_id,
        e.ubicacion_destino_id,
        p.rut,
        p.nombres,
        p.apellidos,
        origen.nombre AS ubicacion_origen_nombre,
        destino.nombre AS ubicacion_destino_nombre,
        f.metodo AS firma_metodo,
        f.firma_imagen_url,
        f.firmado_en
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN ubicacion origen ON origen.id = e.ubicacion_origen_id
      LEFT JOIN ubicacion destino ON destino.id = e.ubicacion_destino_id
      LEFT JOIN firma_entrega f ON f.entrega_id = e.id
      WHERE e.id = $1
      FOR UPDATE OF e
      `,
      [entregaId]
    );

    if (!entregaResult.rows.length) {
      throw buildError('Entrega not found', 404);
    }

    const detailsResult = await client.query(
      `
      SELECT
        d.id,
        d.articulo_id,
        d.activo_id,
        d.cantidad,
        d.condicion_salida,
        d.notas,
        a.nombre AS articulo_nombre,
        ac.codigo AS activo_codigo
      FROM entrega_detalle d
      INNER JOIN articulo a ON a.id = d.articulo_id
      LEFT JOIN activo ac ON ac.id = d.activo_id
      WHERE d.entrega_id = $1
      ORDER BY d.id ASC
      `,
      [entregaId]
    );

    return {
      entrega: entregaResult.rows[0],
      detalles: detailsResult.rows,
    };
  }

  static async getActa(id, userId) {
    const existing = await this.findExistingActaDocument(db, id);
    if (existing) {
      return {
        ...existing,
        entidad_tipo: 'entrega',
        entidad_id: id,
        archivo_url_resuelto: await resolveImageUrl(existing.archivo_url),
        generated: false,
      };
    }

    const client = await db.pool.connect();
    let uploadedDocumentUrl = null;

    try {
      await client.query('BEGIN');

      const existingLocked = await this.findExistingActaDocument(client, id, true);
      if (existingLocked) {
        await client.query('COMMIT');
        return {
          ...existingLocked,
          entidad_tipo: 'entrega',
          entidad_id: id,
          archivo_url_resuelto: await resolveImageUrl(existingLocked.archivo_url),
          generated: false,
        };
      }

      const actaData = await this.getActaEntregaData(client, id);
      const pdfBuffer = await buildEntregaActaPdfBuffer(actaData);
      const archivoHash = computeSha256(pdfBuffer);

      uploadedDocumentUrl = await uploadDocument({
        buffer: pdfBuffer,
        originalname: `acta-entrega-${id}.pdf`,
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
      });

      const documentResult = await client.query(
        `
        INSERT INTO documento (
          tipo,
          archivo_url,
          archivo_hash,
          creado_por_usuario_id
        )
        VALUES ('acta_entrega', $1, $2, $3)
        RETURNING id AS documento_id, tipo, archivo_url, archivo_hash, creado_en, creado_por_usuario_id
        `,
        [uploadedDocumentUrl, archivoHash, userId]
      );

      const documentRecord = documentResult.rows[0];

      await client.query(
        `
        INSERT INTO documento_referencia (
          documento_id,
          entidad_tipo,
          entidad_id
        )
        VALUES ($1, 'entrega', $2)
        `,
        [documentRecord.documento_id, id]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'documento',
        entidadId: documentRecord.documento_id,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          tipo: 'acta_entrega',
          entidad_tipo: 'entrega',
          entidad_id: id,
          archivo_hash: archivoHash,
        },
      });

      await client.query('COMMIT');

      return {
        ...documentRecord,
        entidad_tipo: 'entrega',
        entidad_id: id,
        archivo_url_resuelto: await resolveImageUrl(documentRecord.archivo_url),
        generated: true,
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (uploadedDocumentUrl) {
        try {
          await deleteFileByUrl(uploadedDocumentUrl);
        } catch (cleanupError) {
          logger.warn('No se pudo limpiar acta de entrega tras error', {
            message: cleanupError.message,
            uploadedDocumentUrl,
          });
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  static async getLocationsByIds(client, locationIds) {
    if (!locationIds.length) {
      return new Map();
    }

    const { rows } = await client.query(
      `
      SELECT id, tipo, estado
      FROM ubicacion
      WHERE id = ANY($1::uuid[])
      `,
      [locationIds]
    );

    return new Map(rows.map((row) => [row.id, row]));
  }

  static async validateMovementRoute(client, entregaLike) {
    const rule = ROUTE_RULES[entregaLike.tipo];
    if (!rule) {
      throw buildError(`Tipo de movimiento no soportado: ${entregaLike.tipo}`, 400);
    }

    if (entregaLike.ubicacion_origen_id === entregaLike.ubicacion_destino_id) {
      throw buildError('La ubicación de origen y destino deben ser diferentes', 400);
    }

    const locations = await this.getLocationsByIds(client, [
      entregaLike.ubicacion_origen_id,
      entregaLike.ubicacion_destino_id,
    ]);

    const origen = locations.get(entregaLike.ubicacion_origen_id);
    const destino = locations.get(entregaLike.ubicacion_destino_id);

    if (!origen) {
      throw buildError('La ubicación de origen no existe', 400);
    }

    if (!destino) {
      throw buildError('La ubicación de destino no existe', 400);
    }

    if (origen.estado !== 'activo' || destino.estado !== 'activo') {
      throw buildError('Las ubicaciones de origen y destino deben estar activas', 400);
    }

    if (origen.tipo !== rule.origen || destino.tipo !== rule.destino) {
      throw buildError(
        `Ruta inválida para "${entregaLike.tipo}": se requiere ${rule.origen} → ${rule.destino}`,
        400
      );
    }
  }

  static async validateDetailRules(client, detalles) {
    const articleIds = Array.from(new Set(detalles.map((item) => item.articulo_id).filter(Boolean)));
    const activeIds = Array.from(new Set(detalles.map((item) => item.activo_id).filter(Boolean)));

    const articleResult = await client.query(
      `
      SELECT id, nombre, tracking_mode
      FROM articulo
      WHERE id = ANY($1::uuid[])
      `,
      [articleIds]
    );

    const articleMap = new Map(articleResult.rows.map((row) => [row.id, row]));

    let activeMap = new Map();
    if (activeIds.length) {
      const activeResult = await client.query(
        `
        SELECT id, articulo_id
        FROM activo
        WHERE id = ANY($1::uuid[])
        `,
        [activeIds]
      );

      activeMap = new Map(activeResult.rows.map((row) => [row.id, row]));
    }

    for (const detalle of detalles) {
      const article = articleMap.get(detalle.articulo_id);
      if (!article) {
        throw buildError(`Artículo ${detalle.articulo_id} no encontrado`, 400);
      }

      const quantity = Number(detalle.cantidad);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        throw buildError(`Cantidad inválida para artículo ${detalle.articulo_id}`, 400);
      }

      if (article.tracking_mode === 'serial') {
        if (!detalle.activo_id) {
          throw buildError(`El artículo ${article.nombre} requiere activo_id por control serial`, 400);
        }

        if (quantity !== 1) {
          throw buildError(
            `El artículo ${article.nombre} con tracking serial requiere cantidad 1`,
            400
          );
        }

        detalle.tipo_item_entrega = 'retornable';

        const active = activeMap.get(detalle.activo_id);
        if (!active) {
          throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400);
        }

        if (active.articulo_id !== detalle.articulo_id) {
          throw buildError(
            `El activo ${detalle.activo_id} no corresponde al artículo ${detalle.articulo_id}`,
            400
          );
        }
      } else {
        if (detalle.activo_id) {
          throw buildError(
            `El artículo ${article.nombre} no admite activo_id porque se controla por cantidad`,
            400
          );
        }
        detalle.tipo_item_entrega = 'asignacion';
      }
    }
  }

  static async create(payload, userId) {
    const rawDetalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (rawDetalles.length === 0) {
      throw buildError('Debe incluir al menos un detalle en la entrega', 400);
    }

    const detalles = this.normalizeCreateDetails(rawDetalles);
    const tipo = resolveEntregaTipo(payload);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const movementPayload = {
        ...payload,
        tipo,
      };

      await this.validateMovementRoute(client, movementPayload);
      await this.validateWorkerActive(client, payload.trabajador_id);

      await this.validateDetailRules(client, detalles);

      const entregaResult = await client.query(
        `
        INSERT INTO entrega (
          creado_por_usuario_id,
          trabajador_id,
          ubicacion_origen_id,
          ubicacion_destino_id,
          tipo,
          estado,
          nota_destino,
          fecha_devolucion_esperada
        )
        VALUES ($1, $2, $3, $4, $5, 'borrador', $6, $7)
        RETURNING id
        `,
        [
          userId,
          payload.trabajador_id,
          payload.ubicacion_origen_id,
          payload.ubicacion_destino_id,
          tipo,
          payload.nota_destino || null,
          payload.fecha_devolucion_esperada || null,
        ]
      );

      const entregaId = entregaResult.rows[0].id;

      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO entrega_detalle (
            entrega_id, articulo_id, activo_id, lote_id, cantidad, tipo_item_entrega, condicion_salida, notas
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            entregaId,
            detalle.articulo_id,
            detalle.activo_id || null,
            null,
            detalle.cantidad,
            detalle.tipo_item_entrega || 'asignacion',
            detalle.condicion_salida || 'ok',
            detalle.notas || null,
          ]
        );
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: entregaId,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          tipo,
          trabajador_id: payload.trabajador_id,
          ubicacion_origen_id: payload.ubicacion_origen_id,
          ubicacion_destino_id: payload.ubicacion_destino_id,
          detalles_count: detalles.length,
        },
      });

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

      await this.validateMovementRoute(client, entrega);
      await this.validateDetailRules(client, detalles);

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

          const newAssetState = 'asignado';
          const newAssetLocation = entrega.ubicacion_destino_id;

          await client.query(
            `
            UPDATE activo
            SET estado = $1, ubicacion_actual_id = $2
            WHERE id = $3
            `,
            [newAssetState, newAssetLocation, detalle.activo_id]
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
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
              detalle.activo_id,
              'entrega',
              entrega.ubicacion_origen_id,
              entrega.ubicacion_destino_id,
              userId,
              entrega.id,
              detalle.notas || null,
            ]
          );

          if (detalle.tipo_item_entrega === 'retornable') {
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
                `Activo ${detalle.activo_id} ya tiene una custodia activa`,
                400
              );
            }

            await client.query(
              `
              INSERT INTO custodia_activo (
                activo_id,
                trabajador_id,
                ubicacion_destino_id,
                entrega_id,
                estado,
                fecha_devolucion_esperada
              )
              VALUES ($1, $2, $3, $4, 'activa', $5)
              `,
              [
                detalle.activo_id,
                entrega.trabajador_id,
                entrega.ubicacion_destino_id,
                entrega.id,
                entrega.fecha_devolucion_esperada || null,
              ]
            );
          }
        } else {
          const originStockResult = await client.query(
            `
            SELECT *
            FROM stock
            WHERE ubicacion_id = $1
              AND articulo_id = $2
              AND lote_id IS NULL
            FOR UPDATE
            `,
            [entrega.ubicacion_origen_id, detalle.articulo_id]
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
              detalle.articulo_id,
              null,
              'entrega',
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

      const nextEstado = 'confirmada';

      await client.query(
        `
        UPDATE entrega
        SET estado = $2,
            confirmada_en = CASE WHEN $3 THEN NOW() ELSE confirmada_en END
        WHERE id = $1
        `,
        [id, nextEstado, true]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_anterior: entrega.estado,
          estado_nuevo: nextEstado,
          tipo: entrega.tipo,
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

  static async anular(id, userId, motivo) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedMotivo = String(motivo || '').trim();
      if (normalizedMotivo.length < 5) {
        throw buildError('Debe indicar un motivo de anulación de al menos 5 caracteres', 400);
      }

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
        `
        UPDATE entrega
        SET estado = 'anulada',
            motivo_anulacion = $2
        WHERE id = $1
        `,
        [id, normalizedMotivo]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_anterior: entrega.estado,
          estado_nuevo: 'anulada',
          tipo: entrega.tipo,
          motivo_anulacion: normalizedMotivo,
        },
      });

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

  static async deshacer(id, userId, motivo) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedMotivo = String(motivo || '').trim();
      if (normalizedMotivo.length < 5) {
        throw buildError('Debe indicar un motivo de deshacer de al menos 5 caracteres', 400);
      }

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
        throw buildError('Entrega no encontrada', 404);
      }

      const entrega = entregaResult.rows[0];
      if (['anulada', 'revertida_admin'].includes(entrega.estado)) {
        throw buildError(`La entrega ya está cerrada en estado "${entrega.estado}"`, 400);
      }

      if (['borrador', 'pendiente_firma'].includes(entrega.estado)) {
        await client.query(
          `
          UPDATE entrega
          SET estado = 'anulada',
              motivo_anulacion = $2,
              deshecha_por_usuario_id = $3,
              deshecha_en = NOW()
          WHERE id = $1
          `,
          [id, normalizedMotivo, userId]
        );

        await writeAuditEvent({
          client,
          entidadTipo: 'entrega',
          entidadId: id,
          accion: 'actualizar',
          usuarioId: userId,
          diff: {
            accion_operativa: 'deshacer_pre_confirmacion',
            estado_anterior: entrega.estado,
            estado_nuevo: 'anulada',
            motivo_anulacion: normalizedMotivo,
          },
        });

        await client.query('COMMIT');
        return this.getById(id);
      }

      if (entrega.estado !== 'confirmada') {
        throw buildError(`No se puede deshacer una entrega en estado "${entrega.estado}"`, 400);
      }

      const detalleResult = await client.query(
        `
        SELECT *
        FROM entrega_detalle
        WHERE entrega_id = $1
        ORDER BY id
        FOR UPDATE
        `,
        [id]
      );

      const detalles = detalleResult.rows;
      if (detalles.length === 0) {
        throw buildError('La entrega no tiene detalles para revertir', 400);
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

          if (detalle.tipo_item_entrega === 'retornable') {
            const custodyResult = await client.query(
              `
              SELECT id
              FROM custodia_activo
              WHERE entrega_id = $1
                AND activo_id = $2
                AND estado = 'activa'
                AND hasta_en IS NULL
              LIMIT 1
              FOR UPDATE
              `,
              [entrega.id, detalle.activo_id]
            );

            if (!custodyResult.rows.length) {
              throw buildError(
                `No se puede deshacer: el activo ${detalle.activo_id} ya no tiene custodia activa de esta entrega`,
                409
              );
            }

            await client.query(
              `
              UPDATE custodia_activo
              SET estado = 'devuelta',
                  hasta_en = NOW()
              WHERE id = $1
              `,
              [custodyResult.rows[0].id]
            );
          }

          await client.query(
            `
            UPDATE activo
            SET estado = 'en_stock',
                ubicacion_actual_id = $2
            WHERE id = $1
            `,
            [detalle.activo_id, entrega.ubicacion_origen_id]
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
            VALUES ($1, 'devolucion', $2, $3, $4, $5, $6)
            `,
            [
              detalle.activo_id,
              activo.ubicacion_actual_id,
              entrega.ubicacion_origen_id,
              userId,
              entrega.id,
              appendAdminUndoNote(detalle.notas, normalizedMotivo),
            ]
          );

          continue;
        }

        const qty = Number(detalle.cantidad);
        const originStockResult = await client.query(
          `
          SELECT *
          FROM stock
          WHERE ubicacion_id = $1
            AND articulo_id = $2
            AND lote_id IS NULL
          FOR UPDATE
          `,
          [entrega.ubicacion_origen_id, detalle.articulo_id]
        );

        if (!originStockResult.rows.length) {
          throw buildError(
            `No existe stock de origen para revertir artículo ${detalle.articulo_id}`,
            400
          );
        }

        const destinationStockResult = await client.query(
          `
          SELECT *
          FROM stock
          WHERE ubicacion_id = $1
            AND articulo_id = $2
            AND lote_id IS NULL
          FOR UPDATE
          `,
          [entrega.ubicacion_destino_id, detalle.articulo_id]
        );

        if (!destinationStockResult.rows.length) {
          throw buildError(
            `No existe stock en destino para revertir artículo ${detalle.articulo_id}`,
            409
          );
        }

        const destinationStock = destinationStockResult.rows[0];
        if (Number(destinationStock.cantidad_disponible) < qty) {
          throw buildError(
            `No se puede deshacer: stock insuficiente en destino para artículo ${detalle.articulo_id}`,
            409
          );
        }

        await client.query(
          `
          UPDATE stock
          SET cantidad_disponible = cantidad_disponible - $1,
              actualizado_en = NOW()
          WHERE id = $2
          `,
          [qty, destinationStock.id]
        );

        await client.query(
          `
          UPDATE stock
          SET cantidad_disponible = cantidad_disponible + $1,
              actualizado_en = NOW()
          WHERE id = $2
          `,
          [qty, originStockResult.rows[0].id]
        );

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
          VALUES ($1, $2, 'devolucion', $3, $4, $5, $6, $7, $8)
          `,
          [
            detalle.articulo_id,
            null,
            entrega.ubicacion_destino_id,
            entrega.ubicacion_origen_id,
            qty,
            userId,
            entrega.id,
            appendAdminUndoNote(detalle.notas, normalizedMotivo),
          ]
        );
      }

      await client.query(
        `
        UPDATE entrega
        SET estado = 'revertida_admin',
            motivo_anulacion = $2,
            deshecha_por_usuario_id = $3,
            deshecha_en = NOW()
        WHERE id = $1
        `,
        [id, normalizedMotivo, userId]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          accion_operativa: 'deshacer_post_confirmacion',
          estado_anterior: entrega.estado,
          estado_nuevo: 'revertida_admin',
          tipo: entrega.tipo,
          motivo_anulacion: normalizedMotivo,
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

  static async permanentDelete(id, userId) {
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
        throw buildError('Entrega no encontrada', 404);
      }

      const entrega = entregaResult.rows[0];
      if (!['anulada', 'revertida_admin'].includes(entrega.estado)) {
        throw buildError(
          `Solo se pueden eliminar entregas en estado "anulada" o "revertida_admin" (estado actual: "${entrega.estado}")`,
          400
        );
      }

      // Limpieza defensiva: si existen custodias asociadas, se eliminan para no violar FK.
      await client.query(
        `
        DELETE FROM custodia_activo
        WHERE entrega_id = $1
        `,
        [id]
      );

      await client.query(
        `
        DELETE FROM documento_referencia
        WHERE entidad_tipo = 'entrega'
          AND entidad_id = $1
        `,
        [id]
      );

      // Decisión de producto: borrar también auditoría histórica de esta entrega.
      await client.query(
        `
        DELETE FROM auditoria
        WHERE entidad_tipo = 'entrega'
          AND entidad_id = $1
        `,
        [id]
      );

      await client.query(
        `
        DELETE FROM entrega
        WHERE id = $1
        `,
        [id]
      );

      await client.query('COMMIT');

      return {
        id,
        estado_anterior: entrega.estado,
        eliminado_por_usuario_id: userId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EntregasService;
