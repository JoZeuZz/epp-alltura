const BodegasService = require('../services/bodegas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class BodegasController {
  static async list(req, res, next) {
    try {
      const data = await BodegasService.list(req.query || {});
      return sendSuccess(res, { message: 'Bodegas obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing bodegas:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await BodegasService.getById(req.params.id);
      return sendSuccess(res, { message: 'Bodega obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting bodega by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await BodegasService.create(req.body);
      return sendSuccess(res, { status: 201, message: 'Bodega creada correctamente', data });
    } catch (error) {
      logger.error('Error creating bodega:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await BodegasService.update(req.params.id, req.body);
      return sendSuccess(res, { message: 'Bodega actualizada correctamente', data });
    } catch (error) {
      logger.error('Error updating bodega:', error);
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const data = await BodegasService.remove(req.params.id);
      return sendSuccess(res, { message: 'Bodega desactivada correctamente', data });
    } catch (error) {
      logger.error('Error deleting bodega:', error);
      return next(error);
    }
  }
}

module.exports = BodegasController;
