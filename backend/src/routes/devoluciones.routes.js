const express = require('express');
const Joi = require('joi');
const DevolucionesController = require('../controllers/devoluciones.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

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

const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });

const devolucionDetalleSchema = Joi.object({
  custodia_activo_id: uuid.allow(null),
  articulo_id: uuid.allow(null),
  activo_id: uuid.allow(null),
  lote_id: uuid.allow(null),
  cantidad: Joi.number().positive().required(),
  condicion_entrada: Joi.string().valid('ok', 'usado', 'danado', 'perdido').default('ok'),
  disposicion: Joi.string().valid('devuelto', 'perdido', 'baja', 'mantencion').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
}).custom((value, helpers) => {
  if (!value.activo_id && !value.articulo_id) {
    return helpers.error('any.custom', {
      message: 'Cada detalle debe incluir activo_id o articulo_id',
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

module.exports = router;
