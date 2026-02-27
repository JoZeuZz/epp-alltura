const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class TrabajadorModel {
  constructor(data) {
    this.id = data.id;
    this.persona_id = data.persona_id;
    this.usuario_id = data.usuario_id;
    this.cargo = data.cargo;
    this.fecha_ingreso = data.fecha_ingreso;
    this.fecha_salida = data.fecha_salida;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async create({
    persona_id,
    usuario_id,
    cargo,
    fecha_ingreso,
    fecha_salida,
    estado = 'activo',
  }) {
    const { rows } = await db.query(
      `
      INSERT INTO trabajador (
        persona_id, usuario_id, cargo, fecha_ingreso, fecha_salida, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        persona_id,
        usuario_id || null,
        cargo || null,
        fecha_ingreso || null,
        fecha_salida || null,
        estado,
      ]
    );

    return new TrabajadorModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM trabajador WHERE id = $1', [id]);
    return rows.length ? new TrabajadorModel(rows[0]) : null;
  }

  static async findByPersonaId(personaId) {
    const { rows } = await db.query('SELECT * FROM trabajador WHERE persona_id = $1', [personaId]);
    return rows.length ? new TrabajadorModel(rows[0]) : null;
  }

  static async findByUsuarioId(usuarioId) {
    const { rows } = await db.query('SELECT * FROM trabajador WHERE usuario_id = $1', [usuarioId]);
    return rows.length ? new TrabajadorModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`t.estado = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(p.rut ILIKE $${values.length} OR p.nombres ILIKE $${values.length} OR p.apellidos ILIKE $${values.length})`
      );
    }

    let query = `
      SELECT t.*, p.rut, p.nombres, p.apellidos
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += ` ORDER BY t.creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      persona_id: fields.persona_id,
      usuario_id: fields.usuario_id,
      cargo: fields.cargo,
      fecha_ingreso: fields.fecha_ingreso,
      fecha_salida: fields.fecha_salida,
      estado: fields.estado,
    });

    if (!clause) {
      return TrabajadorModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE trabajador SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new TrabajadorModel(rows[0]) : null;
  }
}

module.exports = TrabajadorModel;
