const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class ActivoModel {
  constructor(data) {
    this.id = data.id;
    this.articulo_id = data.articulo_id;
    this.compra_detalle_id = data.compra_detalle_id;
    this.nro_serie = data.nro_serie;
    this.codigo = data.codigo;
    this.valor = data.valor;
    this.estado = data.estado;
    this.bodega_actual_id = data.bodega_actual_id;
    this.proyecto_actual_id = data.proyecto_actual_id;
    this.fecha_compra = data.fecha_compra;
    this.fecha_vencimiento = data.fecha_vencimiento;
    this.foto_url = data.foto_url;
    this.creado_en = data.creado_en;
  }

  static async create(fields) {
    const { rows } = await db.query(
      `
      INSERT INTO activo (
        articulo_id, compra_detalle_id, nro_serie, codigo, valor, estado,
        bodega_actual_id, proyecto_actual_id, fecha_compra, fecha_vencimiento, foto_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        fields.articulo_id,
        fields.compra_detalle_id || null,
        fields.nro_serie || null,
        fields.codigo,
        fields.valor || null,
        fields.estado || 'en_stock',
        fields.bodega_actual_id || null,
        fields.proyecto_actual_id || null,
        fields.fecha_compra || null,
        fields.fecha_vencimiento || null,
        fields.foto_url || null,
      ]
    );

    return new ActivoModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM activo WHERE id = $1', [id]);
    return rows.length ? new ActivoModel(rows[0]) : null;
  }

  static async findByCodigo(codigo) {
    const { rows } = await db.query('SELECT * FROM activo WHERE codigo = $1', [codigo]);
    return rows.length ? new ActivoModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, articulo_id, bodega_actual_id, proyecto_actual_id, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (articulo_id) {
      values.push(articulo_id);
      conditions.push(`a.articulo_id = $${values.length}`);
    }

    if (bodega_actual_id) {
      values.push(bodega_actual_id);
      conditions.push(`a.bodega_actual_id = $${values.length}`);
    }

    if (proyecto_actual_id) {
      values.push(proyecto_actual_id);
      conditions.push(`a.proyecto_actual_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(a.codigo ILIKE $${values.length} OR a.nro_serie ILIKE $${values.length})`);
    }

    let query = `
      SELECT a.*,
        ar.nombre AS articulo_nombre,
        COALESCE(b.nombre, p.nombre) AS ubicacion_nombre
      FROM activo a
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN bodegas b ON b.id = a.bodega_actual_id
      LEFT JOIN proyectos p ON p.id = a.proyecto_actual_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += ` ORDER BY a.creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      articulo_id: fields.articulo_id,
      compra_detalle_id: fields.compra_detalle_id,
      nro_serie: fields.nro_serie,
      codigo: fields.codigo,
      valor: fields.valor,
      estado: fields.estado,
      bodega_actual_id: fields.bodega_actual_id,
      proyecto_actual_id: fields.proyecto_actual_id,
      fecha_compra: fields.fecha_compra,
      fecha_vencimiento: fields.fecha_vencimiento,
      foto_url: fields.foto_url,
    });

    if (!clause) return ActivoModel.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE activo SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows.length ? new ActivoModel(rows[0]) : null;
  }

}

module.exports = ActivoModel;
