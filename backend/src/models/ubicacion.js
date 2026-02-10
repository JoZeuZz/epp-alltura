const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class UbicacionModel {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.tipo = data.tipo;
    this.cliente = data.cliente;
    this.direccion = data.direccion;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
  }

  static async create({ nombre, tipo, cliente, direccion, estado = 'activo' }) {
    const { rows } = await db.query(
      `
      INSERT INTO ubicacion (nombre, tipo, cliente, direccion, estado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [nombre, tipo, cliente || null, direccion || null, estado]
    );

    return new UbicacionModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM ubicacion WHERE id = $1', [id]);
    return rows.length ? new UbicacionModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, tipo, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (tipo) {
      values.push(tipo);
      conditions.push(`tipo = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(nombre ILIKE $${values.length} OR cliente ILIKE $${values.length})`);
    }

    let query = 'SELECT * FROM ubicacion';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += ` ORDER BY creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((row) => new UbicacionModel(row));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      nombre: fields.nombre,
      tipo: fields.tipo,
      cliente: fields.cliente,
      direccion: fields.direccion,
      estado: fields.estado,
    });

    if (!clause) {
      return UbicacionModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE ubicacion SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new UbicacionModel(rows[0]) : null;
  }
}

module.exports = UbicacionModel;
