const UbicacionesService = require('../services/ubicaciones.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class UbicacionesController {
  static async list(req, res, next) {
    try {
      const data = await UbicacionesService.list(req.query || {});
      return sendSuccess(res, { message: 'Ubicaciones obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing ubicaciones:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await UbicacionesService.getById(req.params.id);
      return sendSuccess(res, { message: 'Ubicación obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting ubicacion by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await UbicacionesService.create(req.body);
      return sendSuccess(res, { status: 201, message: 'Ubicación creada correctamente', data });
    } catch (error) {
      logger.error('Error creating ubicacion:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await UbicacionesService.update(req.params.id, req.body);
      return sendSuccess(res, { message: 'Ubicación actualizada correctamente', data });
    } catch (error) {
      logger.error('Error updating ubicacion:', error);
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const data = await UbicacionesService.remove(req.params.id);
      return sendSuccess(res, { message: 'Ubicación desactivada correctamente', data });
    } catch (error) {
      logger.error('Error deleting ubicacion:', error);
      return next(error);
    }
  }
}

module.exports = UbicacionesController;
