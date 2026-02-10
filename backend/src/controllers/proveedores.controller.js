const ProveedoresService = require('../services/proveedores.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class ProveedoresController {
  static async list(req, res, next) {
    try {
      const data = await ProveedoresService.list(req.query || {});
      return sendSuccess(res, { message: 'Proveedores obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing proveedores:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await ProveedoresService.create(req.body);
      return sendSuccess(res, { status: 201, message: 'Proveedor creado correctamente', data });
    } catch (error) {
      logger.error('Error creating proveedor:', error);
      return next(error);
    }
  }
}

module.exports = ProveedoresController;
