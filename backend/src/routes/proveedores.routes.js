const express = require('express');
const Joi = require('joi');
const ProveedoresController = require('../controllers/proveedores.controller');
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

const proveedorSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150).required(),
  rut: Joi.string().trim().max(20).allow('', null),
  email: Joi.string().trim().email({ tlds: { allow: false } }).allow('', null),
  telefono: Joi.string().trim().max(30).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
});

router.get('/', authMiddleware, checkRole(['admin', 'supervisor']), ProveedoresController.list);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(proveedorSchema),
  ProveedoresController.create
);

module.exports = router;
