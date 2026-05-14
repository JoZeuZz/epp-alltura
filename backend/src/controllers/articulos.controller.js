'use strict';

const { ArticulosService } = require('../services/articulos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class ArticulosController {
  static async list(req, res, next) {
    try {
      const data = await ArticulosService.list(req.query || {});
      return sendSuccess(res, { message: 'Artículos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing articulos:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await ArticulosService.getById(req.params.id);
      return sendSuccess(res, { message: 'Artículo obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting articulo by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await ArticulosService.create(req.body, req.user.id, req.file || null);
      return sendSuccess(res, { status: 201, message: 'Artículo creado correctamente', data });
    } catch (error) {
      logger.error('Error creating articulo:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await ArticulosService.update(req.params.id, req.body, req.user.id, req.file || null);
      return sendSuccess(res, { message: 'Artículo actualizado correctamente', data });
    } catch (error) {
      logger.error('Error updating articulo:', error);
      return next(error);
    }
  }

  static async removePermanent(req, res, next) {
    try {
      await ArticulosService.deletePermanent(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Artículo eliminado permanentemente' });
    } catch (error) {
      logger.error('Error deleting articulo permanently:', error);
      return next(error);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const data = await ArticulosService.cambiarEstado(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { message: 'Estado del artículo actualizado', data });
    } catch (error) {
      logger.error('Error changing articulo state:', error);
      return next(error);
    }
  }
}

module.exports = ArticulosController;
