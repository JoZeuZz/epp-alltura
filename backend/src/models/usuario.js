const db = require('../db');
const bcrypt = require('bcrypt');

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
