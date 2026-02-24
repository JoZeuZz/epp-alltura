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

const articuloCreateSchema = Joi.object({
  tipo: Joi.string().valid('herramienta', 'epp', 'consumible').required(),
  nombre: Joi.string().trim().min(2).max(150).required(),
  marca: Joi.string().trim().max(120).allow('', null),
  modelo: Joi.string().trim().max(120).allow('', null),
  categoria: Joi.string().trim().max(120).allow('', null),
  tracking_mode: Joi.string().valid('serial', 'lote', 'cantidad').required(),
  retorno_mode: Joi.string().valid('retornable', 'consumible').required(),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope').required(),
  requiere_vencimiento: Joi.boolean().default(false),
  unidad_medida: Joi.string().trim().max(50).required(),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
});

const articuloUpdateSchema = Joi.object({
  tipo: Joi.string().valid('herramienta', 'epp', 'consumible'),
  nombre: Joi.string().trim().min(2).max(150),
  marca: Joi.string().trim().max(120).allow('', null),
  modelo: Joi.string().trim().max(120).allow('', null),
  categoria: Joi.string().trim().max(120).allow('', null),
  tracking_mode: Joi.string().valid('serial', 'lote', 'cantidad'),
  retorno_mode: Joi.string().valid('retornable', 'consumible'),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope'),
  requiere_vencimiento: Joi.boolean(),
  unidad_medida: Joi.string().trim().max(50),
  estado: Joi.string().valid('activo', 'inactivo'),
}).min(1);

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
