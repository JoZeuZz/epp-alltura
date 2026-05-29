const db = require('../db');

const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { logger } = require('../lib/logger');

class ProveedoresService {
  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(nombre ILIKE $${values.length} OR COALESCE(rut, '') ILIKE $${values.length})`);
    }

    let query = 'SELECT * FROM proveedor';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY nombre ASC';

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async create(payload) {
    const existing = await db.query('SELECT id FROM proveedor WHERE nombre = $1 LIMIT 1', [payload.nombre]);
    if (existing.rows.length) {
      throw buildError('Ya existe un proveedor con ese nombre', 400);
    }

    const { rows } = await db.query(
      `
      INSERT INTO proveedor (nombre, rut, email, telefono, estado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        payload.nombre,
        payload.rut || null,
        payload.email || null,
        payload.telefono || null,
        payload.estado || 'activo',
      ]
    );

    await writeAuditEvent({
      entidadTipo: 'proveedor',
      entidadId: rows[0].id,
      accion: 'crear',
      usuarioId: null,
      diff: { nombre: rows[0].nombre },
    }).catch((err) => logger.warn('Audit proveedor crear failed', { id: rows[0].id, error: err.message }));
    return rows[0];
  }
}

module.exports = ProveedoresService;
