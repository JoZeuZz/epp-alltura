const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class PersonaModel {
  constructor(data) {
    this.id = data.id;
    this.rut = data.rut;
    this.nombres = data.nombres;
    this.apellidos = data.apellidos;
    this.telefono = data.telefono;
    this.email = data.email;
    this.foto_url = data.foto_url;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async create({ rut, nombres, apellidos, telefono, email, foto_url, estado = 'activo' }) {
    const { rows } = await db.query(
      `
      INSERT INTO persona (rut, nombres, apellidos, telefono, email, foto_url, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [rut, nombres, apellidos, telefono || null, email || null, foto_url || null, estado]
    );

    return new PersonaModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM persona WHERE id = $1', [id]);
    return rows.length ? new PersonaModel(rows[0]) : null;
  }

  static async findByRut(rut) {
    const { rows } = await db.query('SELECT * FROM persona WHERE rut = $1', [rut]);
    return rows.length ? new PersonaModel(rows[0]) : null;
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
      conditions.push(
        `(rut ILIKE $${values.length} OR nombres ILIKE $${values.length} OR apellidos ILIKE $${values.length})`
      );
    }

    let query = 'SELECT * FROM persona';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += ` ORDER BY creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((row) => new PersonaModel(row));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      rut: fields.rut,
      nombres: fields.nombres,
      apellidos: fields.apellidos,
      telefono: fields.telefono,
      email: fields.email,
      foto_url: fields.foto_url,
      estado: fields.estado,
    });

    if (!clause) {
      return PersonaModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE persona SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new PersonaModel(rows[0]) : null;
  }
}

module.exports = PersonaModel;
