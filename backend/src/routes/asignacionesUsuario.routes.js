'use strict';

const express = require('express');
const Joi = require('joi');
const AsignacionesUsuarioController = require('../controllers/asignacionesUsuario.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic, parseMultipartPayload } = require('../middleware/upload');

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

const validateBody = (schema) => async (req, _res, next) => {
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

const validateQuery = (schema) => async (req, _res, next) => {
  try {
    const validated = await schema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    Object.defineProperty(req, 'query', { value: validated, writable: true, configurable: true });
    return next();
  } catch (error) {
    return next(error);
  }
};

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

// ── Schemas ──────────────────────────────────────────────────────────────────

const getMiasQuerySchema = Joi.object({
  tipo: Joi.string().trim().max(100).allow('', null),
  search: Joi.string().trim().max(200).allow('', null),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

const assignSchema = Joi.object({
  usuario_id: uuid.required(),
  articulo_ids: Joi.array().items(uuid.required()).min(1).max(50).required(),
  origen_tipo: Joi.string().valid('bodega', 'usuario').required(),
  bodega_origen_id: uuid.when('origen_tipo', {
    is: 'bodega',
    then: Joi.required(),
    otherwise: Joi.allow(null, '').optional(),
  }),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const entregarATrabajadorSchema = Joi.object({
  trabajador_id: uuid.required(),
  proyecto_destino_id: uuid.required(),
  articulo_ids: Joi.array().items(uuid.required()).min(1).max(50).required(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  fecha_devolucion_esperada: Joi.date().iso().allow(null),
});

const devolverBodegaSchema = Joi.object({
  articulo_ids: Joi.array().items(uuid.required()).min(1).max(50).required(),
  bodega_destino_id: uuid.required(),
  notas: Joi.string().trim().max(1000).allow('', null),
});

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/asignaciones-usuario/mias — artículos asignados al usuario autenticado
router.get(
  '/mias',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(getMiasQuerySchema),
  AsignacionesUsuarioController.getMias
);

// POST /api/asignaciones-usuario — asignar artículos a un usuario (solo admin)
router.post(
  '/',
  authMiddleware,
  checkRole(['admin']),
  validateBody(assignSchema),
  AsignacionesUsuarioController.assign
);

// POST /api/asignaciones-usuario/entregar-a-trabajador — entregar desde usuario a trabajador
router.post(
  '/entregar-a-trabajador',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  imageUpload.single('foto'),
  validateImageMagic,
  parseMultipartPayload,
  validateBody(entregarATrabajadorSchema),
  AsignacionesUsuarioController.deliverToTrabajador
);

// POST /api/asignaciones-usuario/devolver-bodega — devolver artículos a bodega
router.post(
  '/devolver-bodega',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(devolverBodegaSchema),
  AsignacionesUsuarioController.devolverBodega
);

module.exports = router;
