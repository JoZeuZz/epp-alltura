const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const FirmasController = require('../controllers/firmas.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic } = require('../middleware/upload');

const router = express.Router();

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const validateBody = (schema) => {
  return async (req, _res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const tokenGenerationSchema = Joi.object({
  expira_minutos: Joi.number().integer().min(5).max(1440).default(60),
});

const acceptanceDetailSchema = Joi.object({
  detalle_id: uuid.allow(null),
  texto: Joi.string().trim().min(1).max(2000).required(),
});

const signatureSchema = Joi.object({
  trabajador_id: uuid.optional(),
  firma_imagen_url: Joi.string().trim().min(10).optional(),
  texto_aceptacion: Joi.string().trim().min(10).max(5000).required(),
  texto_aceptacion_detalle: Joi.array().items(acceptanceDetailSchema).default([]),
});

const normalizeSignaturePayload = (req, _res, next) => {
  try {
    const body = req.body || {};

    if (
      body.texto_aceptacion_detalle === undefined ||
      body.texto_aceptacion_detalle === null ||
      body.texto_aceptacion_detalle === ''
    ) {
      body.texto_aceptacion_detalle = [];
    }

    if (typeof body.texto_aceptacion_detalle === 'string') {
      const rawValue = body.texto_aceptacion_detalle.trim();
      body.texto_aceptacion_detalle = rawValue ? JSON.parse(rawValue) : [];
    }

    if (!Array.isArray(body.texto_aceptacion_detalle)) {
      throw buildError(
        'texto_aceptacion_detalle debe ser un arreglo JSON válido',
        400,
        'INVALID_ACCEPTANCE_DETAILS'
      );
    }

    if (typeof body.firma_imagen_url === 'string') {
      body.firma_imagen_url = body.firma_imagen_url.trim();
      if (!body.firma_imagen_url) {
        delete body.firma_imagen_url;
      }
    }

    if (typeof body.trabajador_id === 'string' && body.trabajador_id.trim() === '') {
      delete body.trabajador_id;
    }

    req.body = body;
    return next();
  } catch (error) {
    if (error.name === 'SyntaxError') {
      return next(
        buildError(
          'texto_aceptacion_detalle no tiene formato JSON válido',
          400,
          'INVALID_ACCEPTANCE_DETAILS_JSON'
        )
      );
    }
    return next(error);
  }
};

const ensureSignatureInput = (req, _res, next) => {
  if (req.file || req.body?.firma_imagen_url) {
    return next();
  }

  return next(
    buildError(
      'Debe enviar firma_archivo (multipart) o firma_imagen_url (JSON legacy)',
      400,
      'SIGNATURE_REQUIRED'
    )
  );
};

const authFromStreamToken = (req, res, next) => {
  const token = req.query?.stream_token;
  if (!token || typeof token !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'Token de stream requerido',
      data: null,
      errors: ['STREAM_TOKEN_REQUIRED'],
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'alltura-api',
      audience: 'alltura-client',
    });

    if (decoded.type !== 'delivery_events_stream' || !decoded.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Token de stream inválido',
        data: null,
        errors: ['STREAM_TOKEN_INVALID'],
      });
    }

    req.user = decoded.user;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token de stream expirado o inválido',
      data: null,
      errors: ['STREAM_TOKEN_INVALID'],
    });
  }
};

const optionalSignatureUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return imageUpload.single('firma_archivo')(req, res, next);
  }
  return next();
};

router.get('/tokens/:token', FirmasController.getTokenInfo);
router.post(
  '/events/deliveries/token',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  FirmasController.generateDeliveryStreamToken
);
router.get(
  '/events/deliveries',
  authFromStreamToken,
  checkRole(['admin', 'supervisor']),
  FirmasController.streamDeliverySignatureEvents
);
router.post(
  '/tokens/:token/firmar',
  optionalSignatureUpload,
  validateImageMagic,
  normalizeSignaturePayload,
  validateBody(signatureSchema),
  ensureSignatureInput,
  FirmasController.consumeToken
);

router.post(
  '/entregas/:entregaId/token',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(tokenGenerationSchema),
  FirmasController.generateToken
);

router.post(
  '/entregas/:entregaId/firmar-dispositivo',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  optionalSignatureUpload,
  validateImageMagic,
  normalizeSignaturePayload,
  validateBody(signatureSchema),
  ensureSignatureInput,
  FirmasController.signInDevice
);

module.exports = router;
