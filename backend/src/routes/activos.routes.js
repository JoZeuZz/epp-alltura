// backend/src/routes/activos.routes.js
const express = require('express');
const Joi = require('joi');
const ActivosController = require('../controllers/activos.controller');
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

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const entregarSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').default('ok'),
  notas: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
  firma_imagen_url: Joi.string().trim().min(10).required(),
});

const devolverSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_recepcion_id: uuid.required(),
  condicion_entrada: Joi.string().valid('ok', 'usado', 'danado', 'perdido').default('ok'),
  disposicion: Joi.string().valid('devuelto', 'perdido', 'baja', 'mantencion').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  firma_imagen_url: Joi.string().trim().min(10).required(),
});

router.post(
  '/:id/entregar',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(entregarSchema),
  ActivosController.entregar
);

router.post(
  '/:id/devolver',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(devolverSchema),
  ActivosController.devolver
);

module.exports = router;
