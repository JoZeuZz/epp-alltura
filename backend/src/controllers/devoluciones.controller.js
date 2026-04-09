const DevolucionesService = require('../services/devoluciones.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { uploadFile, deleteFileByUrl } = require('../lib/googleCloud');

const buildRequestMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

const buildSignaturePayload = async (req) => {
  const payload = {
    ...(req.body || {}),
  };

  let uploadedSignatureUrl = null;
  if (req.file) {
    uploadedSignatureUrl = await uploadFile(req.file);
    payload.firma_imagen_url = uploadedSignatureUrl;
  }

  return {
    payload,
    uploadedSignatureUrl,
  };
};

const cleanupUploadedSignature = async (uploadedSignatureUrl) => {
  if (!uploadedSignatureUrl) {
    return;
  }

  try {
    await deleteFileByUrl(uploadedSignatureUrl);
  } catch (cleanupError) {
    logger.warn('No se pudo limpiar artefacto de firma de devolución tras error de negocio', {
      message: cleanupError.message,
      uploadedSignatureUrl,
    });
  }
};

class DevolucionesController {
  static async list(req, res, next) {
    try {
      const data = await DevolucionesService.list(req.query || {});
      return sendSuccess(res, { message: 'Devoluciones obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error listing devoluciones:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await DevolucionesService.getById(req.params.id);
      return sendSuccess(res, { message: 'Devolución obtenida correctamente', data });
    } catch (error) {
      logger.error('Error getting devolucion by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await DevolucionesService.create(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Devolución creada en borrador correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating devolucion:', error);
      return next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const data = await DevolucionesService.confirm(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Devolución confirmada correctamente', data });
    } catch (error) {
      logger.error('Error confirming devolucion:', error);
      return next(error);
    }
  }

  static async getMyCustodias(req, res, next) {
    try {
      const data = await DevolucionesService.getActiveCustodiasForUser(req.user.id);
      return sendSuccess(res, { message: 'Custodias activas obtenidas correctamente', data });
    } catch (error) {
      logger.error('Error getting active custodias for user:', error);
      return next(error);
    }
  }

  static async getEligibleAssets(req, res, next) {
    try {
      const data = await DevolucionesService.getEligibleAssets(req.query || {});
      return sendSuccess(res, { message: 'Activos elegibles para devolución obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error getting eligible return assets:', error);
      return next(error);
    }
  }

  static async signInDevice(req, res, next) {
    let uploadedSignatureUrl = null;

    try {
      const { payload, uploadedSignatureUrl: uploadedUrl } = await buildSignaturePayload(req);
      uploadedSignatureUrl = uploadedUrl;

      const data = await DevolucionesService.signInDevice(
        req.params.id,
        payload,
        buildRequestMeta(req),
        req.user.id
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Firma de devolución registrada correctamente',
        data,
      });
    } catch (error) {
      await cleanupUploadedSignature(uploadedSignatureUrl);
      logger.error('Error signing return in device:', error);
      return next(error);
    }
  }
}

module.exports = DevolucionesController;
