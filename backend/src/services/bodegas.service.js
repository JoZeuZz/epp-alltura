const BodegaModel = require('../models/bodega');

const { buildError } = require('../lib/errors');

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
    return BodegaModel.create(data);
  }

  static async update(id, data) {
    const current = await BodegaModel.findById(id);
    if (!current) throw buildError('Bodega no encontrada', 404);
    const updated = await BodegaModel.update(id, data);
    if (!updated) throw buildError('Bodega no encontrada', 404);
    return updated;
  }

  static async remove(id) {
    const existing = await BodegaModel.findById(id);
    if (!existing) throw buildError('Bodega no encontrada', 404);
    return BodegaModel.update(id, { estado: 'inactivo' });
  }
}

module.exports = BodegasService;
