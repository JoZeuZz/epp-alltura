const BodegaModel = require('../models/bodega');
const db = require('../db');
const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { logger } = require('../lib/logger');

class BodegasService {
  static async list(filters = {}) {
    return BodegaModel.findAll(filters);
  }

  static async getById(id) {
    const bodega = await BodegaModel.findById(id);
    if (!bodega) throw buildError('Bodega no encontrada', 404);
    return bodega;
  }

  static async create(data) {
    const result = await BodegaModel.create(data);
    await writeAuditEvent({
      entidadTipo: 'bodega',
      entidadId: result.id,
      accion: 'crear',
      usuarioId: null,
      diff: { nombre: result.nombre },
    }).catch((err) => logger.warn('Audit bodega crear failed', { id: result.id, error: err.message }));
    return result;
  }

  static async update(id, data) {
    const current = await BodegaModel.findById(id);
    if (!current) throw buildError('Bodega no encontrada', 404);
    const updated = await BodegaModel.update(id, data);
    if (!updated) throw buildError('Bodega no encontrada', 404);
    await writeAuditEvent({
      entidadTipo: 'bodega',
      entidadId: id,
      accion: 'actualizar',
      usuarioId: null,
      diff: data,
    }).catch((err) => logger.warn('Audit bodega actualizar failed', { id, error: err.message }));
    return updated;
  }

  static async remove(id) {
    const existing = await BodegaModel.findById(id);
    if (!existing) throw buildError('Bodega no encontrada', 404);

    // Guard: bloquear si hay artículos en stock en esta bodega
    const { rows: stock } = await db.query(
      `SELECT COUNT(*) AS total
       FROM articulo
       WHERE bodega_actual_id = $1
         AND estado = 'en_stock'`,
      [id]
    );

    if (parseInt(stock[0].total, 10) > 0) {
      throw buildError(
        'La bodega tiene artículos en stock. Redistribuye o da de baja los artículos antes de desactivar la bodega.',
        409,
        'BODEGA_HAS_STOCK'
      );
    }

    const result = await BodegaModel.update(id, { estado: 'inactivo' });
    await writeAuditEvent({
      entidadTipo: 'bodega',
      entidadId: id,
      accion: 'eliminar',
      usuarioId: null,
      diff: { estado: 'inactivo' },
    }).catch((err) => logger.warn('Audit bodega eliminar failed', { id, error: err.message }));
    return result;
  }
}

module.exports = BodegasService;
