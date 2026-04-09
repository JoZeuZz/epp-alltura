const DocumentosService = require('../services/documentos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class DocumentosController {
  static async createAnexo(req, res, next) {
    try {
      const payload = {
        ...(req.body || {}),
        file: req.file,
      };

      const data = await DocumentosService.createAnexo(payload, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Anexo creado correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating anexo:', error);
      return next(error);
    }
  }
}

module.exports = DocumentosController;
