const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class BodegaModel {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.direccion = data.direccion;
    this.ciudad = data.ciudad ?? null;
    this.descripcion = data.descripcion;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async create({ nombre, direccion, ciudad, descripcion, estado = 'activo' }) {
    const { rows } = await db.query(
      `INSERT INTO bodegas (nombre, direccion, ciudad, descripcion, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, direccion || null, ciudad || null, descripcion || null, estado]
    );
    return new BodegaModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM bodegas WHERE id = $1', [id]);
    return rows.length ? new BodegaModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`nombre ILIKE $${values.length}`);
    }

    let query = 'SELECT * FROM bodegas';
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    values.push(limit, offset);
    query += ` ORDER BY creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((r) => new BodegaModel(r));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      nombre: fields.nombre,
      direccion: fields.direccion,
      ciudad: fields.ciudad,
      descripcion: fields.descripcion,
      estado: fields.estado,
    });

    if (!clause) return BodegaModel.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE bodegas SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows.length ? new BodegaModel(rows[0]) : null;
  }
}

module.exports = BodegaModel;
