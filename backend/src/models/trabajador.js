const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class TrabajadorModel {
  constructor(data) {
    this.id = data.id;
    this.persona_id = data.persona_id;
    this.cargo = data.cargo;
    this.fecha_ingreso = data.fecha_ingreso;
    this.fecha_salida = data.fecha_salida;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM trabajador WHERE id = $1', [id]);
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

  static async exportAll() {
    const { rows } = await db.query(`
      SELECT t.*,
        json_build_object(
          'id', p.id, 'rut', p.rut, 'nombres', p.nombres,
          'apellidos', p.apellidos, 'telefono', p.telefono,
          'email', p.email, 'foto_url', p.foto_url,
          'estado', p.estado, 'creado_en', p.creado_en
        ) AS persona
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
      ORDER BY t.creado_en ASC
    `);
    return rows;
  }

  static async upsertBatch(rows) {
    const client = await db.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query('BEGIN');

      for (const row of rows) {
        await client.query('SAVEPOINT row_save');
        try {
          const p = row.persona;
          if (!p || !p.id) throw new Error('persona.id requerido');

          // upsert persona
          await client.query(`
            INSERT INTO persona (id, rut, nombres, apellidos, telefono, email, foto_url, estado, creado_en)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO UPDATE SET
              rut       = EXCLUDED.rut,
              nombres   = EXCLUDED.nombres,
              apellidos = EXCLUDED.apellidos,
              telefono  = EXCLUDED.telefono,
              email     = EXCLUDED.email,
              foto_url  = EXCLUDED.foto_url,
              estado    = EXCLUDED.estado
          `, [p.id, p.rut, p.nombres, p.apellidos, p.telefono ?? null,
              p.email ?? null, p.foto_url ?? null, p.estado ?? 'activo',
              p.creado_en ?? new Date().toISOString()]);

          // upsert trabajador
          const result = await client.query(`
            INSERT INTO trabajador (id, persona_id, cargo, fecha_ingreso, fecha_salida, estado, creado_en)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
              persona_id    = EXCLUDED.persona_id,
              cargo         = EXCLUDED.cargo,
              fecha_ingreso = EXCLUDED.fecha_ingreso,
              fecha_salida  = EXCLUDED.fecha_salida,
              estado        = EXCLUDED.estado
            RETURNING (xmax = 0) AS was_inserted
          `, [row.id, row.persona_id, row.cargo ?? null, row.fecha_ingreso ?? null,
              row.fecha_salida ?? null, row.estado ?? 'activo',
              row.creado_en ?? new Date().toISOString()]);

          if (result.rows[0].was_inserted) inserted++;
          else updated++;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT row_save');
          errors.push({ id: row.id, error: err.message });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }
}

module.exports = TrabajadorModel;
