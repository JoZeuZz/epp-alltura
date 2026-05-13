// backend/src/controllers/activos.controller.js
const ActivosService = require('../services/activos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class ActivosController {
  static async entregar(req, res, next) {
    try {
      const data = await ActivosService.entregar(req.params.id, req.body, req.user.id, req.file);
      return sendSuccess(res, { status: 201, message: 'Activo entregado correctamente', data });
    } catch (error) {
      logger.error('Error entregando activo:', error);
      return next(error);
    }
  }

  static async devolver(req, res, next) {
    try {
      const data = await ActivosService.devolver(req.params.id, req.body, req.user.id, req.file);
      return sendSuccess(res, { status: 201, message: 'Activo devuelto correctamente', data });
    } catch (error) {
      logger.error('Error devolviendo activo:', error);
      return next(error);
    }
  }
}

module.exports = ActivosController;
