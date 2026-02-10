const db = require('../db');

class InventarioService {
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

    const { rows } = await db.query(query, values);
    return rows;
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
        us.email_login AS responsable_email
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
