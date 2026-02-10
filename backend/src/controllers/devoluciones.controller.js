const DevolucionesService = require('../services/devoluciones.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class DevolucionesController {
  static async list(req, res, next) {
    try {
      const data = await DevolucionesService.list(req.query || {});
      return sendSuccess(res, { message: 'Devoluciones obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing devoluciones:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await DevolucionesService.getById(req.params.id);
      return sendSuccess(res, { message: 'Devolución obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting devolucion by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await DevolucionesService.create(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Devolución creada en borrador correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating devolucion:', error);
      return next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const data = await DevolucionesService.confirm(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Devolución confirmada correctamente', data });
    } catch (error) {
      logger.error('Error confirming devolucion:', error);
      return next(error);
    }
  }

  static async getMyCustodias(req, res, next) {
    try {
      const data = await DevolucionesService.getActiveCustodiasForUser(req.user.id);
      return sendSuccess(res, { message: 'Custodias activas obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error getting active custodias for user:', error);
      return next(error);
    }
  }
}

module.exports = DevolucionesController;
