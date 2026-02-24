const InventarioService = require('../services/inventario.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { uploadDocument, deleteFileByUrl } = require('../lib/googleCloud');

class InventarioController {
  static async listIngresos(req, res, next) {
    try {
      const data = await InventarioService.getIngresos(req.query || {});
      return sendSuccess(res, {
        message: 'Ingresos de inventario obtenidos correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error listing inventory ingresos:', error);
      return next(error);
    }
  }

  static async createIngreso(req, res, next) {
    let uploadedDocumentUrl = null;

    try {
      const payload = {
        ...(req.body || {}),
      };

      if (payload.fecha_ingreso && !payload.fecha_compra) {
        payload.fecha_compra = payload.fecha_ingreso;
      }
      delete payload.fecha_ingreso;

      if (req.file) {
        uploadedDocumentUrl = await uploadDocument(req.file);
        payload.documento_compra = {
          ...(payload.documento_compra || {}),
          archivo_url: uploadedDocumentUrl,
        };
      }

      const data = await InventarioService.createIngreso(payload, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Ingreso de inventario registrado correctamente',
        data,
      });
    } catch (error) {
      if (uploadedDocumentUrl) {
        try {
          await deleteFileByUrl(uploadedDocumentUrl);
        } catch (cleanupError) {
          logger.warn('No se pudo limpiar documento de ingreso tras error', {
            message: cleanupError.message,
            uploadedDocumentUrl,
          });
        }
      }
      logger.error('Error creating inventory ingreso:', error);
      return next(error);
    }
  }

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

  static async getActivos(req, res, next) {
    try {
      const data = await InventarioService.getActivos(req.query || {});
      return sendSuccess(res, { message: 'Activos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching activos:', error);
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

  static async deleteIngreso(req, res, next) {
    try {
      await InventarioService.deleteIngreso(req.params.id);
      return sendSuccess(res, { message: 'Ingreso eliminado correctamente. Stock y movimientos revertidos.' });
    } catch (error) {
      logger.error('Error deleting ingreso:', error);
      return next(error);
    }
  }

  static async listEgresos(req, res, next) {
    try {
      const data = await InventarioService.getEgresos(req.query || {});
      return sendSuccess(res, { message: 'Egresos de inventario obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing egresos:', error);
      return next(error);
    }
  }

  static async getEgresoById(req, res, next) {
    try {
      const data = await InventarioService.getEgresoById(req.params.id);
      return sendSuccess(res, { message: 'Egreso obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting egreso by id:', error);
      return next(error);
    }
  }

  static async createEgreso(req, res, next) {
    try {
      const data = await InventarioService.createEgreso(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Egreso de inventario registrado correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating egreso:', error);
      return next(error);
    }
  }

  static async deleteEgreso(req, res, next) {
    try {
      await InventarioService.deleteEgreso(req.params.id);
      return sendSuccess(res, { message: 'Egreso eliminado correctamente. Stock revertido.' });
    } catch (error) {
      logger.error('Error deleting egreso:', error);
      return next(error);
    }
  }

  static async getLotes(req, res, next) {
    try {
      const data = await InventarioService.getLotes(req.query || {});
      return sendSuccess(res, { message: 'Lotes obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching lotes:', error);
      return next(error);
    }
  }
}

module.exports = InventarioController;
