const express = require('express');
const Joi = require('joi');
const UbicacionesController = require('../controllers/ubicaciones.controller');
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

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const validateUbicacionBusinessShape = (value, helpers) => {
  if (value.tipo === 'bodega' && !value.ubicacion_subtipo) {
    return helpers.error('any.custom', {
      message: 'Las ubicaciones de tipo bodega requieren ubicacion_subtipo',
    });
  }

  if (value.tipo && value.tipo !== 'bodega' && value.ubicacion_subtipo) {
    return helpers.error('any.custom', {
      message: 'Solo las ubicaciones de tipo bodega pueden tener ubicacion_subtipo',
    });
  }

  if (value.planta_padre_id && value.tipo && value.tipo !== 'bodega') {
    return helpers.error('any.custom', {
      message: 'Solo las bodegas pueden tener planta_padre_id',
    });
  }

  if (value.fecha_inicio_operacion && value.fecha_cierre_operacion) {
    const inicio = new Date(value.fecha_inicio_operacion);
    const cierre = new Date(value.fecha_cierre_operacion);
    if (Number.isFinite(inicio.getTime()) && Number.isFinite(cierre.getTime()) && cierre < inicio) {
      return helpers.error('any.custom', {
        message: 'fecha_cierre_operacion no puede ser anterior a fecha_inicio_operacion',
      });
    }
  }

  return value;
};

const ubicacionCreateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150).required(),
  tipo: Joi.string()
    .valid('bodega', 'planta', 'proyecto', 'taller_mantencion')
    .required(),
  cliente: Joi.string().trim().max(150).allow('', null),
  direccion: Joi.string().trim().max(500).allow('', null),
  ubicacion_subtipo: Joi.string().valid('fija', 'transitoria').allow(null),
  fecha_inicio_operacion: Joi.date().iso().allow(null),
  fecha_cierre_operacion: Joi.date().iso().allow(null),
  planta_padre_id: uuid.allow(null),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
})
  .custom(validateUbicacionBusinessShape, 'ubicacion business shape validation')
  .messages({
    'any.custom': '{{#message}}',
  });

const ubicacionUpdateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150),
  tipo: Joi.string().valid('bodega', 'planta', 'proyecto', 'taller_mantencion'),
  cliente: Joi.string().trim().max(150).allow('', null),
  direccion: Joi.string().trim().max(500).allow('', null),
  ubicacion_subtipo: Joi.string().valid('fija', 'transitoria').allow(null),
  fecha_inicio_operacion: Joi.date().iso().allow(null),
  fecha_cierre_operacion: Joi.date().iso().allow(null),
  planta_padre_id: uuid.allow(null),
  estado: Joi.string().valid('activo', 'inactivo'),
})
  .min(1)
  .custom(validateUbicacionBusinessShape, 'ubicacion business shape update validation')
  .messages({
    'any.custom': '{{#message}}',
  });

router.get('/', authMiddleware, UbicacionesController.list);
router.get('/:id', authMiddleware, UbicacionesController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(ubicacionCreateSchema),
  UbicacionesController.create
);
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(ubicacionUpdateSchema),
  UbicacionesController.update
);
router.delete('/:id', authMiddleware, checkRole(['admin']), UbicacionesController.remove);

module.exports = router;
