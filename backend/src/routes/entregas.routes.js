const express = require('express');
const Joi = require('joi');
const EntregasController = require('../controllers/entregas.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic, buildError, parseMultipartPayload } = require('../middleware/upload');

const router = express.Router();

const validateBody = (schema) => async (req, _res, next) => {
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

const validateQuery = (schema) => async (req, _res, next) => {
  try {
    const validated = await schema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    Object.defineProperty(req, 'query', { value: validated, writable: true, configurable: true });
    return next();
  } catch (error) {
    return next(error);
  }
};

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const entregaDetailSchema = Joi.object({
  articulo_id: uuid.required(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').default('ok'),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const createEntregaSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega').default('entrega'),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
  evidencia_foto_url: Joi.string().trim().max(2048).optional(),
  detalles: Joi.array().items(entregaDetailSchema).min(1).required(),
});

const listQuerySchema = Joi.object({
  estado: Joi.string()
    .trim()
    .valid('borrador', 'pendiente_firma', 'confirmada', 'anulada', 'revertida_admin'),
  estado_in: Joi.string().trim().pattern(/^[a-z_,]+$/).optional(),
  trabajador_id: uuid,
  articulo_id: uuid,
});

const anularSchema = Joi.object({
  // DB constraint chk_entrega_motivo_anulacion exige motivo no vacío (>= 5 chars)
  motivo: Joi.string().trim().min(5).max(1000).required().messages({
    'any.required': 'El motivo de anulación es obligatorio.',
    'string.empty': 'El motivo de anulación es obligatorio.',
    'string.min': 'El motivo de anulación debe tener al menos 5 caracteres.',
  }),
});

router.get(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(listQuerySchema),
  EntregasController.list
);

router.get(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  EntregasController.getById
);

router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  imageUpload.single('foto'),
  validateImageMagic,
  parseMultipartPayload,
  validateBody(createEntregaSchema),
  EntregasController.create
);

router.post(
  '/:id/confirm',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  EntregasController.confirm
);

router.post(
  '/:id/anular',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(anularSchema),
  EntregasController.anular
);

router.get(
  '/:id/pdf',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  EntregasController.exportPdf
);

module.exports = router;
