const Joi = require('joi');

/**
 * Schemas de Validación Compartidos
 * Centralizados para uso en todas las rutas
 * 
 * Referencias:
 * - Joi Documentation: https://joi.dev/api/
 * - OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

/**
 * Patrones Regex Comunes
 * Centralizados para mantener consistencia
 */
const PATTERNS = {
  // RUT Chileno (12.345.678-9 o 12345678-9)
  RUT: /^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$|^\d{7,8}-[\dkK]$/,
  
  // Teléfono chileno específico (+56912345678 o 912345678)
  PHONE_CL: /^(\+?56)?[2-9]\d{8}$/,
  
  // Teléfono internacional genérico
  PHONE_INTL: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  
  // Nombres (solo letras, espacios, apóstrofes y guiones)
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
  
  // Alfanumérico con espacios y guiones
  ALPHANUMERIC: /^[a-zA-Z0-9\s-]+$/,
  
  // Slug URL-friendly
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  // UUID v4
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Coordenadas GPS
  LAT: /^-?([1-8]?[0-9]\.{1}\d+|90\.{1}0+)$/,
  LNG: /^-?((1[0-7]|[1-9]?)[0-9]\.{1}\d+|180\.{1}0+)$/,
};

/**
 * Mensajes de Error Personalizados en Español
 */
const MESSAGES = {
  required: 'El campo {#label} es obligatorio',
  string: {
    empty: 'El campo {#label} no puede estar vacío',
    min: 'El campo {#label} debe tener al menos {#limit} caracteres',
    max: 'El campo {#label} no puede exceder {#limit} caracteres',
    pattern: 'El campo {#label} no tiene el formato válido',
  },
  number: {
    base: 'El campo {#label} debe ser un número',
    min: 'El campo {#label} debe ser mayor o igual a {#limit}',
    max: 'El campo {#label} debe ser menor o igual a {#limit}',
    positive: 'El campo {#label} debe ser un número positivo',
    integer: 'El campo {#label} debe ser un número entero',
  },
  email: 'El email no es válido',
  url: 'La URL no es válida',
};

/**
 * Schemas Básicos Reutilizables
 */

// Email con validación estricta
const email = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } }) // Permitir cualquier TLD
  .max(255)
  .messages({
    'string.email': MESSAGES.email,
    'string.max': 'El email no puede exceder 255 caracteres',
  });

// Contraseña con requisitos de seguridad
const password = Joi.string()
  .min(12)
  .max(128)
  .messages({
    'string.min': 'La contraseña debe tener al menos 12 caracteres',
    'string.max': 'La contraseña no puede exceder 128 caracteres',
  });

// Nombre de persona (solo letras y espacios)
const personName = Joi.string()
  .trim()
  .min(2)
  .max(100)
  .pattern(PATTERNS.NAME)
  .messages({
    'string.pattern.base': 'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
  });

// RUT Chileno
const rut = Joi.string()
  .trim()
  .pattern(PATTERNS.RUT)
  .messages({
    'string.pattern.base': 'El RUT debe tener el formato válido (ej: 12.345.678-9 o 12345678-9)',
  });

// Teléfono (genérico)
const phoneNumber = Joi.string()
  .trim()
  .pattern(PATTERNS.PHONE_INTL)
  .messages({
    'string.pattern.base': 'El número de teléfono no tiene un formato válido',
  });

// URL con validación estricta
const url = Joi.string()
  .trim()
  .uri({
    scheme: ['http', 'https'],
  })
  .max(2048)
  .messages({
    'string.uri': MESSAGES.url,
    'string.max': 'La URL no puede exceder 2048 caracteres',
  });

// ID de base de datos (entero positivo)
const id = Joi.number()
  .integer()
  .positive()
  .messages({
    'number.base': 'El ID debe ser un número',
    'number.integer': 'El ID debe ser un número entero',
    'number.positive': 'El ID debe ser un número positivo',
  });

// Rol de usuario
const userRole = Joi.string()
  .valid('admin', 'supervisor', 'client')
  .messages({
    'any.only': 'El rol debe ser admin, supervisor o client',
  });

// Estado de proyecto
const projectStatus = Joi.string()
  .valid('active', 'completed')
  .messages({
    'any.only': 'El estado del proyecto debe ser active o completed',
  });

// Estado de armado de andamio
const assemblyStatus = Joi.string()
  .valid('assembled', 'disassembled', 'in_progress')
  .messages({
    'any.only': 'El estado de armado debe ser assembled, disassembled o in_progress',
  });

// Estado de tarjeta
const cardStatus = Joi.string()
  .valid('green', 'red')
  .messages({
    'any.only': 'El estado de tarjeta debe ser green o red',
  });

// Porcentaje (0-100)
const percentage = Joi.number()
  .integer()
  .min(0)
  .max(100)
  .messages({
    'number.min': 'El porcentaje debe ser al menos 0',
    'number.max': 'El porcentaje no puede exceder 100',
  });

// Dimensiones (metros, max 999.99)
const dimension = Joi.number()
  .positive()
  .max(999.99)
  .precision(2)
  .messages({
    'number.positive': 'La dimensión debe ser un número positivo',
    'number.max': 'La dimensión no puede exceder 999.99 metros',
  });

// Fecha ISO 8601
const isoDate = Joi.date()
  .iso()
  .messages({
    'date.format': 'La fecha debe estar en formato ISO 8601',
  });

// Texto corto (títulos, nombres)
const shortText = Joi.string()
  .trim()
  .min(1)
  .max(255)
  .messages({
    'string.empty': 'El campo no puede estar vacío',
    'string.max': 'El texto no puede exceder 255 caracteres',
  });

// Texto largo (descripciones, notas)
const longText = Joi.string()
  .trim()
  .max(2000)
  .allow('', null)
  .messages({
    'string.max': 'El texto no puede exceder 2000 caracteres',
  });

// UUID v4
const uuid = Joi.string()
  .pattern(PATTERNS.UUID)
  .messages({
    'string.pattern.base': 'El UUID no tiene un formato válido',
  });

// Coordenadas GPS
const latitude = Joi.string()
  .pattern(PATTERNS.LAT)
  .messages({
    'string.pattern.base': 'La latitud debe estar entre -90 y 90',
  });

const longitude = Joi.string()
  .pattern(PATTERNS.LNG)
  .messages({
    'string.pattern.base': 'La longitud debe estar entre -180 y 180',
  });

/**
 * Schemas Compuestos
 */

// Esquema para paginación
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().max(50).default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Esquema para búsqueda
const searchSchema = Joi.object({
  query: Joi.string().trim().max(255).allow(''),
  filters: Joi.object().unknown(true),
});

module.exports = {
  // Patrones
  PATTERNS,
  
  // Mensajes
  MESSAGES,
  
  // Schemas básicos
  email,
  password,
  personName,
  rut,
  phoneNumber,
  url,
  id,
  userRole,
  projectStatus,
  assemblyStatus,
  cardStatus,
  percentage,
  dimension,
  isoDate,
  shortText,
  longText,
  uuid,
  latitude,
  longitude,
  
  // Schemas compuestos
  paginationSchema,
  searchSchema,
};
