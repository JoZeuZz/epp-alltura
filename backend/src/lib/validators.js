const Joi = require('joi');

/**
 * Validaciones adicionales para el sistema de andamios
 * Incluye validaciones personalizadas y esquemas reutilizables
 */

/**
 * Schema de validación para cambio de estado de tarjeta
 */
const cardStatusSchema = Joi.object({
  card_status: Joi.string()
    .valid('green', 'red')
    .required()
    .messages({
      'any.only': 'El estado de tarjeta debe ser "green" o "red"',
      'any.required': 'El estado de tarjeta es obligatorio',
    }),
});

/**
 * Schema de validación para cambio de estado de armado
 */
const assemblyStatusSchema = Joi.object({
  assembly_status: Joi.string()
    .valid('assembled', 'disassembled')
    .required()
    .messages({
      'any.only': 'El estado de armado debe ser "assembled" o "disassembled"',
      'any.required': 'El estado de armado es obligatorio',
    }),
  disassembly_notes: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Las notas de desarmado no pueden exceder 2000 caracteres',
    }),
});

/**
 * Schema de validación para asignación de usuario
 */
const assignUserSchema = Joi.object({
  clientId: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del cliente debe ser un número',
      'number.integer': 'El ID del cliente debe ser un número entero',
      'number.positive': 'El ID del cliente debe ser un número positivo',
    }),
  supervisorId: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del supervisor debe ser un número',
      'number.integer': 'El ID del supervisor debe ser un número entero',
      'number.positive': 'El ID del supervisor debe ser un número positivo',
    }),
}).or('clientId', 'supervisorId');

/**
 * Validador personalizado: validar que progreso sea 100% si se marca como armado
 */
const validateProgressForAssembled = (scaffoldData) => {
  if (scaffoldData.assembly_status === 'assembled' && scaffoldData.progress_percentage < 100) {
    throw new Error('El andamio debe tener 100% de progreso para marcarse como armado');
  }
  return true;
};

/**
 * Validador personalizado: validar que imagen de desarmado exista al desarmar
 */
const validateDisassemblyImage = (assembly_status, disassembly_image) => {
  if (assembly_status === 'disassembled' && !disassembly_image) {
    throw new Error('Se requiere imagen de desarmado al cambiar estado a desarmado');
  }
  return true;
};

/**
 * Validador: no permitir tarjeta verde si está desarmado
 */
const validateGreenCardNotDisassembled = (card_status, assembly_status) => {
  if (card_status === 'green' && assembly_status === 'disassembled') {
    throw new Error('No se puede poner tarjeta verde mientras el andamio esté desarmado');
  }
  return true;
};

/**
 * Validador: verificar que las dimensiones sean razonables
 */
const validateDimensions = (height, width, depth) => {
  if (height <= 0 || width <= 0 || depth <= 0) {
    throw new Error('Las dimensiones deben ser mayores a cero');
  }
  if (height > 999.99 || width > 999.99 || depth > 999.99) {
    throw new Error('Las dimensiones no pueden exceder 999.99 metros');
  }
  return true;
};

/**
 * Sanitizar entrada de texto para prevenir XSS
 */
const sanitizeText = (text) => {
  if (!text) return text;
  return text
    .replace(/[<>]/g, '') // Eliminar < y >
    .trim();
};

/**
 * Validar formato de imagen (extensiones permitidas)
 */
const validateImageFormat = (filename) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Formato de imagen no permitido. Use JPG, PNG, GIF o WebP');
  }
  return true;
};

/**
 * Validar tamaño de archivo de imagen (máximo 10MB)
 */
const validateImageSize = (fileSize) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (fileSize > maxSize) {
    throw new Error('El tamaño de la imagen no puede exceder 10MB');
  }
  return true;
};

module.exports = {
  cardStatusSchema,
  assemblyStatusSchema,
  assignUserSchema,
  validateProgressForAssembled,
  validateDisassemblyImage,
  validateGreenCardNotDisassembled,
  validateDimensions,
  sanitizeText,
  validateImageFormat,
  validateImageSize,
};
