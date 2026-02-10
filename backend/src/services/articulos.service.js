const ArticuloModel = require('../models/articulo');

class ArticulosService {
  static async list(filters = {}) {
    return ArticuloModel.findAll(filters);
  }

  static async getById(id) {
    const articulo = await ArticuloModel.findById(id);
    if (!articulo) {
      const error = new Error('Articulo not found');
      error.statusCode = 404;
      throw error;
    }
    return articulo;
  }

  static async create(data) {
    return ArticuloModel.create(data);
  }

  static async update(id, data) {
    const updated = await ArticuloModel.update(id, data);
    if (!updated) {
      const error = new Error('Articulo not found');
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  static async remove(id) {
    const existing = await ArticuloModel.findById(id);
    if (!existing) {
      const error = new Error('Articulo not found');
      error.statusCode = 404;
      throw error;
    }

    return ArticuloModel.update(id, { estado: 'inactivo' });
  }
}

module.exports = ArticulosService;
