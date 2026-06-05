'use strict';

const { PlantillasService } = require('../services/plantillas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class PlantillasController {
  static async list(req, res, next) {
    try {
      const data = await PlantillasService.list(req.query || {});
      return sendSuccess(res, { message: 'Plantillas obtenidas', data });
    } catch (error) {
      logger.error('Error listing plantillas:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await PlantillasService.getById(req.params.id);
      return sendSuccess(res, { message: 'Plantilla obtenida', data });
    } catch (error) {
      logger.error('Error getting plantilla:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await PlantillasService.create(req.body, req.user.id, req.files || {});
      return sendSuccess(res, { status: 201, message: 'Plantilla creada', data });
    } catch (error) {
      logger.error('Error creating plantilla:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await PlantillasService.update(req.params.id, req.body, req.user.id, req.files || {});
      return sendSuccess(res, { message: 'Plantilla actualizada', data });
    } catch (error) {
      logger.error('Error updating plantilla:', error);
      return next(error);
    }
  }

  static async addCertificacion(req, res, next) {
    try {
      if (!req.file) {
        const error = new Error('Se requiere un archivo PDF');
        error.statusCode = 400;
        return next(error);
      }
      const data = await PlantillasService.addCertificacion(
        req.params.id, req.file, req.body.nombre || null
      );
      return sendSuccess(res, { status: 201, message: 'Certificación agregada', data });
    } catch (error) {
      logger.error('Error adding cert to plantilla:', error);
      return next(error);
    }
  }
}

module.exports = PlantillasController;
