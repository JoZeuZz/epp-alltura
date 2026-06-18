const ProyectosService = require('../services/proyectos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class ProyectosController {
  static async list(req, res, next) {
    try {
      const data = await ProyectosService.list(req.query || {});
      return sendSuccess(res, { message: 'Proyectos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing proyectos:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await ProyectosService.getById(req.params.id);
      return sendSuccess(res, { message: 'Proyecto obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting proyecto by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await ProyectosService.create(req.body, req.user.id);
      return sendSuccess(res, { status: 201, message: 'Proyecto creado correctamente', data });
    } catch (error) {
      logger.error('Error creating proyecto:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { data, warnings } = await ProyectosService.update(req.params.id, req.body, req.user.id);
      const responseData = warnings.length ? { ...data, warnings } : data;
      return sendSuccess(res, { message: 'Proyecto actualizado correctamente', data: responseData });
    } catch (error) {
      logger.error('Error updating proyecto:', error);
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const data = await ProyectosService.remove(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Proyecto desactivado correctamente', data });
    } catch (error) {
      logger.error('Error deleting proyecto:', error);
      return next(error);
    }
  }
}

module.exports = ProyectosController;
