const FirmasService = require('../services/firmas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { uploadFile, deleteFileByUrl } = require('../lib/googleCloud');
const signatureEvents = require('../lib/signatureEvents');
const jwt = require('jsonwebtoken');

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
    logger.warn('No se pudo limpiar artefacto de firma tras error de negocio', {
      message: cleanupError.message,
      uploadedSignatureUrl,
    });
  }
};

class FirmasController {
  static async generateDeliveryStreamToken(req, res, next) {
    try {
      const expiresInSeconds = Number.parseInt(
        process.env.AUTH_EVENTS_STREAM_TOKEN_TTL_SECONDS || '',
        10
      );
      const ttl = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? expiresInSeconds
        : 30 * 60;

      const token = jwt.sign(
        {
          type: 'delivery_events_stream',
          user: {
            id: req.user.id,
            role: req.user.role,
            roles: req.user.roles || [],
          },
        },
        process.env.JWT_SECRET,
        {
          expiresIn: ttl,
          issuer: 'alltura-api',
          audience: 'alltura-client',
        }
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Token de stream generado correctamente',
        data: {
          token,
          expiresInSeconds: ttl,
        },
      });
    } catch (error) {
      logger.error('Error generating delivery stream token:', error);
      return next(error);
    }
  }

  static async streamDeliverySignatureEvents(req, res, _next) {
    const clientId = signatureEvents.addClient({
      res,
      userId: req.user?.id || null,
    });

    req.on('close', () => {
      signatureEvents.removeClient(clientId);
    });
  }

  static async generateToken(req, res, next) {
    try {
      const data = await FirmasService.generateToken(
        req.params.entregaId,
        req.user.id,
        req.body || {}
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Token de firma generado correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error generating firma token:', error);
      return next(error);
    }
  }

  static async signInDevice(req, res, next) {
    let uploadedSignatureUrl = null;

    try {
      const { payload, uploadedSignatureUrl: uploadedUrl } = await buildSignaturePayload(req);
      uploadedSignatureUrl = uploadedUrl;

      const data = await FirmasService.createSignatureInDevice(
        req.params.entregaId,
        payload,
        buildRequestMeta(req),
        {
          id: req.user.id,
          role: req.user.role,
          roles: req.user.roles || [],
        }
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Firma registrada correctamente',
        data,
      });
    } catch (error) {
      await cleanupUploadedSignature(uploadedSignatureUrl);
      logger.error('Error signing delivery in device:', error);
      return next(error);
    }
  }

  static async getTokenInfo(req, res, next) {
    try {
      const data = await FirmasService.getTokenInfo(req.params.token);
      return sendSuccess(res, {
        message: 'Información del token obtenida correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error retrieving token info:', error);
      return next(error);
    }
  }

  static async consumeToken(req, res, next) {
    let uploadedSignatureUrl = null;

    try {
      const { payload, uploadedSignatureUrl: uploadedUrl } = await buildSignaturePayload(req);
      uploadedSignatureUrl = uploadedUrl;

      const data = await FirmasService.consumeTokenAndSign(
        req.params.token,
        payload,
        buildRequestMeta(req)
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Firma registrada correctamente usando token',
        data,
      });
    } catch (error) {
      await cleanupUploadedSignature(uploadedSignatureUrl);
      logger.error('Error consuming token and signing:', error);
      return next(error);
    }
  }
}

module.exports = FirmasController;
