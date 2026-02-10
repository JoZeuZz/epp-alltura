const InventarioService = require('../services/inventario.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class InventarioController {
  static async getStock(req, res, next) {
    try {
      const data = await InventarioService.getStock(req.query || {});
      return sendSuccess(res, { message: 'Stock obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock:', error);
      return next(error);
    }
  }

  static async getStockMovements(req, res, next) {
    try {
      const data = await InventarioService.getStockMovements(req.query || {});
      return sendSuccess(res, { message: 'Movimientos de stock obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock movements:', error);
      return next(error);
    }
  }

  static async getAssetMovements(req, res, next) {
    try {
      const data = await InventarioService.getAssetMovements(req.query || {});
      return sendSuccess(res, { message: 'Movimientos de activos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching asset movements:', error);
      return next(error);
    }
  }

  static async getAuditoria(req, res, next) {
    try {
      const data = await InventarioService.getAuditoria(req.query || {});
      return sendSuccess(res, { message: 'Auditoría obtenida correctamente', data });
    } catch (error) {
      logger.error('Error fetching auditoria:', error);
      return next(error);
    }
  }
}

module.exports = InventarioController;
