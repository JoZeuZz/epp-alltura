const express = require('express');
const Joi = require('joi');
const BodegasController = require('../controllers/bodegas.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const router = express.Router();

const validateBody = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.validateAsync(req.body, { abortEarly: false });
    return next();
  } catch (error) {
    return next(error);
  }
};

const bodegaCreateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150).required(),
  direccion: Joi.string().trim().max(500).allow('', null),
  ciudad: Joi.string().trim().max(100).allow('', null),
  descripcion: Joi.string().trim().max(500).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
});

const bodegaUpdateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150),
  direccion: Joi.string().trim().max(500).allow('', null),
  ciudad: Joi.string().trim().max(100).allow('', null),
  descripcion: Joi.string().trim().max(500).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo'),
}).min(1);

router.get('/', authMiddleware, BodegasController.list);
router.get('/:id', authMiddleware, BodegasController.getById);
router.post('/', authMiddleware, checkRole(['admin', 'supervisor']), validateBody(bodegaCreateSchema), BodegasController.create);
router.put('/:id', authMiddleware, checkRole(['admin', 'supervisor']), validateBody(bodegaUpdateSchema), BodegasController.update);
router.delete('/:id', authMiddleware, checkRole(['admin']), BodegasController.remove);

module.exports = router;
