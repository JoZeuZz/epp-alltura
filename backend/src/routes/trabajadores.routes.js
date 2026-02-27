const express = require('express');
const Joi = require('joi');
const TrabajadoresController = require('../controllers/trabajadores.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { rut: rutValidator } = require('../lib/validation');

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

const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });

const trabajadorCreateSchema = Joi.object({
  persona_id: uuid,
  usuario_id: uuid.allow(null),
  rut: rutValidator,
  nombres: Joi.string().trim().min(2).max(150),
  apellidos: Joi.string().trim().min(2).max(150),
  telefono: Joi.string().trim().max(30).allow('', null),
  email: Joi.string().trim().email({ tlds: { allow: false } }).allow('', null),
  cargo: Joi.string().trim().max(120).allow('', null),
  fecha_ingreso: Joi.date().iso().allow(null),
  fecha_salida: Joi.date().iso().allow(null),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
});

const trabajadorUpdateSchema = Joi.object({
  persona_id: uuid,
  usuario_id: uuid.allow(null),
  rut: rutValidator,
  nombres: Joi.string().trim().min(2).max(150),
  apellidos: Joi.string().trim().min(2).max(150),
  telefono: Joi.string().trim().max(30).allow('', null),
  email: Joi.string().trim().email({ tlds: { allow: false } }).allow('', null),
  persona_estado: Joi.string().valid('activo', 'inactivo'),
  cargo: Joi.string().trim().max(120).allow('', null),
  fecha_ingreso: Joi.date().iso().allow(null),
  fecha_salida: Joi.date().iso().allow(null),
  estado: Joi.string().valid('activo', 'inactivo'),
}).min(1);

router.get('/', authMiddleware, TrabajadoresController.list);
router.get('/:id', authMiddleware, TrabajadoresController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(trabajadorCreateSchema),
  TrabajadoresController.create
);
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(trabajadorUpdateSchema),
  TrabajadoresController.update
);
router.delete('/:id', authMiddleware, checkRole(['admin']), TrabajadoresController.remove);

module.exports = router;
