const db = require('../db');
const ComprasService = require('./compras.service');
const EgresosService = require('./egresos.service');

const csvEscape = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const parseBoundedInteger = (value, { min, max, fallback }) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const integerValue = Math.trunc(numeric);
  if (integerValue < min) return min;
  if (integerValue > max) return max;
  return integerValue;
};

const parseBooleanFlag = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'si', 'on'].includes(normalized);
};

const encodeOffsetCursor = (offset) => {
  const safeOffset = Math.max(0, Number(offset) || 0);
  return Buffer.from(JSON.stringify({ offset: safeOffset }), 'utf8').toString('base64url');
};

const decodeOffsetCursor = (cursor) => {
  if (!cursor) return 0;

  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    return Math.max(0, Number(parsed?.offset) || 0);
  } catch {
    const error = new Error('Cursor inválido');
    error.statusCode = 400;
    throw error;
  }
};

class InventarioService {
  static async getIngresos(filters = {}) {
    return ComprasService.list(filters);
  }

  static async createIngreso(payload, userId) {
    return ComprasService.create(payload, userId);
  }

  static async deleteIngreso(id, userId) {
    return ComprasService.deleteIngreso(id, userId);
  }

  static async getStock(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.ubicacion_id) {
      values.push(filters.ubicacion_id);
      conditions.push(`s.ubicacion_id = $${values.length}`);
    }

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`s.articulo_id = $${values.length}`);
    }

    if (filters.lote_id) {
      values.push(filters.lote_id);
      conditions.push(`s.lote_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(a.nombre ILIKE $${values.length} OR COALESCE(l.codigo_lote, '') ILIKE $${values.length})`);
    }

    let query = `
      SELECT
        s.*,
        a.nombre AS articulo_nombre,
        a.tipo AS articulo_tipo,
        a.tracking_mode,
        a.unidad_medida,
        u.nombre AS ubicacion_nombre,
        u.tipo AS ubicacion_tipo,
        l.codigo_lote,
        l.fecha_vencimiento
      FROM stock s
      INNER JOIN articulo a ON a.id = s.articulo_id
      INNER JOIN ubicacion u ON u.id = s.ubicacion_id
      LEFT JOIN lote l ON l.id = s.lote_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY a.nombre ASC, u.nombre ASC';

    const hasLimit = filters.limit !== undefined && filters.limit !== null && filters.limit !== '';
    const hasOffset = filters.offset !== undefined && filters.offset !== null && filters.offset !== '';

    if (hasLimit) {
      const limit = parseBoundedInteger(filters.limit, { min: 1, max: 500, fallback: 100 });
      values.push(limit);
      query += ` LIMIT $${values.length}`;
    }

    if (hasOffset) {
      const offset = parseBoundedInteger(filters.offset, { min: 0, max: 1000000, fallback: 0 });
      if (!hasLimit) {
        query += ' LIMIT ALL';
      }
      values.push(offset);
      query += ` OFFSET $${values.length}`;
    }

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getStockSummary(filters = {}) {
    const values = [];
    const stockConditions = [];
    const activoConditions = [];
    const outerConditions = [];

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      stockConditions.push(`s.articulo_id = $${values.length}`);
      activoConditions.push(`ac.articulo_id = $${values.length}`);
    }

    if (filters.ubicacion_id) {
      values.push(filters.ubicacion_id);
      stockConditions.push(`s.ubicacion_id = $${values.length}`);
      activoConditions.push(`ac.ubicacion_actual_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      outerConditions.push(`a.nombre ILIKE $${values.length}`);
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 50 });
    const offset = decodeOffsetCursor(filters.cursor);

    values.push(limit + 1);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    let query = `
      WITH source_rows AS (
        SELECT
          s.articulo_id,
          s.ubicacion_id,
          COALESCE(s.cantidad_disponible, 0) AS disponible_total,
          COALESCE(s.cantidad_reservada, 0) AS reservada_total,
          1::int AS registros_count
        FROM stock s
        ${stockConditions.length ? `WHERE ${stockConditions.join(' AND ')}` : ''}

        UNION ALL

        SELECT
          ac.articulo_id,
          ac.ubicacion_actual_id AS ubicacion_id,
          COUNT(*)::numeric AS disponible_total,
          0::numeric AS reservada_total,
          COUNT(*)::int AS registros_count
        FROM activo ac
        INNER JOIN articulo ar ON ar.id = ac.articulo_id
        WHERE ac.estado = 'en_stock'
          AND ar.tracking_mode = 'serial'
          ${activoConditions.length ? `AND ${activoConditions.join(' AND ')}` : ''}
        GROUP BY ac.articulo_id, ac.ubicacion_actual_id
      )
      SELECT
        sr.articulo_id,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        a.retorno_mode,
        COUNT(DISTINCT sr.ubicacion_id)::int AS ubicaciones_count,
        COALESCE(SUM(sr.disponible_total), 0) AS disponible_total,
        COALESCE(SUM(sr.reservada_total), 0) AS reservada_total,
        COALESCE(SUM(sr.registros_count), 0)::int AS registros_count
      FROM source_rows sr
      INNER JOIN articulo a ON a.id = sr.articulo_id
      ${outerConditions.length ? `WHERE ${outerConditions.join(' AND ')}` : ''}
      GROUP BY sr.articulo_id, a.nombre, a.tracking_mode, a.retorno_mode
      ORDER BY a.nombre ASC, sr.articulo_id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await db.query(query, values);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      hasMore,
      nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
    };
  }

  static async getStockPaged(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.ubicacion_id) {
      values.push(filters.ubicacion_id);
      conditions.push(`s.ubicacion_id = $${values.length}`);
    }

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`s.articulo_id = $${values.length}`);
    }

    if (filters.lote_id) {
      values.push(filters.lote_id);
      conditions.push(`s.lote_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(a.nombre ILIKE $${values.length} OR COALESCE(l.codigo_lote, '') ILIKE $${values.length})`);
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 50 });
    const offset = decodeOffsetCursor(filters.cursor);

    values.push(limit + 1);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    let query = `
      SELECT
        s.id,
        s.articulo_id,
        s.ubicacion_id,
        s.lote_id,
        s.cantidad_disponible,
        s.cantidad_reservada,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        a.retorno_mode,
        u.nombre AS ubicacion_nombre,
        l.codigo_lote,
        l.fecha_vencimiento,
        lm.tipo AS ultimo_movimiento_tipo,
        lm.fecha_movimiento AS ultimo_movimiento_fecha,
        lm.responsable_email AS ultimo_movimiento_responsable
      FROM stock s
      INNER JOIN articulo a ON a.id = s.articulo_id
      INNER JOIN ubicacion u ON u.id = s.ubicacion_id
      LEFT JOIN lote l ON l.id = s.lote_id
      LEFT JOIN LATERAL (
        SELECT
          ms.tipo,
          ms.fecha_movimiento,
          us.email_login AS responsable_email
        FROM movimiento_stock ms
        INNER JOIN usuario us ON us.id = ms.responsable_usuario_id
        WHERE ms.articulo_id = s.articulo_id
          AND (
            (s.lote_id IS NOT NULL AND ms.lote_id = s.lote_id)
            OR
            (s.lote_id IS NULL AND ms.lote_id IS NULL
              AND (ms.ubicacion_origen_id = s.ubicacion_id OR ms.ubicacion_destino_id = s.ubicacion_id)
            )
          )
        ORDER BY ms.fecha_movimiento DESC
        LIMIT 1
      ) lm ON TRUE
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY a.nombre ASC, u.nombre ASC, s.id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await db.query(query, values);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      hasMore,
      nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
    };
  }

  static async getStockMovements(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`ms.articulo_id = $${values.length}`);
    }

    if (filters.tipo) {
      values.push(filters.tipo);
      conditions.push(`ms.tipo = $${values.length}`);
    }

    if (filters.compra_id) {
      values.push(filters.compra_id);
      conditions.push(`ms.compra_id = $${values.length}`);
    }

    if (filters.entrega_id) {
      values.push(filters.entrega_id);
      conditions.push(`ms.entrega_id = $${values.length}`);
    }

    if (filters.devolucion_id) {
      values.push(filters.devolucion_id);
      conditions.push(`ms.devolucion_id = $${values.length}`);
    }

    if (filters.egreso_id) {
      values.push(filters.egreso_id);
      conditions.push(`ms.egreso_id = $${values.length}`);
    }

    if (filters.desde) {
      values.push(filters.desde);
      conditions.push(`ms.fecha_movimiento >= $${values.length}`);
    }

    if (filters.hasta) {
      values.push(filters.hasta);
      conditions.push(`ms.fecha_movimiento <= $${values.length}`);
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
    values.push(limit);

    let query = `
      SELECT
        ms.*,
        a.nombre AS articulo_nombre,
        l.codigo_lote,
        uo.nombre AS ubicacion_origen_nombre,
        ud.nombre AS ubicacion_destino_nombre,
        us.email_login AS responsable_email,
        CASE
          WHEN ms.compra_id IS NOT NULL THEN 'ingreso'
          WHEN ms.egreso_id IS NOT NULL THEN 'egreso'
          WHEN ms.devolucion_id IS NOT NULL THEN 'devolucion'
          WHEN ms.entrega_id IS NOT NULL AND ms.notas ILIKE '%[reversa_admin:%' THEN 'deshacer_entrega'
          WHEN ms.entrega_id IS NOT NULL THEN 'entrega'
          ELSE 'inventario'
        END AS evento_origen,
        COALESCE(ms.compra_id, ms.egreso_id, ms.entrega_id, ms.devolucion_id) AS referencia_origen_id
      FROM movimiento_stock ms
      INNER JOIN articulo a ON a.id = ms.articulo_id
      LEFT JOIN lote l ON l.id = ms.lote_id
      LEFT JOIN ubicacion uo ON uo.id = ms.ubicacion_origen_id
      LEFT JOIN ubicacion ud ON ud.id = ms.ubicacion_destino_id
      INNER JOIN usuario us ON us.id = ms.responsable_usuario_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ms.fecha_movimiento DESC LIMIT $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async exportStockMovementsCsv(filters = {}) {
    const exportFilters = {
      ...filters,
      limit: Number(filters.limit) > 0 ? Number(filters.limit) : 5000,
    };

    const rows = await this.getStockMovements(exportFilters);

    const headers = [
      'id',
      'fecha_movimiento',
      'tipo',
      'articulo_nombre',
      'codigo_lote',
      'cantidad',
      'ubicacion_origen',
      'ubicacion_destino',
      'responsable_email',
      'compra_id',
      'egreso_id',
      'entrega_id',
      'devolucion_id',
      'evento_origen',
      'referencia_origen_id',
      'notas',
    ];

    const lines = [headers.join(',')];

    for (const row of rows) {
      lines.push(
        [
          csvEscape(row.id),
          csvEscape(row.fecha_movimiento),
          csvEscape(row.tipo),
          csvEscape(row.articulo_nombre),
          csvEscape(row.codigo_lote),
          csvEscape(row.cantidad),
          csvEscape(row.ubicacion_origen_nombre),
          csvEscape(row.ubicacion_destino_nombre),
          csvEscape(row.responsable_email),
          csvEscape(row.compra_id),
          csvEscape(row.egreso_id),
          csvEscape(row.entrega_id),
          csvEscape(row.devolucion_id),
          csvEscape(row.evento_origen),
          csvEscape(row.referencia_origen_id),
          csvEscape(row.notas),
        ].join(',')
      );
    }

    return lines.join('\n');
  }

  static async getAssetMovements(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.activo_id) {
      values.push(filters.activo_id);
      conditions.push(`ma.activo_id = $${values.length}`);
    }

    if (filters.tipo) {
      values.push(filters.tipo);
      conditions.push(`ma.tipo = $${values.length}`);
    }

    if (filters.entrega_id) {
      values.push(filters.entrega_id);
      conditions.push(`ma.entrega_id = $${values.length}`);
    }

    if (filters.devolucion_id) {
      values.push(filters.devolucion_id);
      conditions.push(`ma.devolucion_id = $${values.length}`);
    }

    if (filters.desde) {
      values.push(filters.desde);
      conditions.push(`ma.fecha_movimiento >= $${values.length}`);
    }

    if (filters.hasta) {
      values.push(filters.hasta);
      conditions.push(`ma.fecha_movimiento <= $${values.length}`);
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
    values.push(limit);

    let query = `
      SELECT
        ma.*,
        a.codigo AS activo_codigo,
        a.nro_serie AS activo_nro_serie,
        ar.nombre AS articulo_nombre,
        uo.nombre AS ubicacion_origen_nombre,
        ud.nombre AS ubicacion_destino_nombre,
        us.email_login AS responsable_email
      FROM movimiento_activo ma
      INNER JOIN activo a ON a.id = ma.activo_id
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN ubicacion uo ON uo.id = ma.ubicacion_origen_id
      LEFT JOIN ubicacion ud ON ud.id = ma.ubicacion_destino_id
      INNER JOIN usuario us ON us.id = ma.responsable_usuario_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ma.fecha_movimiento DESC LIMIT $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getActivos(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`ar.id = $${values.length}`);
    }

    if (filters.ubicacion_id) {
      values.push(filters.ubicacion_id);
      conditions.push(`a.ubicacion_actual_id = $${values.length}`);
    }

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length} OR ar.nombre ILIKE $${values.length})`
      );
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
    values.push(limit);

    let query = `
      SELECT
        a.id,
        a.codigo,
        a.nro_serie,
        a.estado,
        a.valor,
        a.fecha_vencimiento,
        a.fecha_compra,
        a.creado_en,
        ar.id AS articulo_id,
        ar.nombre AS articulo_nombre,
        ar.tipo AS articulo_tipo,
        ar.tracking_mode,
        ar.retorno_mode,
        u.id AS ubicacion_id,
        u.nombre AS ubicacion_nombre,
        u.tipo AS ubicacion_tipo,
        ca.id AS custodia_id,
        ca.estado AS custodia_estado,
        ca.desde_en AS custodia_desde_en,
        tr.id AS custodio_trabajador_id,
        p.nombres AS custodio_nombres,
        p.apellidos AS custodio_apellidos,
        ud.id AS custodia_ubicacion_id,
        ud.nombre AS custodia_ubicacion_nombre,
        um.tipo AS ultimo_movimiento_tipo,
        um.fecha_movimiento AS ultimo_movimiento_fecha,
        um.ubicacion_origen_nombre AS ultimo_movimiento_origen_nombre,
        um.ubicacion_destino_nombre AS ultimo_movimiento_destino_nombre
      FROM activo a
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN ubicacion u ON u.id = a.ubicacion_actual_id
      LEFT JOIN custodia_activo ca
        ON ca.activo_id = a.id
       AND ca.estado = 'activa'
       AND ca.hasta_en IS NULL
      LEFT JOIN trabajador tr ON tr.id = ca.trabajador_id
      LEFT JOIN persona p ON p.id = tr.persona_id
      LEFT JOIN ubicacion ud ON ud.id = ca.ubicacion_destino_id
      LEFT JOIN LATERAL (
        SELECT
          ma.tipo,
          ma.fecha_movimiento,
          uo.nombre AS ubicacion_origen_nombre,
          ux.nombre AS ubicacion_destino_nombre
        FROM movimiento_activo ma
        LEFT JOIN ubicacion uo ON uo.id = ma.ubicacion_origen_id
        LEFT JOIN ubicacion ux ON ux.id = ma.ubicacion_destino_id
        WHERE ma.activo_id = a.id
        ORDER BY ma.fecha_movimiento DESC
        LIMIT 1
      ) um ON TRUE
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ar.nombre ASC, a.codigo ASC LIMIT $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getActivosPaged(filters = {}) {
    const values = [];
    const conditions = [];
    const onlyDelivered = parseBooleanFlag(filters.solo_entregados);

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`ar.id = $${values.length}`);
    }

    if (filters.ubicacion_id) {
      values.push(filters.ubicacion_id);
      conditions.push(`a.ubicacion_actual_id = $${values.length}`);
    }

    if (filters.estado && !onlyDelivered) {
      values.push(filters.estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (onlyDelivered) {
      conditions.push(`(a.estado = 'entregado' OR (ca.id IS NOT NULL AND ca.estado = 'activa' AND ca.hasta_en IS NULL))`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length} OR ar.nombre ILIKE $${values.length})`
      );
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 50 });
    const offset = decodeOffsetCursor(filters.cursor);

    values.push(limit + 1);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    let query = `
      SELECT
        a.id,
        a.codigo,
        a.nro_serie,
        a.estado,
        a.valor,
        a.fecha_vencimiento,
        a.fecha_compra,
        a.creado_en,
        ar.id AS articulo_id,
        ar.nombre AS articulo_nombre,
        ar.tipo AS articulo_tipo,
        ar.tracking_mode,
        ar.retorno_mode,
        u.id AS ubicacion_id,
        u.nombre AS ubicacion_nombre,
        u.tipo AS ubicacion_tipo,
        ca.id AS custodia_id,
        ca.estado AS custodia_estado,
        ca.desde_en AS custodia_desde_en,
        ca.entrega_id AS custodia_entrega_id,
        tr.id AS custodio_trabajador_id,
        p.nombres AS custodio_nombres,
        p.apellidos AS custodio_apellidos,
        ud.id AS custodia_ubicacion_id,
        ud.nombre AS custodia_ubicacion_nombre,
        le.entrega_id AS ultima_entrega_id,
        le.entrega_confirmada_en,
        ld.devolucion_id AS ultima_devolucion_id,
        ld.devolucion_confirmada_en,
        CASE
          WHEN ca.desde_en IS NULL THEN NULL
          ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - ca.desde_en)) / 86400))::int
        END AS dias_en_custodia,
        um.tipo AS ultimo_movimiento_tipo,
        um.fecha_movimiento AS ultimo_movimiento_fecha,
        um.ubicacion_origen_nombre AS ultimo_movimiento_origen_nombre,
        um.ubicacion_destino_nombre AS ultimo_movimiento_destino_nombre
      FROM activo a
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN ubicacion u ON u.id = a.ubicacion_actual_id
      LEFT JOIN custodia_activo ca
        ON ca.activo_id = a.id
       AND ca.estado = 'activa'
       AND ca.hasta_en IS NULL
      LEFT JOIN trabajador tr ON tr.id = ca.trabajador_id
      LEFT JOIN persona p ON p.id = tr.persona_id
      LEFT JOIN ubicacion ud ON ud.id = ca.ubicacion_destino_id
      LEFT JOIN LATERAL (
        SELECT
          e.id AS entrega_id,
          e.confirmada_en AS entrega_confirmada_en
        FROM entrega_detalle ed
        INNER JOIN entrega e ON e.id = ed.entrega_id
        WHERE ed.activo_id = a.id
          AND e.estado = 'confirmada'
        ORDER BY e.confirmada_en DESC NULLS LAST, e.creado_en DESC
        LIMIT 1
      ) le ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          d.id AS devolucion_id,
          d.confirmada_en AS devolucion_confirmada_en
        FROM devolucion_detalle dd
        INNER JOIN devolucion d ON d.id = dd.devolucion_id
        WHERE dd.activo_id = a.id
          AND d.estado = 'confirmada'
        ORDER BY d.confirmada_en DESC NULLS LAST, d.creado_en DESC
        LIMIT 1
      ) ld ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          ma.tipo,
          ma.fecha_movimiento,
          uo.nombre AS ubicacion_origen_nombre,
          ux.nombre AS ubicacion_destino_nombre
        FROM movimiento_activo ma
        LEFT JOIN ubicacion uo ON uo.id = ma.ubicacion_origen_id
        LEFT JOIN ubicacion ux ON ux.id = ma.ubicacion_destino_id
        WHERE ma.activo_id = a.id
        ORDER BY ma.fecha_movimiento DESC
        LIMIT 1
      ) um ON TRUE
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY ar.nombre ASC, a.codigo ASC, a.id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await db.query(query, values);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      hasMore,
      nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
    };
  }

  static async getActivosDisponibles(filters = {}) {
    const articuloId = String(filters.articulo_id || '').trim();
    const ubicacionId = String(filters.ubicacion_id || '').trim();

    if (!articuloId || !ubicacionId) {
      const error = new Error('Debe enviar articulo_id y ubicacion_id para consultar activos disponibles.');
      error.statusCode = 400;
      throw error;
    }

    const values = [articuloId, ubicacionId];
    const conditions = [
      'a.articulo_id = $1',
      'a.ubicacion_actual_id = $2',
      "a.estado = 'en_stock'",
      "ar.tracking_mode = 'serial'",
    ];

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length})`);
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 25 });
    values.push(limit);

    const query = `
      SELECT
        a.id,
        a.codigo,
        a.nro_serie,
        a.estado,
        a.articulo_id,
        ar.nombre AS articulo_nombre,
        a.ubicacion_actual_id AS ubicacion_id,
        u.nombre AS ubicacion_nombre
      FROM activo a
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      INNER JOIN ubicacion u ON u.id = a.ubicacion_actual_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.codigo ASC
      LIMIT $${values.length}
    `;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getAuditoria(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.entidad_tipo) {
      values.push(filters.entidad_tipo);
      conditions.push(`a.entidad_tipo = $${values.length}`);
    }

    if (filters.entidad_id) {
      values.push(filters.entidad_id);
      conditions.push(`a.entidad_id = $${values.length}`);
    }

    if (filters.usuario_id) {
      values.push(filters.usuario_id);
      conditions.push(`a.usuario_id = $${values.length}`);
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
    values.push(limit);

    let query = `
      SELECT
        a.*,
        u.email_login AS usuario_email
      FROM auditoria a
      INNER JOIN usuario u ON u.id = a.usuario_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.creado_en DESC LIMIT $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getEgresos(filters = {}) {
    return EgresosService.list(filters);
  }

  static async getEgresoById(id) {
    return EgresosService.getById(id);
  }

  static async createEgreso(payload, userId) {
    return EgresosService.create(payload, userId);
  }

  static async deleteEgreso(id, userId) {
    return EgresosService.deleteEgreso(id, userId);
  }

  static async getLotes(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.articulo_id) {
      values.push(filters.articulo_id);
      conditions.push(`l.articulo_id = $${values.length}`);
    }

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`l.estado = $${values.length}`);
    }

    let query = `
      SELECT
        l.id,
        l.articulo_id,
        l.codigo_lote,
        l.fecha_fabricacion,
        l.fecha_vencimiento,
        l.estado,
        a.nombre AS articulo_nombre
      FROM lote l
      INNER JOIN articulo a ON a.id = l.articulo_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY l.creado_en DESC`;

    const { rows } = await db.query(query, values);
    return rows;
  }
}

module.exports = InventarioService;
