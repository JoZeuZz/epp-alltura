const TrabajadoresService = require('../services/trabajadores.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class TrabajadoresController {
  static async list(req, res, next) {
    try {
      const data = await TrabajadoresService.list(req.query || {});
      return sendSuccess(res, { message: 'Trabajadores obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing trabajadores:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await TrabajadoresService.getById(req.params.id);
      return sendSuccess(res, { message: 'Trabajador obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting trabajador by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await TrabajadoresService.create(req.body);
      return sendSuccess(res, { status: 201, message: 'Trabajador creado correctamente', data });
    } catch (error) {
      logger.error('Error creating trabajador:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await TrabajadoresService.update(req.params.id, req.body);
      return sendSuccess(res, { message: 'Trabajador actualizado correctamente', data });
    } catch (error) {
      logger.error('Error updating trabajador:', error);
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const data = await TrabajadoresService.remove(req.params.id);
      return sendSuccess(res, { message: 'Trabajador desactivado correctamente', data });
    } catch (error) {
      logger.error('Error deleting trabajador:', error);
      return next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const data = await TrabajadoresService.getProfile(req.params.id);
      return sendSuccess(res, { message: 'Perfil del trabajador obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting trabajador profile:', error);
      return next(error);
    }
  }
}

module.exports = TrabajadoresController;
