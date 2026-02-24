const db = require('../db');
const ArticuloModel = require('../models/articulo');

const PERMANENT_DELETE_DEPENDENCIES = [
  { key: 'compra_detalle', table: 'compra_detalle' },
  { key: 'lote', table: 'lote' },
  { key: 'activo', table: 'activo' },
  { key: 'stock', table: 'stock' },
  { key: 'entrega_detalle', table: 'entrega_detalle' },
  { key: 'devolucion_detalle', table: 'devolucion_detalle' },
  { key: 'movimiento_stock', table: 'movimiento_stock' },
];

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

  static async removePermanent(id) {
    const existing = await ArticuloModel.findById(id);
    if (!existing) {
      const error = new Error('Articulo not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.estado !== 'inactivo') {
      const error = new Error(
        'Para eliminar permanentemente, primero debes desactivar el artículo.'
      );
      error.statusCode = 409;
      error.errors = [
        {
          code: 'ARTICULO_DEBE_ESTAR_INACTIVO',
          details: { estado_actual: existing.estado },
        },
      ];
      throw error;
    }

    const dependencyCounts = {};

    for (const dependency of PERMANENT_DELETE_DEPENDENCIES) {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS total FROM ${dependency.table} WHERE articulo_id = $1`,
        [id]
      );

      const total = Number(rows[0]?.total || 0);
      if (total > 0) {
        dependencyCounts[dependency.key] = total;
      }
    }

    if (Object.keys(dependencyCounts).length > 0) {
      const error = new Error('No se puede eliminar permanentemente un artículo con trazabilidad.');
      error.statusCode = 409;
      error.errors = [
        {
          code: 'ARTICULO_REFERENCIADO',
          details: dependencyCounts,
        },
      ];
      throw error;
    }

    await db.query('DELETE FROM articulo WHERE id = $1', [id]);

    return {
      id,
      deleted_permanently: true,
    };
  }
}

module.exports = ArticulosService;
