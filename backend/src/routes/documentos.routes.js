const express = require('express');
const Joi = require('joi');
const DocumentosController = require('../controllers/documentos.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { documentUpload, validateDocumentMagic } = require('../middleware/upload');

const router = express.Router();

const validateBody = (schema) => {
  return async (req, _res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const createAnexoSchema = Joi.object({
  entidad_tipo: Joi.string().valid('entrega', 'devolucion').required(),
  entidad_id: uuid.required(),
  tipo: Joi.string().valid('informe').default('informe'),
});

const ensureDocumentFile = (req, _res, next) => {
  if (req.file) {
    return next();
  }

  const error = new Error('Debe adjuntar un archivo en el campo "archivo".');
  error.statusCode = 400;
  return next(error);
};

router.post(
  '/anexos',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  documentUpload.single('archivo'),
  validateDocumentMagic,
  validateBody(createAnexoSchema),
  ensureDocumentFile,
  DocumentosController.createAnexo
);

module.exports = router;
