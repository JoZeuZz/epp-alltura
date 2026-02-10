const UbicacionModel = require('../models/ubicacion');

class UbicacionesService {
  static async list(filters = {}) {
    return UbicacionModel.findAll(filters);
  }

  static async getById(id) {
    const ubicacion = await UbicacionModel.findById(id);
    if (!ubicacion) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }
    return ubicacion;
  }

  static async create(data) {
    return UbicacionModel.create(data);
  }

  static async update(id, data) {
    const updated = await UbicacionModel.update(id, data);
    if (!updated) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  static async remove(id) {
    const existing = await UbicacionModel.findById(id);
    if (!existing) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }

    return UbicacionModel.update(id, { estado: 'inactivo' });
  }
}

module.exports = UbicacionesService;
