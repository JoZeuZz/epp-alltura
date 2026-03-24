const express = require('express');
const Joi = require('joi');
const ArticulosController = require('../controllers/articulos.controller');
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

const validateArticuloClassification = (value, helpers) => {
  const tipo = value.tipo;
  const trackingMode = value.tracking_mode;
  const retornoMode = value.retorno_mode;

  if (retornoMode === 'retornable' && trackingMode !== 'serial') {
    return helpers.error('any.custom', {
      message: 'Los artículos retornables deben gestionarse por unidad',
    });
  }

  if (retornoMode === 'consumible' && trackingMode === 'serial') {
    return helpers.error('any.custom', {
      message: 'Los artículos consumibles no pueden gestionarse por unidad',
    });
  }

  if (tipo === 'consumible' && retornoMode !== 'consumible') {
    return helpers.error('any.custom', {
      message: 'Los artículos de tipo "consumible" deben tener retorno_mode "consumible"',
    });
  }

  if ((tipo === 'herramienta' || tipo === 'epp') && retornoMode === 'retornable' && trackingMode !== 'serial') {
    return helpers.error('any.custom', {
      message: 'Herramientas/EPP retornables deben gestionarse por unidad',
    });
  }

  return value;
};

const articuloCreateSchema = Joi.object({
  tipo: Joi.string().valid('herramienta', 'epp', 'consumible').required(),
  nombre: Joi.string().trim().min(2).max(150).required(),
  marca: Joi.string().trim().max(120).allow('', null),
  modelo: Joi.string().trim().max(120).allow('', null),
  categoria: Joi.string().trim().max(120).allow('', null),
  tracking_mode: Joi.string().valid('serial', 'lote').required(),
  retorno_mode: Joi.string().valid('retornable', 'consumible').required(),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope').required(),
  requiere_vencimiento: Joi.boolean().default(false),
  unidad_medida: Joi.string().trim().max(50).required(),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
})
  .custom(validateArticuloClassification, 'article classification validation')
  .messages({
    'any.custom': '{{#message}}',
  });

const articuloUpdateSchema = Joi.object({
  tipo: Joi.string().valid('herramienta', 'epp', 'consumible'),
  nombre: Joi.string().trim().min(2).max(150),
  marca: Joi.string().trim().max(120).allow('', null),
  modelo: Joi.string().trim().max(120).allow('', null),
  categoria: Joi.string().trim().max(120).allow('', null),
  tracking_mode: Joi.string().valid('serial', 'lote'),
  retorno_mode: Joi.string().valid('retornable', 'consumible'),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope'),
  requiere_vencimiento: Joi.boolean(),
  unidad_medida: Joi.string().trim().max(50),
  estado: Joi.string().valid('activo', 'inactivo'),
})
  .min(1)
  .custom((value, helpers) => {
    if (value.tracking_mode === undefined && value.retorno_mode === undefined && value.tipo === undefined) {
      return value;
    }

    const tipo = value.tipo;
    const trackingMode = value.tracking_mode;
    const retornoMode = value.retorno_mode;

    if (retornoMode === 'retornable' && trackingMode && trackingMode !== 'serial') {
      return helpers.error('any.custom', {
        message: 'Los artículos retornables deben gestionarse por unidad',
      });
    }

    if (retornoMode === 'consumible' && trackingMode === 'serial') {
      return helpers.error('any.custom', {
        message: 'Los artículos consumibles no pueden gestionarse por unidad',
      });
    }

    if (tipo === 'consumible' && retornoMode && retornoMode !== 'consumible') {
      return helpers.error('any.custom', {
        message: 'Los artículos de tipo "consumible" deben tener retorno_mode "consumible"',
      });
    }

    return value;
  }, 'article classification update validation')
  .messages({
    'any.custom': '{{#message}}',
  });

router.get('/', authMiddleware, ArticulosController.list);
router.get('/:id', authMiddleware, ArticulosController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(articuloCreateSchema),
  ArticulosController.create
);
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(articuloUpdateSchema),
  ArticulosController.update
);
router.delete('/:id', authMiddleware, checkRole(['admin']), ArticulosController.remove);
router.delete(
  '/:id/permanent',
  authMiddleware,
  checkRole(['admin']),
  ArticulosController.removePermanent
);

module.exports = router;
