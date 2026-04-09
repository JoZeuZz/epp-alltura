const ComprasService = require('../services/compras.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class ComprasController {
  static async list(req, res, next) {
    try {
      const data = await ComprasService.list(req.query || {});
      return sendSuccess(res, { message: 'Compras obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing compras:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await ComprasService.getById(req.params.id);
      return sendSuccess(res, { message: 'Compra obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting compra by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await ComprasService.create(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Ingreso de inventario por compra registrado correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating compra:', error);
      return next(error);
    }
  }

  static async deleteIngreso(req, res, next) {
    try {
      await ComprasService.deleteIngreso(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Ingreso eliminado correctamente. Stock y movimientos revertidos.' });
    } catch (error) {
      logger.error('Error deleting ingreso:', error);
      return next(error);
    }
  }
}

module.exports = ComprasController;
