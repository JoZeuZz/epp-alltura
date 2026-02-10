const db = require('../db');
const PersonaModel = require('../models/persona');
const TrabajadorModel = require('../models/trabajador');

class TrabajadoresService {
  static async list(filters = {}) {
    return TrabajadorModel.findAll(filters);
  }

  static async getById(id) {
    const { rows } = await db.query(
      `
      SELECT
        t.*,
        p.rut,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.email,
        u.email_login
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN usuario u ON u.id = t.usuario_id
      WHERE t.id = $1
      `,
      [id]
    );

    if (!rows.length) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    return rows[0];
  }

  static async create(data) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      let personaId = data.persona_id || null;

      if (!personaId) {
        if (!data.rut || !data.nombres || !data.apellidos) {
          const error = new Error('rut, nombres y apellidos son obligatorios si no se informa persona_id');
          error.statusCode = 400;
          throw error;
        }

        const existingPersona = await PersonaModel.findByRut(data.rut);
        if (existingPersona) {
          const error = new Error('Ya existe una persona con ese RUT');
          error.statusCode = 400;
          throw error;
        }

        const personaResult = await client.query(
          `
          INSERT INTO persona (rut, nombres, apellidos, telefono, email, estado)
          VALUES ($1, $2, $3, $4, $5, 'activo')
          RETURNING id
          `,
          [data.rut, data.nombres, data.apellidos, data.telefono || null, data.email || null]
        );
        personaId = personaResult.rows[0].id;
      } else if (data.rut || data.nombres || data.apellidos || data.telefono || data.email) {
        await client.query(
          `
          UPDATE persona
          SET
            rut = COALESCE($1, rut),
            nombres = COALESCE($2, nombres),
            apellidos = COALESCE($3, apellidos),
            telefono = COALESCE($4, telefono),
            email = COALESCE($5, email)
          WHERE id = $6
          `,
          [
            data.rut || null,
            data.nombres || null,
            data.apellidos || null,
            data.telefono || null,
            data.email || null,
            personaId,
          ]
        );
      }

      const trabajadorResult = await client.query(
        `
        INSERT INTO trabajador (
          persona_id, usuario_id, codigo_empleado, cargo, fecha_ingreso, fecha_salida, estado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          personaId,
          data.usuario_id || null,
          data.codigo_empleado || null,
          data.cargo || null,
          data.fecha_ingreso || null,
          data.fecha_salida || null,
          data.estado || 'activo',
        ]
      );

      await client.query('COMMIT');
      return this.getById(trabajadorResult.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const existing = await TrabajadorModel.findById(id);
    if (!existing) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (data.rut || data.nombres || data.apellidos || data.telefono || data.email || data.persona_estado) {
        await client.query(
          `
          UPDATE persona
          SET
            rut = COALESCE($1, rut),
            nombres = COALESCE($2, nombres),
            apellidos = COALESCE($3, apellidos),
            telefono = COALESCE($4, telefono),
            email = COALESCE($5, email),
            estado = COALESCE($6, estado)
          WHERE id = $7
          `,
          [
            data.rut || null,
            data.nombres || null,
            data.apellidos || null,
            data.telefono || null,
            data.email || null,
            data.persona_estado || null,
            existing.persona_id,
          ]
        );
      }

      const fields = {
        usuario_id: data.usuario_id,
        codigo_empleado: data.codigo_empleado,
        cargo: data.cargo,
        fecha_ingreso: data.fecha_ingreso,
        fecha_salida: data.fecha_salida,
        estado: data.estado,
      };

      const setParts = [];
      const values = [];
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
          values.push(value);
          setParts.push(`${key} = $${values.length}`);
        }
      });

      if (setParts.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE trabajador SET ${setParts.join(', ')} WHERE id = $${values.length}`,
          values
        );
      }

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async remove(id) {
    const existing = await TrabajadorModel.findById(id);
    if (!existing) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    await TrabajadorModel.update(id, { estado: 'inactivo' });
    return { id, estado: 'inactivo' };
  }
}

module.exports = TrabajadoresService;
