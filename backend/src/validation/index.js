/**
 * Validación - Índice Unificado
 *
 * Fuente única de schemas y custom validators para rutas.
 * Consolidado desde /lib/validation para evitar duplicación.
 */

const Joi = require('joi');
const sharedSchemas = require('../lib/validation/sharedSchemas');
const customValidators = require('../lib/validation/customValidators');

// Aliases y schemas adicionales usados por rutas actuales.
const shortString = Joi.string()
  .trim()
  .max(100)
  .messages({
    'string.max': 'El texto no puede exceder 100 caracteres',
  });

const entityName = Joi.string()
  .trim()
  .min(2)
  .max(255)
  .messages({
    'string.empty': 'El nombre es obligatorio',
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 255 caracteres',
  });

const address = Joi.string()
  .trim()
  .max(500)
  .allow('', null)
  .messages({
    'string.max': 'La dirección no puede exceder 500 caracteres',
  });

const notes = sharedSchemas.longText;

const decimal = sharedSchemas.dimension;

const idArray = Joi.array()
  .items(sharedSchemas.id)
  .min(1)
  .messages({
    'array.min': 'Debe proporcionar al menos un ID',
    'array.base': 'Debe ser un array de IDs',
  });

const pushSubscription = Joi.object({
  endpoint: sharedSchemas.url.required(),
  expirationTime: Joi.any().allow(null),
  keys: Joi.object({
    p256dh: Joi.string().required(),
    auth: Joi.string().required(),
  }).required(),
})
  .required()
  .messages({
    'any.required': 'La suscripción es obligatoria',
  });

// Override para usar validator.js donde aplica.
const phoneNumber = customValidators.joiPhone('any');

// Mantener compatibilidad con estados existentes en rutas.
const projectStatus = Joi.string()
  .valid('active', 'inactive', 'completed')
  .messages({
    'any.only': 'El estado debe ser active, inactive o completed',
  });

module.exports = {
  ...sharedSchemas,
  ...customValidators,

  // Overrides / aliases
  phoneNumber,
  projectStatus,
  shortString,
  entityName,
  address,
  notes,
  decimal,
  idArray,
  pushSubscription,

  // Alias útiles para mayor claridad
  schemas: {
    shared: sharedSchemas,
  },
};
