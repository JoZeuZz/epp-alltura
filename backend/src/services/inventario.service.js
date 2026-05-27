const db = require('../db');
const { resolveImageUrl } = require('../lib/googleCloud');
const { buildError } = require('../lib/errors');

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
  // Identity helper — rows already come from articulo with all needed joins
  static async _resolveActivoRows(rows) {
    return Promise.all((rows || []).map(async (row) => ({
      ...row,
      foto_url: await resolveImageUrl(row.foto_url),
    })));
  }

  // ── List all articles with filters ───────────────────────────
  static async getActivos(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.tipo) {
      values.push(filters.tipo);
      conditions.push(`a.tipo = $${values.length}`);
    }

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (filters.bodega_id) {
      values.push(filters.bodega_id);
      conditions.push(`a.bodega_actual_id = $${values.length}`);
    }

    if (filters.proyecto_id) {
      values.push(filters.proyecto_id);
      conditions.push(`a.proyecto_actual_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length} OR a.nombre ILIKE $${values.length})`
      );
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 500, fallback: 100 });
    values.push(limit);
    const limitIndex = values.length;

    values.push(parseBoundedInteger(filters.offset, { min: 0, max: 1000000, fallback: 0 }));
    const offsetIndex = values.length;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        a.*,
        b.nombre AS bodega_nombre,
        p.nombre AS proyecto_nombre,
        COALESCE(json_agg(ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades
      FROM articulo a
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      LEFT JOIN proyectos p ON p.id = a.proyecto_actual_id
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
      ${whereClause}
      GROUP BY a.id, b.nombre, p.nombre
      ORDER BY a.creado_en DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await db.query(query, values);
    return this._resolveActivoRows(rows);
  }

  // ── Paged list with cursor ───────────────────────────────────
  static async getActivosPaged(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.tipo) {
      values.push(filters.tipo);
      conditions.push(`a.tipo = $${values.length}`);
    }

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (filters.bodega_id) {
      values.push(filters.bodega_id);
      conditions.push(`a.bodega_actual_id = $${values.length}`);
    }

    if (filters.proyecto_id) {
      values.push(filters.proyecto_id);
      conditions.push(`a.proyecto_actual_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length} OR a.nombre ILIKE $${values.length})`
      );
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 50 });
    const offset = decodeOffsetCursor(filters.cursor);

    values.push(limit + 1);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        a.*,
        b.nombre AS bodega_nombre,
        p.nombre AS proyecto_nombre,
        COALESCE(json_agg(ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades
      FROM articulo a
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      LEFT JOIN proyectos p ON p.id = a.proyecto_actual_id
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
      ${whereClause}
      GROUP BY a.id, b.nombre, p.nombre
      ORDER BY a.creado_en DESC, a.id ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await db.query(query, values);
    const hasMore = rows.length > limit;
    const items = await this._resolveActivoRows(hasMore ? rows.slice(0, limit) : rows);

    return {
      items,
      hasMore,
      nextCursor: hasMore ? encodeOffsetCursor(offset + limit) : null,
    };
  }

  // ── Articles available in stock (for delivery) ───────────────
  static async getActivosDisponibles(filters = {}) {
    const values = [];
    const conditions = ["a.estado = 'en_stock'"];

    if (filters.bodega_id) {
      values.push(filters.bodega_id);
      conditions.push(`a.bodega_actual_id = $${values.length}`);
    }

    if (filters.tipo) {
      values.push(filters.tipo);
      conditions.push(`a.tipo = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(
        `(a.codigo ILIKE $${values.length} OR COALESCE(a.nro_serie,'') ILIKE $${values.length} OR a.nombre ILIKE $${values.length})`
      );
    }

    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 25 });
    values.push(limit);

    const query = `
      SELECT
        a.id,
        a.codigo,
        a.nro_serie,
        a.tipo,
        a.nombre,
        a.estado,
        a.foto_url,
        a.bodega_actual_id,
        b.nombre AS bodega_nombre
      FROM articulo a
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.nombre ASC, a.codigo ASC
      LIMIT $${values.length}
    `;

    const { rows } = await db.query(query, values);
    return this._resolveActivoRows(rows);
  }

  // ── Full profile of a single article ────────────────────────
  static async getActivoProfile(articuloId) {
    // 1. Main article data
    const articuloResult = await db.query(
      `
      SELECT
        a.*,
        b.nombre AS bodega_nombre,
        p.nombre AS proyecto_nombre,
        u.email_login AS creado_por_email,
        prov.nombre AS proveedor_nombre,
        COALESCE(json_agg(ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
        COALESCE(
          json_agg(
            json_build_object('id', ac.id, 'nombre', ac.nombre, 'url', ac.url, 'creado_en', ac.creado_en)
            ORDER BY ac.creado_en
          ) FILTER (WHERE ac.id IS NOT NULL),
          '[]'
        ) AS certificaciones
      FROM articulo a
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      LEFT JOIN proyectos p ON p.id = a.proyecto_actual_id
      LEFT JOIN usuario u ON u.id = a.creado_por_usuario_id
      LEFT JOIN proveedor prov ON prov.id = a.proveedor_id
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
      LEFT JOIN articulo_certificacion ac ON ac.articulo_id = a.id
      WHERE a.id = $1
      GROUP BY a.id, b.nombre, p.nombre, u.email_login, prov.nombre
      `,
      [articuloId]
    );

    if (!articuloResult.rows.length) {
      throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    }

    const articulo = articuloResult.rows[0];

    // 2. Active custody (if any)
    const custodiaResult = await db.query(
      `
      SELECT
        ca.id, ca.trabajador_id, ca.entrega_id,
        ca.proyecto_id, ca.desde_en, ca.hasta_en, ca.estado,
        p.nombres AS custodio_nombres,
        p.apellidos AS custodio_apellidos,
        proj.nombre AS custodia_ubicacion_nombre,
        EXTRACT(DAY FROM NOW() - ca.desde_en)::int AS dias_en_custodia
      FROM custodia_activo ca
      LEFT JOIN trabajador t ON t.id = ca.trabajador_id
      LEFT JOIN persona p ON p.id = t.persona_id
      LEFT JOIN proyectos proj ON proj.id = ca.proyecto_id
      WHERE ca.articulo_id = $1 AND ca.estado = 'activa'
      LIMIT 1
      `,
      [articuloId]
    );

    // 3. Recent movements (last 20)
    const timelineResult = await db.query(
      `
      SELECT
        ma.id,
        ma.tipo,
        ma.fecha_movimiento,
        ma.notas,
        ma.entrega_id,
        ma.devolucion_id,
        b_orig.nombre AS bodega_origen_nombre,
        b_dest.nombre AS bodega_destino_nombre,
        po.nombre AS proyecto_origen_nombre,
        pd.nombre AS proyecto_destino_nombre,
        u.email_login AS responsable_email,
        e_ref.estado AS estado_entrega,
        d_ref.estado AS estado_devolucion
      FROM movimiento_activo ma
      LEFT JOIN bodegas b_orig ON b_orig.id = ma.bodega_origen_id
      LEFT JOIN bodegas b_dest ON b_dest.id = ma.bodega_destino_id
      LEFT JOIN proyectos po ON po.id = ma.proyecto_origen_id
      LEFT JOIN proyectos pd ON pd.id = ma.proyecto_destino_id
      LEFT JOIN usuario u ON u.id = ma.responsable_usuario_id
      LEFT JOIN entrega e_ref ON e_ref.id = ma.entrega_id
      LEFT JOIN devolucion d_ref ON d_ref.id = ma.devolucion_id
      WHERE ma.articulo_id = $1
      ORDER BY ma.fecha_movimiento DESC
      LIMIT 20
      `,
      [articuloId]
    );

    // 4. Full custody history
    const custodiasResult = await db.query(
      `
      SELECT
        ca.id, ca.trabajador_id, ca.entrega_id,
        ca.proyecto_id, ca.desde_en, ca.hasta_en, ca.estado,
        p.nombres AS custodio_nombres,
        p.apellidos AS custodio_apellidos,
        proj.nombre AS custodia_ubicacion_nombre,
        CASE
          WHEN ca.hasta_en IS NOT NULL THEN EXTRACT(DAY FROM ca.hasta_en - ca.desde_en)::int
          ELSE EXTRACT(DAY FROM NOW() - ca.desde_en)::int
        END AS dias_en_custodia
      FROM custodia_activo ca
      LEFT JOIN trabajador t ON t.id = ca.trabajador_id
      LEFT JOIN persona p ON p.id = t.persona_id
      LEFT JOIN proyectos proj ON proj.id = ca.proyecto_id
      WHERE ca.articulo_id = $1
      ORDER BY ca.desde_en ASC
      `,
      [articuloId]
    );

    // 5. Statistics
    const statsResult = await db.query(
      `
      SELECT
        COUNT(DISTINCT ma_e.entrega_id)::int AS total_entregas,
        COUNT(DISTINCT ma_d.devolucion_id)::int AS total_devoluciones,
        COALESCE(SUM(
          EXTRACT(DAY FROM COALESCE(ca.hasta_en, NOW()) - ca.desde_en)
        )::int, 0) AS dias_total_custodia
      FROM articulo a
      LEFT JOIN movimiento_activo ma_e ON ma_e.articulo_id = a.id AND ma_e.entrega_id IS NOT NULL
      LEFT JOIN movimiento_activo ma_d ON ma_d.articulo_id = a.id AND ma_d.devolucion_id IS NOT NULL
      LEFT JOIN custodia_activo ca ON ca.articulo_id = a.id
      WHERE a.id = $1
      `,
      [articuloId]
    );

    return {
      ...articulo,
      foto_url: await resolveImageUrl(articulo.foto_url),
      custodia_activa: custodiaResult.rows[0] || null,
      timeline: timelineResult.rows,
      custodias: custodiasResult.rows,
      estadisticas: statsResult.rows[0] || { total_entregas: 0, total_devoluciones: 0, dias_total_custodia: 0 },
    };
  }

  // ── Movements for a single article (paginated) ───────────────
  static async getAssetMovements(articuloId, filters = {}) {
    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 500, fallback: 100 });
    const offset = parseBoundedInteger(filters.offset, { min: 0, max: 1000000, fallback: 0 });

    const query = `
      SELECT
        ma.*,
        b_orig.nombre AS bodega_origen_nombre,
        b_dest.nombre AS bodega_destino_nombre,
        po.nombre AS proyecto_origen_nombre,
        pd.nombre AS proyecto_destino_nombre,
        u.email_login AS responsable_email
      FROM movimiento_activo ma
      LEFT JOIN bodegas b_orig ON b_orig.id = ma.bodega_origen_id
      LEFT JOIN bodegas b_dest ON b_dest.id = ma.bodega_destino_id
      LEFT JOIN proyectos po ON po.id = ma.proyecto_origen_id
      LEFT JOIN proyectos pd ON pd.id = ma.proyecto_destino_id
      LEFT JOIN usuario u ON u.id = ma.responsable_usuario_id
      WHERE ma.articulo_id = $1
      ORDER BY ma.fecha_movimiento DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await db.query(query, [articuloId, limit, offset]);
    return rows;
  }

  // ── Relocate article between bodegas ────────────────────────
  static async reubicarActivo(articuloId, { bodega_destino_id, notas }, usuarioId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const artResult = await client.query(
        'SELECT id, estado, bodega_actual_id FROM articulo WHERE id = $1 FOR UPDATE',
        [articuloId]
      );
      if (!artResult.rows.length) {
        throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
      }

      const art = artResult.rows[0];
      if (art.estado !== 'en_stock') {
        throw buildError(
          'Solo se pueden reubicar artículos en estado en_stock',
          422,
          'INVALID_STATE_FOR_RELOCATION'
        );
      }

      if (art.bodega_actual_id === bodega_destino_id) {
        throw buildError(
          'La bodega destino es igual a la bodega actual',
          422,
          'SAME_LOCATION'
        );
      }

      const ubResult = await client.query('SELECT id FROM bodegas WHERE id = $1', [bodega_destino_id]);
      if (!ubResult.rows.length) {
        throw buildError('Bodega destino no encontrada', 404, 'UBICACION_NOT_FOUND');
      }

      await client.query(
        'UPDATE articulo SET bodega_actual_id = $1, proyecto_actual_id = NULL WHERE id = $2',
        [bodega_destino_id, articuloId]
      );

      await client.query(
        `INSERT INTO movimiento_activo
          (articulo_id, tipo, bodega_origen_id, bodega_destino_id, responsable_usuario_id, notas)
         VALUES ($1, 'reubicacion', $2, $3, $4, $5)`,
        [articuloId, art.bodega_actual_id, bodega_destino_id, usuarioId, notas || null]
      );

      await client.query('COMMIT');

      return { id: articuloId, bodega_actual_id: bodega_destino_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── Stock summary grouped by article name + location ────────
  static async getStockSummary(filters = {}) {
    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 50 });

    const query = `
      SELECT
        a.nombre                                                       AS articulo_nombre,
        COALESCE(b.nombre, '—')                                        AS ubicacion_nombre,
        COUNT(*) FILTER (WHERE a.estado = 'en_stock')::int             AS cantidad_disponible,
        COUNT(*) FILTER (WHERE a.estado = 'asignado')::int             AS cantidad_reservada
      FROM articulo a
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      GROUP BY a.nombre, b.nombre
      HAVING COUNT(*) FILTER (WHERE a.estado IN ('en_stock', 'asignado')) > 0
      ORDER BY cantidad_disponible DESC, a.nombre ASC
      LIMIT $1
    `;

    const { rows } = await db.query(query, [limit]);
    return rows;
  }

  // ── Recent movements across all activos ─────────────────────
  static async getMovimientosActivo(filters = {}) {
    const limit = parseBoundedInteger(filters.limit, { min: 1, max: 200, fallback: 25 });

    const query = `
      SELECT
        ma.id,
        ma.fecha_movimiento,
        ma.tipo,
        a.codigo                                               AS activo_codigo,
        a.nombre                                               AS articulo_nombre,
        COALESCE(b_dest.nombre, p_dest.nombre, '—')            AS ubicacion_destino_nombre
      FROM movimiento_activo ma
      JOIN articulo a ON a.id = ma.articulo_id
      LEFT JOIN bodegas   b_dest ON b_dest.id = ma.bodega_destino_id
      LEFT JOIN proyectos p_dest ON p_dest.id = ma.proyecto_destino_id
      ORDER BY ma.fecha_movimiento DESC
      LIMIT $1
    `;

    const { rows } = await db.query(query, [limit]);
    return rows;
  }

  // ── Audit log ────────────────────────────────────────────────
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
}

module.exports = InventarioService;
