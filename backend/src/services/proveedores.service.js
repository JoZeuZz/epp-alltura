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

  static async remove(id) {
    const existing = await db.query('SELECT id FROM proveedor WHERE id = $1 LIMIT 1', [id]);
    if (!existing.rows.length) {
      throw buildError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND');
    }

    // Guard: bloquear si tiene artículos asociados
    const { rows: conArticulos } = await db.query(
      `SELECT COUNT(*) AS total FROM articulo WHERE proveedor_id = $1`,
      [id]
    );

    if (parseInt(conArticulos[0].total, 10) > 0) {
      throw buildError(
        'El proveedor tiene artículos registrados. Reasigna o elimina los artículos antes de desactivar el proveedor.',
        409,
        'PROVEEDOR_HAS_ARTICULOS'
      );
    }

    await db.query(`UPDATE proveedor SET estado = 'inactivo' WHERE id = $1`, [id]);
    await writeAuditEvent({
      entidadTipo: 'proveedor',
      entidadId: id,
      accion: 'eliminar',
      usuarioId: null,
      diff: { estado: 'inactivo' },
    }).catch((err) => logger.warn('Audit proveedor eliminar failed', { id, error: err.message }));
    return { id, estado: 'inactivo' };
  }
}

module.exports = ProveedoresService;
