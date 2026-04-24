const express = require('express');
const Joi = require('joi');
const DevolucionesController = require('../controllers/devoluciones.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic } = require('../middleware/upload');

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

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const devolucionDetalleSchema = Joi.object({
  custodia_activo_id: uuid.allow(null),
  articulo_id: uuid.allow(null),
  activo_ids: Joi.array().items(uuid).min(1).optional(),
  cantidad: Joi.number().integer().positive().required(),
  condicion_entrada: Joi.string().valid('ok', 'usado', 'danado', 'perdido').default('ok'),
  disposicion: Joi.string().valid('devuelto', 'perdido', 'baja', 'mantencion').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
}).custom((value, helpers) => {
  if (!value.activo_ids || value.activo_ids.length === 0) {
    return helpers.error('any.custom', {
      message: 'Cada detalle debe incluir activo_ids en operación V2',
    });
  }

  if (value.activo_ids && (value.cantidad !== 1)) {
    return helpers.error('any.custom', {
      message: 'Los detalles con activo_ids deben usar cantidad = 1',
    });
  }

  return value;
}, 'detalle identification validation').messages({
  'any.custom': '{{#message}}',
});

const createDevolucionSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_recepcion_id: uuid.required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(devolucionDetalleSchema).min(1).required(),
});

const signatureSchema = Joi.object({
  firma_imagen_url: Joi.string().trim().min(10).optional(),
  texto_aceptacion: Joi.string().trim().min(10).max(5000).required(),
});

const optionalSignatureUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return imageUpload.single('firma_archivo')(req, res, next);
  }
  return next();
};

const ensureSignatureInput = (req, _res, next) => {
  if (req.file || req.body?.firma_imagen_url) {
    return next();
  }

  return next(Object.assign(new Error('Debe enviar firma_archivo o firma_imagen_url'), {
    statusCode: 400,
    code: 'SIGNATURE_REQUIRED',
  }));
};

router.get(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  DevolucionesController.list
);

router.get(
  '/mis-custodias/activos',
  authMiddleware,
  checkRole(['trabajador', 'worker', 'client']),
  DevolucionesController.getMyCustodias
);

router.get(
  '/activos-elegibles',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  DevolucionesController.getEligibleAssets
);

router.get(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  DevolucionesController.getById
);

router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createDevolucionSchema),
  DevolucionesController.create
);

router.post(
  '/:id/confirm',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  DevolucionesController.confirm
);

router.post(
  '/:id/firmar-dispositivo',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  optionalSignatureUpload,
  validateImageMagic,
  validateBody(signatureSchema),
  ensureSignatureInput,
  DevolucionesController.signInDevice
);

module.exports = router;
