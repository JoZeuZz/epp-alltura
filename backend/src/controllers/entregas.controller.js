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

  static async getActa(req, res, next) {
    try {
      const data = await EntregasService.getActa(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Acta de entrega obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting entrega acta:', error);
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

  static async listTemplates(req, res, next) {
    try {
      const data = await EntregasService.listTemplates(req.query || {});
      return sendSuccess(res, { message: 'Plantillas de entrega obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing entrega templates:', error);
      return next(error);
    }
  }

  static async getTemplateById(req, res, next) {
    try {
      const data = await EntregasService.getTemplateById(req.params.templateId);
      return sendSuccess(res, { message: 'Plantilla de entrega obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting entrega template by id:', error);
      return next(error);
    }
  }

  static async createTemplate(req, res, next) {
    try {
      const data = await EntregasService.createTemplate(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Plantilla de entrega creada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating entrega template:', error);
      return next(error);
    }
  }

  static async updateTemplate(req, res, next) {
    try {
      const data = await EntregasService.updateTemplate(req.params.templateId, req.body, req.user.id);
      return sendSuccess(res, { message: 'Plantilla de entrega actualizada correctamente', data });
    } catch (error) {
      logger.error('Error updating entrega template:', error);
      return next(error);
    }
  }

  static async deactivateTemplate(req, res, next) {
    try {
      const data = await EntregasService.deactivateTemplate(req.params.templateId, req.user.id);
      return sendSuccess(res, { message: 'Plantilla de entrega desactivada correctamente', data });
    } catch (error) {
      logger.error('Error deactivating entrega template:', error);
      return next(error);
    }
  }

  static async previewTemplate(req, res, next) {
    try {
      const data = await EntregasService.previewTemplate(req.params.templateId, req.query || {});
      return sendSuccess(res, { message: 'Preview de plantilla generado correctamente', data });
    } catch (error) {
      logger.error('Error previewing entrega template:', error);
      return next(error);
    }
  }

  static async createFromTemplate(req, res, next) {
    try {
      const data = await EntregasService.createFromTemplate(req.params.templateId, req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Entrega creada desde plantilla correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating entrega from template:', error);
      return next(error);
    }
  }

  static async createBatchFromTemplate(req, res, next) {
    try {
      const data = await EntregasService.createBatchFromTemplate(req.params.templateId, req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Entregas en borrador creadas desde plantilla correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating batch entregas from template:', error);
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
