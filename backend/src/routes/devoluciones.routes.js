const express = require('express');
const Joi = require('joi');
const DevolucionesController = require('../controllers/devoluciones.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic, buildError, parseMultipartPayload } = require('../middleware/upload');

const router = express.Router();

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

const validateQuery = (schema) => {
  return async (req, _res, next) => {
    try {
      req.query = await schema.validateAsync(req.query, {
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

const eligibleAssetsQuerySchema = Joi.object({
  trabajador_id: uuid.required(),
  articulo_id: uuid.optional(),
  search: Joi.string().trim().max(120).allow('', null),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const devolucionDetailSchema = Joi.object({
  articulo_id: uuid.required(),
  activo_ids: Joi.array().items(uuid).min(1).required(),
  condicion_entrada: Joi.string().valid('ok', 'usado', 'danado', 'perdido').default('ok'),
  disposicion: Joi.string().valid('devuelto', 'perdido', 'baja', 'mantencion').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const createDevolucionSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_recepcion_id: uuid.required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  evidencia_foto_url: Joi.string().trim().max(2048).allow('', null),
  detalles: Joi.array().items(devolucionDetailSchema).min(1).required(),
});

const listQuerySchema = Joi.object({
  estado: Joi.string().trim().valid('borrador', 'pendiente_firma', 'confirmada', 'anulada'),
  trabajador_id: uuid,
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

const anularSchema = Joi.object({
  motivo: Joi.string().trim().min(5).max(1000).required(),
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

const optionalSignatureUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return imageUpload.single('firma_archivo')(req, res, next);
  }
  return next();
};

router.get(
  '/activos-elegibles',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(eligibleAssetsQuerySchema),
  DevolucionesController.listEligibleAssets
);

router.get(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(listQuerySchema),
  DevolucionesController.list
);

router.get(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  DevolucionesController.getById
);

router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  imageUpload.single('foto'),
  validateImageMagic,
  parseMultipartPayload,
  validateBody(createDevolucionSchema),
  DevolucionesController.create
);

router.post(
  '/:id/firmar-dispositivo',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  optionalSignatureUpload,
  validateImageMagic,
  normalizeSignaturePayload,
  validateBody(signatureSchema),
  ensureSignatureInput,
  DevolucionesController.signInDevice
);

router.post(
  '/:id/confirm',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  DevolucionesController.confirm
);

router.post(
  '/:id/anular',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(anularSchema),
  DevolucionesController.anular
);

module.exports = router;
