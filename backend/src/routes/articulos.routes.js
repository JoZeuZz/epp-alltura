'use strict';

const express = require('express');
const Joi = require('joi');
const ArticulosController = require('../controllers/articulos.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { imageUpload, validateImageMagic, parseMultipartPayload } = require('../middleware/upload');

const router = express.Router();

const validateBody = (schema) => async (req, _res, next) => {
  try {
    req.body = await schema.validateAsync(req.body, { abortEarly: false });
    return next();
  } catch (error) {
    return next(error);
  }
};

const validateQuery = (schema) => async (req, _res, next) => {
  try {
    req.query = await schema.validateAsync(req.query, { abortEarly: false, allowUnknown: true });
    return next();
  } catch (error) {
    return next(error);
  }
};

const TIPOS = ['epp', 'herramienta', 'equipo'];
const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'];
const ESTADOS = ['en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido'];
const ESTADOS_DIRECTOS = ['en_stock', 'mantencion', 'dado_de_baja', 'perdido'];

const createSchema = Joi.object({
  tipo:               Joi.string().valid(...TIPOS).required(),
  nombre:             Joi.string().min(2).max(150).required(),
  marca:              Joi.string().max(120).optional(),
  modelo:             Joi.string().max(120).optional(),
  descripcion:        Joi.string().optional(),
  nro_serie:          Joi.string().min(3).max(120).required(),
  valor:              Joi.number().integer().min(0).optional().default(0),
  bodega_id:          Joi.string().uuid().required(),
  especialidades:     Joi.array().items(Joi.string().valid(...ESPECIALIDADES)).optional(),
  fecha_vencimiento:  Joi.string().isoDate().optional(),
  foto_url:           Joi.string().uri().optional(),
});

const updateSchema = Joi.object({
  nombre:             Joi.string().min(2).max(150).optional(),
  marca:              Joi.string().max(120).optional(),
  modelo:             Joi.string().max(120).optional(),
  descripcion:        Joi.string().optional(),
  nro_serie:          Joi.string().min(3).max(120).optional(),
  valor:              Joi.number().integer().min(0).optional(),
  especialidades:     Joi.array().items(Joi.string().valid(...ESPECIALIDADES)).optional(),
  fecha_vencimiento:  Joi.string().isoDate().optional().allow(null, ''),
  foto_url:           Joi.string().uri().optional(),
}).min(1);

const cambiarEstadoSchema = Joi.object({
  nuevo_estado:      Joi.string().valid(...ESTADOS_DIRECTOS).required(),
  motivo:            Joi.string().min(3).optional(),
  bodega_destino_id: Joi.string().uuid().optional(),
});

const listQuerySchema = Joi.object({
  tipo:        Joi.string().valid(...TIPOS).optional(),
  estado:      Joi.string().valid(...ESTADOS).optional(),
  bodega_id:   Joi.string().uuid().optional(),
  proyecto_id: Joi.string().uuid().optional(),
  especialidad: Joi.string().valid(...ESPECIALIDADES).optional(),
  search:      Joi.string().optional(),
  limit:       Joi.number().integer().min(1).max(1000).optional(),
  offset:      Joi.number().integer().min(0).optional(),
}).options({ allowUnknown: true });

router.use(authMiddleware);

// List articles
router.get('/',
  validateQuery(listQuerySchema),
  ArticulosController.list
);

// Get single article
router.get('/:id', ArticulosController.getById);

// Create article (admin + supervisor)
router.post('/',
  checkRole(['admin', 'supervisor']),
  imageUpload.single('foto'),
  validateImageMagic,
  parseMultipartPayload,
  validateBody(createSchema),
  ArticulosController.create
);

// Update article (admin + supervisor)
router.put('/:id',
  checkRole(['admin', 'supervisor']),
  imageUpload.single('foto'),
  validateImageMagic,
  parseMultipartPayload,
  validateBody(updateSchema),
  ArticulosController.update
);

// Change state directly (admin + supervisor)
router.post('/:id/estado',
  checkRole(['admin', 'supervisor']),
  validateBody(cambiarEstadoSchema),
  ArticulosController.cambiarEstado
);

// Permanent delete (admin only)
router.delete('/:id',
  checkRole(['admin']),
  ArticulosController.removePermanent
);

module.exports = router;
