'use strict';

const express = require('express');
const Joi = require('joi');
const ArticulosController = require('../controllers/articulos.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const {
  articleUpload,
  documentUpload,
  validateArticleFiles,
  validateDocumentMagic,
  parseMultipartPayload,
} = require('../middleware/upload');

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
    const validated = await schema.validateAsync(req.query, { abortEarly: false, allowUnknown: true });
    Object.defineProperty(req, 'query', { value: validated, writable: true, configurable: true });
    return next();
  } catch (error) {
    return next(error);
  }
};

const TIPOS          = ['epp', 'herramienta', 'equipo'];
const ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'];
const ESTADOS        = ['en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido'];
const ESTADOS_DIRECTOS = ['en_stock', 'mantencion', 'dado_de_baja', 'perdido'];

const createSchema = Joi.object({
  tipo:              Joi.string().valid(...TIPOS).required(),
  nombre:            Joi.string().min(2).max(150).required(),
  marca:             Joi.string().max(120).optional(),
  modelo:            Joi.string().max(120).optional(),
  descripcion:       Joi.string().optional(),
  nro_serie:         Joi.string().min(3).max(120).required(),
  valor:             Joi.number().integer().min(0).optional().default(0),
  bodega_id:         Joi.string().uuid().required(),
  especialidades:    Joi.array().items(Joi.string().valid(...ESPECIALIDADES)).optional(),
  fecha_vencimiento: Joi.string().isoDate().optional().allow(null, ''),
  fecha_compra:      Joi.string().isoDate().optional().allow(null, ''),
  proveedor_id:      Joi.string().uuid().optional().allow(null, ''),
  factura_url:       Joi.string().uri().optional().allow(null, ''),
  manual_url:        Joi.string().uri().optional().allow(null, ''),
  foto_url:          Joi.string().uri().optional(),
});

const updateSchema = Joi.object({
  nombre:            Joi.string().min(2).max(150).optional(),
  marca:             Joi.string().max(120).optional(),
  modelo:            Joi.string().max(120).optional(),
  descripcion:       Joi.string().optional(),
  nro_serie:         Joi.string().min(3).max(120).optional(),
  valor:             Joi.number().integer().min(0).optional(),
  especialidades:    Joi.array().items(Joi.string().valid(...ESPECIALIDADES)).optional(),
  fecha_vencimiento: Joi.string().isoDate().optional().allow(null, ''),
  fecha_compra:      Joi.string().isoDate().optional().allow(null, ''),
  proveedor_id:      Joi.string().uuid().optional().allow(null, ''),
  factura_url:       Joi.string().uri().optional().allow(null, ''),
  manual_url:        Joi.string().uri().optional().allow(null, ''),
  foto_url:          Joi.string().uri().optional(),
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

router.get('/',
  validateQuery(listQuerySchema),
  ArticulosController.list
);

router.get('/:id', ArticulosController.getById);

router.post('/',
  checkRole(['admin', 'supervisor']),
  articleUpload.fields([
    { name: 'foto',    maxCount: 1 },
    { name: 'factura', maxCount: 1 },
    { name: 'manual',  maxCount: 1 },
  ]),
  validateArticleFiles,
  parseMultipartPayload,
  validateBody(createSchema),
  ArticulosController.create
);

router.put('/:id',
  checkRole(['admin', 'supervisor']),
  articleUpload.fields([
    { name: 'foto',    maxCount: 1 },
    { name: 'factura', maxCount: 1 },
    { name: 'manual',  maxCount: 1 },
  ]),
  validateArticleFiles,
  parseMultipartPayload,
  validateBody(updateSchema),
  ArticulosController.update
);

router.post('/:id/estado',
  checkRole(['admin', 'supervisor']),
  validateBody(cambiarEstadoSchema),
  ArticulosController.cambiarEstado
);

router.post('/:id/certificaciones',
  checkRole(['admin', 'supervisor']),
  documentUpload.single('certificacion'),
  validateDocumentMagic,
  ArticulosController.addCertificacion
);

router.delete('/:id/certificaciones/:certId',
  checkRole(['admin', 'supervisor']),
  ArticulosController.deleteCertificacion
);

router.delete('/:id',
  checkRole(['admin']),
  ArticulosController.removePermanent
);

module.exports = router;
