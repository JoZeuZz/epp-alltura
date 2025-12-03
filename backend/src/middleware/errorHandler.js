/**
 * Middleware para el manejo centralizado de errores
 * Mejorado con soporte para múltiples errores de validación Joi
 */

const logger = require('../lib/logger');

// Middleware para errores de validación Joi
const handleJoiValidationError = (err) => {
  const errors = err.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
  
  return {
    status: 400,
    message: 'Error de validación',
    errors: errors
  };
};

// Middleware para errores de validación genéricos
const handleValidationError = (err) => {
  return {
    status: 400,
    message: 'Error de validación',
    errors: err.errors || [err.message]
  };
};

// Middleware para errores de base de datos
const handleDatabaseError = (err) => {
  logger.error('Database error:', err);
  
  // Manejo específico de errores de PostgreSQL
  let message = 'Error en la base de datos';
  if (err.code === '23505') {
    message = 'El registro ya existe (violación de unicidad)';
  } else if (err.code === '23503') {
    message = 'Violación de llave foránea';
  } else if (err.code === '23502') {
    message = 'Campo requerido faltante';
  }
  
  return {
    status: 500,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  };
};

// Middleware para errores de autenticación
const handleAuthError = (err) => {
  return {
    status: 401,
    message: 'Error de autenticación',
    error: err.message
  };
};

// Middleware global de manejo de errores
const errorHandler = (err, req, res, _next) => {
  // Loggear el error usando el logger centralizado
  logger.error(`Error en ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Determinar el tipo de error y manejarlo apropiadamente
  let errorResponse;

  // Errores de validación Joi
  if (err.isJoi) {
    errorResponse = handleJoiValidationError(err);
  } else if (err.name === 'ValidationError') {
    errorResponse = handleValidationError(err);
  } else if (err.name === 'DatabaseError' || err.code?.startsWith('23')) {
    errorResponse = handleDatabaseError(err);
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    errorResponse = handleAuthError(err);
  } else {
    // Error genérico
    errorResponse = {
      status: err.statusCode || err.status || 500,
      message: err.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
    };
  }

  // Enviar respuesta
  const status = errorResponse.status;
  const response = {
    success: false,
    message: errorResponse.message,
    ...(errorResponse.errors && { errors: errorResponse.errors }),
    ...(errorResponse.error && { error: errorResponse.error })
  };

  res.status(status).json(response);
};

module.exports = errorHandler;