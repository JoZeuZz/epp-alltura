const db = require('../db');
const bcrypt = require('bcrypt');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class UsuarioModel {
  constructor(data) {
    this.id = data.id;
    this.persona_id = data.persona_id;
    this.email_login = data.email_login;
    this.password_hash = data.password_hash;
    this.estado = data.estado;
    this.ultimo_login_en = data.ultimo_login_en;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
    this.rut = data.rut;
    this.nombres = data.nombres;
    this.apellidos = data.apellidos;
    this.roles = data.roles || [];
  }

  static async create({ persona_id, email_login, password_hash, estado = 'activo' }) {
    const { rows } = await db.query(
      `
      INSERT INTO usuario (persona_id, email_login, password_hash, estado)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [persona_id || null, email_login, password_hash, estado]
    );

    return new UsuarioModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM usuario WHERE id = $1', [id]);
    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  static async findByIdWithRoles(id) {
    const { rows } = await db.query(
      `
      SELECT
        u.*,
        p.rut,
        p.nombres,
        p.apellidos,
        ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
      FROM usuario u
      LEFT JOIN persona p ON p.id = u.persona_id
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id
      WHERE u.id = $1
      GROUP BY u.id, p.id
      `,
      [id]
    );

    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  static async findByEmailLogin(emailLogin) {
    const { rows } = await db.query('SELECT * FROM usuario WHERE email_login = $1', [emailLogin]);
    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  static async findByEmailLoginWithRoles(emailLogin) {
    const { rows } = await db.query(
      `
      SELECT
        u.*,
        p.rut,
        p.nombres,
        p.apellidos,
        ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
      FROM usuario u
      LEFT JOIN persona p ON p.id = u.persona_id
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id
      WHERE u.email_login = $1
      GROUP BY u.id, p.id
      `,
      [emailLogin]
    );

    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, role, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`u.estado = $${values.length}`);
    }

    if (role) {
      values.push(role);
      conditions.push(`r.nombre = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(u.email_login ILIKE $${values.length} OR p.rut ILIKE $${values.length} OR p.nombres ILIKE $${values.length} OR p.apellidos ILIKE $${values.length})`
      );
    }

    let query = `
      SELECT
        u.*,
        p.rut,
        p.nombres,
        p.apellidos,
        ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
      FROM usuario u
      LEFT JOIN persona p ON p.id = u.persona_id
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += `
      GROUP BY u.id, p.id
      ORDER BY u.creado_en DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `;

    const { rows } = await db.query(query, values);
    return rows.map((row) => new UsuarioModel(row));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      persona_id: fields.persona_id,
      email_login: fields.email_login,
      password_hash: fields.password_hash,
      estado: fields.estado,
      ultimo_login_en: fields.ultimo_login_en,
    });

    if (!clause) {
      return UsuarioModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE usuario SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  static async updateLastLogin(id) {
    const { rows } = await db.query(
      `
      UPDATE usuario
      SET ultimo_login_en = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    return rows.length ? new UsuarioModel(rows[0]) : null;
  }

  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password_hash);
  }

  static async updatePasswordHash(id, passwordHash) {
    const { rows } = await db.query(
      `
      UPDATE usuario
      SET password_hash = $1
      WHERE id = $2
      RETURNING *
      `,
      [passwordHash, id]
    );

    return rows.length ? new UsuarioModel(rows[0]) : null;
  }
}

module.exports = UsuarioModel;
