const EntregasService = require('../services/entregas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class EntregasController {
  static async list(req, res, next) {
    try {
      const data = await EntregasService.list(req.query || {});
      return sendSuccess(res, { message: 'Entregas obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing entregas:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await EntregasService.getById(req.params.id);
      return sendSuccess(res, { message: 'Entrega obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting entrega by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await EntregasService.create(req.body, req.user.id);
      return sendSuccess(res, { status: 201, message: 'Entrega creada correctamente', data });
    } catch (error) {
      logger.error('Error creating entrega:', error);
      return next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const data = await EntregasService.confirm(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Entrega confirmada correctamente', data });
    } catch (error) {
      logger.error('Error confirming entrega:', error);
      return next(error);
    }
  }

  static async recibirTraslado(req, res, next) {
    try {
      const data = await EntregasService.recibirTraslado(req.params.id, req.user.id, req.body || {});
      return sendSuccess(res, { message: 'Traslado recibido correctamente', data });
    } catch (error) {
      logger.error('Error receiving traslado:', error);
      return next(error);
    }
  }

  static async anular(req, res, next) {
    try {
      const data = await EntregasService.anular(req.params.id, req.user.id, req.body.motivo);
      return sendSuccess(res, { message: 'Entrega anulada correctamente', data });
    } catch (error) {
      logger.error('Error anulando entrega:', error);
      return next(error);
    }
  }

  static async deshacer(req, res, next) {
    try {
      const data = await EntregasService.deshacer(req.params.id, req.user.id, req.body.motivo);
      return sendSuccess(res, { message: 'Entrega deshecha correctamente', data });
    } catch (error) {
      logger.error('Error deshaciendo entrega:', error);
      return next(error);
    }
  }

  static async permanentDelete(req, res, next) {
    try {
      const data = await EntregasService.permanentDelete(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Entrega eliminada definitivamente', data });
    } catch (error) {
      logger.error('Error eliminando entrega definitivamente:', error);
      return next(error);
    }
  }
}

module.exports = EntregasController;
