'use strict';

const express = require('express');
const Joi = require('joi');
const PlantillasController = require('../controllers/plantillas.controller');
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
    req.body = await schema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
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

const plantillaSchema = Joi.object({
  tipo:           Joi.string().valid(...TIPOS).required(),
  nombre:         Joi.string().min(2).max(150).required(),
  marca:          Joi.string().max(120).optional().allow('', null),
  modelo:         Joi.string().max(120).optional().allow('', null),
  descripcion:    Joi.string().optional().allow('', null),
  foto_url:       Joi.string().uri().optional().allow('', null),
  manual_url:     Joi.string().uri().optional().allow('', null),
  especialidades: Joi.array().items(Joi.string().valid(...ESPECIALIDADES)).optional(),
  estado:         Joi.string().valid('activo', 'inactivo').optional(),
});

const plantillaUpdateSchema = plantillaSchema.fork(['tipo'], (s) => s.optional()).min(1);

const listQuerySchema = Joi.object({
  tipo:   Joi.string().valid(...TIPOS).optional(),
  estado: Joi.string().valid('activo', 'inactivo').optional(),
}).options({ allowUnknown: true });

router.use(authMiddleware);
router.use(checkRole(['admin', 'supervisor']));

router.get('/', validateQuery(listQuerySchema), PlantillasController.list);
router.get('/:id', PlantillasController.getById);

router.post(
  '/',
  articleUpload.fields([{ name: 'foto', maxCount: 1 }, { name: 'manual', maxCount: 1 }]),
  validateArticleFiles,
  parseMultipartPayload,
  validateBody(plantillaSchema),
  PlantillasController.create
);

router.patch(
  '/:id',
  articleUpload.fields([{ name: 'foto', maxCount: 1 }, { name: 'manual', maxCount: 1 }]),
  validateArticleFiles,
  parseMultipartPayload,
  validateBody(plantillaUpdateSchema),
  PlantillasController.update
);

router.post(
  '/:id/certificaciones',
  documentUpload.single('certificacion'),
  validateDocumentMagic,
  PlantillasController.addCertificacion
);

module.exports = router;
