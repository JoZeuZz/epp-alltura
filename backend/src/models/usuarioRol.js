const db = require('../db');

class UsuarioRolModel {
  static async add(usuarioId, rolId) {
    const { rows } = await db.query(
      `
      INSERT INTO usuario_rol (usuario_id, rol_id)
      VALUES ($1, $2)
      ON CONFLICT (usuario_id, rol_id) DO NOTHING
      RETURNING *
      `,
      [usuarioId, rolId]
    );

    return rows[0] || null;
  }

  static async remove(usuarioId, rolId) {
    const result = await db.query(
      'DELETE FROM usuario_rol WHERE usuario_id = $1 AND rol_id = $2',
      [usuarioId, rolId]
    );
    return result.rowCount > 0;
  }

  static async getRolesByUsuarioId(usuarioId) {
    const { rows } = await db.query(
      `
      SELECT r.*
      FROM usuario_rol ur
      INNER JOIN rol r ON r.id = ur.rol_id
      WHERE ur.usuario_id = $1
      ORDER BY r.nombre
      `,
      [usuarioId]
    );

    return rows;
  }

  static async replaceRoles(usuarioId, roleIds = []) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM usuario_rol WHERE usuario_id = $1', [usuarioId]);

      for (const roleId of roleIds) {
        await client.query(
          `
          INSERT INTO usuario_rol (usuario_id, rol_id)
          VALUES ($1, $2)
          ON CONFLICT (usuario_id, rol_id) DO NOTHING
          `,
          [usuarioId, roleId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async hasRole(usuarioId, roleName) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM usuario_rol ur
      INNER JOIN rol r ON r.id = ur.rol_id
      WHERE ur.usuario_id = $1 AND r.nombre = $2
      LIMIT 1
      `,
      [usuarioId, roleName]
    );

    return rows.length > 0;
  }
}

module.exports = UsuarioRolModel;
