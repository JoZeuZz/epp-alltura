const express = require('express');
const Joi = require('joi');
const ProyectosController = require('../controllers/proyectos.controller');
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

const validateProyectoBusinessShape = (value, helpers) => {
  if (value.fecha_inicio && value.fecha_fin) {
    const inicio = new Date(value.fecha_inicio);
    const fin = new Date(value.fecha_fin);
    if (Number.isFinite(inicio.getTime()) && Number.isFinite(fin.getTime()) && fin < inicio) {
      return helpers.error('any.custom', { message: 'fecha_fin no puede ser anterior a fecha_inicio' });
    }
  }
  return value;
};

const proyectoCreateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150).required(),
  descripcion: Joi.string().trim().max(500).allow('', null),
  cliente: Joi.string().trim().max(150).allow('', null),
  sitio: Joi.string().trim().max(100).allow('', null),
  presupuesto_clp: Joi.number().integer().min(0).allow(null),
  estado: Joi.string().valid('activo', 'inactivo', 'finalizado').default('activo'),
  fecha_inicio: Joi.date().iso().allow(null),
  fecha_fin: Joi.date().iso().allow(null),
}).custom(validateProyectoBusinessShape, 'proyecto date validation').messages({ 'any.custom': '{{#message}}' });

const proyectoUpdateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150),
  descripcion: Joi.string().trim().max(500).allow('', null),
  cliente: Joi.string().trim().max(150).allow('', null),
  sitio: Joi.string().trim().max(100).allow('', null),
  presupuesto_clp: Joi.number().integer().min(0).allow(null),
  estado: Joi.string().valid('activo', 'inactivo', 'finalizado'),
  fecha_inicio: Joi.date().iso().allow(null),
  fecha_fin: Joi.date().iso().allow(null),
}).min(1).custom(validateProyectoBusinessShape, 'proyecto date validation update').messages({ 'any.custom': '{{#message}}' });

router.get('/', authMiddleware, ProyectosController.list);
router.get('/:id', authMiddleware, ProyectosController.getById);
router.post('/', authMiddleware, checkRole(['admin', 'supervisor']), validateBody(proyectoCreateSchema), ProyectosController.create);
router.put('/:id', authMiddleware, checkRole(['admin', 'supervisor']), validateBody(proyectoUpdateSchema), ProyectosController.update);
router.delete('/:id', authMiddleware, checkRole(['admin']), ProyectosController.remove);

module.exports = router;
