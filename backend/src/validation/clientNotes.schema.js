const Joi = require('joi');

/**
 * Schema para crear una nota de cliente
 */
const createClientNoteSchema = Joi.object({
  target_type: Joi.string()
    .valid('scaffold', 'project')
    .required()
    .messages({
      'any.required': 'El tipo de objetivo es requerido',
      'any.only': 'El tipo de objetivo debe ser "scaffold" o "project"'
    }),
  
  scaffold_id: Joi.number()
    .integer()
    .positive()
    .when('target_type', {
      is: 'scaffold',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.required': 'El ID del andamio es requerido cuando target_type es "scaffold"',
      'number.base': 'El ID del andamio debe ser un número',
      'number.integer': 'El ID del andamio debe ser un entero',
      'number.positive': 'El ID del andamio debe ser positivo',
      'any.unknown': 'No se debe proporcionar scaffold_id cuando target_type es "project"'
    }),
  
  project_id: Joi.number()
    .integer()
    .positive()
    .when('target_type', {
      is: 'project',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.required': 'El ID del proyecto es requerido cuando target_type es "project"',
      'number.base': 'El ID del proyecto debe ser un número',
      'number.integer': 'El ID del proyecto debe ser un entero',
      'number.positive': 'El ID del proyecto debe ser positivo',
      'any.unknown': 'No se debe proporcionar project_id cuando target_type es "scaffold"'
    }),
  
  note_text: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'any.required': 'El texto de la nota es requerido',
      'string.empty': 'El texto de la nota no puede estar vacío',
      'string.min': 'El texto de la nota debe tener al menos 1 carácter',
      'string.max': 'El texto de la nota no puede exceder los 5000 caracteres'
    })
});

/**
 * Schema para actualizar una nota de cliente
 */
const updateClientNoteSchema = Joi.object({
  note_text: Joi.string()
    .trim()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'any.required': 'El texto de la nota es requerido',
      'string.empty': 'El texto de la nota no puede estar vacío',
      'string.min': 'El texto de la nota debe tener al menos 1 carácter',
      'string.max': 'El texto de la nota no puede exceder los 5000 caracteres'
    })
});

/**
 * Schema para resolver una nota
 */
const resolveClientNoteSchema = Joi.object({
  resolution_notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Las notas de resolución no pueden exceder los 1000 caracteres'
    })
});

/**
 * Schema para query params de listado de notas
 */
const listClientNotesQuerySchema = Joi.object({
  unresolved_only: Joi.boolean()
    .optional()
    .default(false),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
});

/**
 * Schema para crear una notificación
 */
const createNotificationSchema = Joi.object({
  user_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'El ID del usuario es requerido',
      'number.base': 'El ID del usuario debe ser un número',
      'number.integer': 'El ID del usuario debe ser un entero',
      'number.positive': 'El ID del usuario debe ser positivo'
    }),
  
  type: Joi.string()
    .valid(
      'new_client_note',
      'note_resolved',
      'scaffold_updated',
      'project_assigned',
      'note_urgent',
      'system'
    )
    .required()
    .messages({
      'any.required': 'El tipo de notificación es requerido',
      'any.only': 'Tipo de notificación no válido'
    }),
  
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'any.required': 'El título es requerido',
      'string.empty': 'El título no puede estar vacío',
      'string.max': 'El título no puede exceder los 200 caracteres'
    }),
  
  message: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'any.required': 'El mensaje es requerido',
      'string.empty': 'El mensaje no puede estar vacío',
      'string.max': 'El mensaje no puede exceder los 1000 caracteres'
    }),
  
  metadata: Joi.object()
    .optional()
    .allow(null),
  
  link: Joi.string()
    .uri({ relativeOnly: true })
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'El enlace debe ser una URI válida'
    })
});

/**
 * Schema para query params de listado de notificaciones
 */
const listNotificationsQuerySchema = Joi.object({
  unread_only: Joi.boolean()
    .optional()
    .default(false),
  
  type: Joi.string()
    .valid(
      'new_client_note',
      'note_resolved',
      'scaffold_updated',
      'project_assigned',
      'note_urgent',
      'system'
    )
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
});

module.exports = {
  createClientNoteSchema,
  updateClientNoteSchema,
  resolveClientNoteSchema,
  listClientNotesQuerySchema,
  createNotificationSchema,
  listNotificationsQuerySchema
};
