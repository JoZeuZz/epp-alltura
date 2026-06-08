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

  static async exportAll() {
    const { rows } = await db.query(
      'SELECT * FROM bodegas ORDER BY creado_en ASC'
    );
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
        try {
          const result = await client.query(`
            INSERT INTO bodegas (id, nombre, direccion, ciudad, descripcion, estado, creado_en)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
              nombre      = EXCLUDED.nombre,
              direccion   = EXCLUDED.direccion,
              ciudad      = EXCLUDED.ciudad,
              descripcion = EXCLUDED.descripcion,
              estado      = EXCLUDED.estado
            RETURNING (xmax = 0) AS was_inserted
          `, [row.id, row.nombre, row.direccion ?? null, row.ciudad ?? null,
              row.descripcion ?? null, row.estado ?? 'activo',
              row.creado_en ?? new Date().toISOString()]);

          if (result.rows[0].was_inserted) inserted++;
          else updated++;
        } catch (err) {
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

module.exports = BodegaModel;
