/**
 * Middleware para el manejo centralizado de errores
 */

const logger = require('../lib/logger');

// Middleware para errores de validación
const handleValidationError = (err) => {
  return {
    status: 400,
    message: 'Error de validación',
    errors: err.errors || [err.message]
  };
};

// Middleware para errores de base de datos
const handleDatabaseError = (err) => {
  console.error('Database error:', err);
  return {
    status: 500,
    message: 'Error en la base de datos',
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

const standardErrorResponse = (status, message, data = null) => ({
  success: false,
  message,
  data,
});

// Middleware global de manejo de errores
const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Loggear el error usando el logger centralizado
  logger.error(`Error ${status} - ${message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  // Determinar el tipo de error y manejarlo apropiadamente
  let errorResponse;

  if (err.name === 'ValidationError') {
    errorResponse = handleValidationError(err);
  } else if (err.name === 'DatabaseError' || err.code === '23505') { // 23505 es el código de error de PostgreSQL para violación de unicidad
    errorResponse = handleDatabaseError(err);
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    errorResponse = handleAuthError(err);
  } else {
    // Error genérico
    errorResponse = {
      status: err.status || 500,
      message: err.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? err : {}
    };
  }

  // Registrar el error para monitoreo
  if (errorResponse.status >= 500) {
    console.error('Error crítico:', err);
  }

  console.error(err.stack);
  res.status(status).json(standardErrorResponse(status, message));
};

module.exports = errorHandler;