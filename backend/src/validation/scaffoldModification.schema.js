const Joi = require('joi');

// Esquemas de validación para modificaciones de andamios

const dimension = Joi.number().positive().max(100).precision(2).required()
  .messages({
    'number.base': 'La dimensión debe ser un número',
    'number.positive': 'La dimensión debe ser mayor a 0',
    'number.max': 'La dimensión no puede exceder 100 metros',
    'any.required': 'Esta dimensión es requerida'
  });

const reason = Joi.string().max(500).allow(null, '').optional()
  .messages({
    'string.max': 'El motivo no puede exceder 500 caracteres'
  });

const createModificationSchema = Joi.object({
  height: dimension,
  width: dimension,
  length: dimension,
  reason
});

const approveModificationSchema = Joi.object({
  // No requiere body, solo el ID en la URL
});

const rejectModificationSchema = Joi.object({
  rejection_reason: Joi.string().min(1).max(500).required()
    .messages({
      'string.empty': 'El motivo de rechazo es requerido',
      'string.min': 'El motivo de rechazo no puede estar vacío',
      'string.max': 'El motivo de rechazo no puede exceder 500 caracteres',
      'any.required': 'El motivo de rechazo es requerido'
    })
});

module.exports = {
  createModificationSchema,
  approveModificationSchema,
  rejectModificationSchema
};
