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
    this.ubicacion_actual_id = data.ubicacion_actual_id;
    this.fecha_compra = data.fecha_compra;
    this.fecha_vencimiento = data.fecha_vencimiento;
    this.creado_en = data.creado_en;
  }

  static async create(fields) {
    const { rows } = await db.query(
      `
      INSERT INTO activo (
        articulo_id, compra_detalle_id, nro_serie, codigo, valor, estado,
        ubicacion_actual_id, fecha_compra, fecha_vencimiento
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        fields.articulo_id,
        fields.compra_detalle_id || null,
        fields.nro_serie || null,
        fields.codigo,
        fields.valor || null,
        fields.estado || 'en_stock',
        fields.ubicacion_actual_id,
        fields.fecha_compra || null,
        fields.fecha_vencimiento || null,
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
    const { estado, articulo_id, ubicacion_actual_id, search } = filters;
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

    if (ubicacion_actual_id) {
      values.push(ubicacion_actual_id);
      conditions.push(`a.ubicacion_actual_id = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(a.codigo ILIKE $${values.length} OR a.nro_serie ILIKE $${values.length})`);
    }

    let query = `
      SELECT a.*, ar.nombre AS articulo_nombre, u.nombre AS ubicacion_nombre
      FROM activo a
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      INNER JOIN ubicacion u ON u.id = a.ubicacion_actual_id
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
      ubicacion_actual_id: fields.ubicacion_actual_id,
      fecha_compra: fields.fecha_compra,
      fecha_vencimiento: fields.fecha_vencimiento,
    });

    if (!clause) {
      return ActivoModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE activo SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new ActivoModel(rows[0]) : null;
  }

  static async moveToLocation(id, ubicacionDestinoId) {
    const { rows } = await db.query(
      `
      UPDATE activo
      SET ubicacion_actual_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [ubicacionDestinoId, id]
    );
    return rows.length ? new ActivoModel(rows[0]) : null;
  }
}

module.exports = ActivoModel;
