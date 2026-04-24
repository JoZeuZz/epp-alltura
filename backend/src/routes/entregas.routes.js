const express = require('express');
const Joi = require('joi');
const EntregasController = require('../controllers/entregas.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const router = express.Router();

const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, { abortEarly: false });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      req.query = await schema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true,
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

const entregaDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  activo_ids: Joi.array().items(uuid).min(1).optional(),
  cantidad: Joi.number().integer().positive().optional(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').default('ok'),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const templateItemSchema = Joi.object({
  articulo_id: uuid.required(),
  cantidad: Joi.number().integer().positive().required(),
  requiere_serial: Joi.boolean().optional(),
  notas_default: Joi.string().trim().max(1000).allow('', null),
});

const createTemplateSchema = Joi.object({
  nombre: Joi.string().trim().min(3).max(150).required(),
  descripcion: Joi.string().trim().max(1000).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo').optional(),
  scope_cargo: Joi.string().trim().max(120).allow('', null),
  scope_proyecto: Joi.string().trim().max(150).allow('', null),
  items: Joi.array().items(templateItemSchema).min(1).required(),
});

const updateTemplateSchema = Joi.object({
  nombre: Joi.string().trim().min(3).max(150).optional(),
  descripcion: Joi.string().trim().max(1000).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo').optional(),
  scope_cargo: Joi.string().trim().max(120).allow('', null),
  scope_proyecto: Joi.string().trim().max(150).allow('', null),
  items: Joi.array().items(templateItemSchema).min(1).optional(),
}).min(1);

const templateItemOverrideSchema = Joi.object({
  articulo_id: uuid.required(),
  cantidad: Joi.number().integer().positive().optional(),
  activo_ids: Joi.array().items(uuid).min(1).optional(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').optional(),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const createFromTemplateSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega').optional(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
  detalles_overrides: Joi.array().items(templateItemOverrideSchema).optional(),
});

const createBatchFromTemplateSchema = Joi.object({
  trabajador_ids: Joi.array().items(uuid).min(1).required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega').optional(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
  detalles_overrides: Joi.array().items(templateItemOverrideSchema).optional(),
}).custom((value, helpers) => {
  const hasSerialAssignments = (value.detalles_overrides || []).some(
    (item) => Array.isArray(item.activo_ids) && item.activo_ids.length > 0
  );

  if (hasSerialAssignments) {
    return helpers.error('any.custom', {
      message: 'El batch no admite activo_ids en detalles_overrides en este MVP',
    });
  }

  return value;
}, 'batch constraints').messages({
  'any.custom': '{{#message}}',
});

const templatePreviewQuerySchema = Joi.object({
  ubicacion_origen_id: uuid.optional(),
});

const createEntregaSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega').optional(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
  detalles: Joi.array().items(entregaDetalleSchema).min(1).required(),
});

const anularEntregaSchema = Joi.object({
  motivo: Joi.string().trim().min(5).max(1000).required(),
});

const deshacerEntregaSchema = Joi.object({
  motivo: Joi.string().trim().min(5).max(1000).required(),
});

router.get('/', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), EntregasController.list);

router.get(
  '/templates',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  EntregasController.listTemplates
);

router.post(
  '/templates',
  authMiddleware,
  checkRole(['admin']),
  validateBody(createTemplateSchema),
  EntregasController.createTemplate
);

router.get(
  '/templates/:templateId',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  EntregasController.getTemplateById
);

router.put(
  '/templates/:templateId',
  authMiddleware,
  checkRole(['admin']),
  validateBody(updateTemplateSchema),
  EntregasController.updateTemplate
);

router.delete(
  '/templates/:templateId',
  authMiddleware,
  checkRole(['admin']),
  EntregasController.deactivateTemplate
);

router.get(
  '/templates/:templateId/preview',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateQuery(templatePreviewQuerySchema),
  EntregasController.previewTemplate
);

router.post(
  '/templates/:templateId/create-draft',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createFromTemplateSchema),
  EntregasController.createFromTemplate
);

router.post(
  '/templates/:templateId/create-draft-batch',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createBatchFromTemplateSchema),
  EntregasController.createBatchFromTemplate
);

router.get(
  '/:id/acta',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  EntregasController.getActa
);

router.get('/:id', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), EntregasController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createEntregaSchema),
  EntregasController.create
);
router.post(
  '/:id/confirm',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  EntregasController.confirm
);

router.post(
  '/:id/anular',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(anularEntregaSchema),
  EntregasController.anular
);

router.post(
  '/:id/deshacer',
  authMiddleware,
  checkRole(['admin']),
  validateBody(deshacerEntregaSchema),
  EntregasController.deshacer
);

router.delete(
  '/:id/permanent',
  authMiddleware,
  checkRole(['admin']),
  EntregasController.permanentDelete
);

module.exports = router;
