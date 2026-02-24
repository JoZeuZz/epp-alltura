/**
 * Middleware para el manejo centralizado de errores
 * Mejorado con soporte para múltiples errores de validación Joi
 */

const { logger } = require('../lib/logger');

const SENSITIVE_KEY_PATTERN = /(password|pass|token|refresh|access|authorization|secret|api[-_]?key|jwt)/i;

const redactSensitive = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, seen));
  }

  const sanitized = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitive(val, seen);
    }
  }
  return sanitized;
};

const getMaxImageMb = () => {
  const maxBytes = parseInt(process.env.IMAGE_MAX_BYTES || '0', 10);
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    return null;
  }
  return Math.max(1, Math.round(maxBytes / (1024 * 1024)));
};

// Middleware para errores de validación Joi
const handleJoiValidationError = (err) => {
  // Mapear errores de Joi a un formato estructurado por campo
  const fieldErrors = {};
  const errors = [];
  
  err.details.forEach(detail => {
    const fieldName = detail.path.join('.');
    const errorInfo = {
      field: fieldName,
      message: detail.message,
      type: detail.type
    };
    
    // Guardar en objeto de errores por campo para acceso rápido
    fieldErrors[fieldName] = detail.message;
    errors.push(errorInfo);
  });
  
  return {
    status: 400,
    message: 'Error de validación',
    errors: errors,
    fieldErrors: fieldErrors // Para fácil acceso en frontend
  };
};

// Middleware para errores de validación genéricos
const handleValidationError = (err) => {
  const errors = Array.isArray(err.errors)
    ? err.errors
    : err.errors
      ? [err.errors]
      : [{ message: err.message }];

  return {
    status: 400,
    message: 'Error de validación',
    errors,
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
    message,
    errors: [
      {
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
      },
    ],
  };
};

// Middleware para errores de autenticación
const handleAuthError = (err) => {
  return {
    status: 401,
    message: 'Error de autenticación',
    errors: [{ message: err.message }],
  };
};

// Errores de carga de archivos (multer)
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = getMaxImageMb();
    const message = maxMb
      ? `La imagen supera el tamaño máximo permitido (${maxMb} MB).`
      : 'La imagen supera el tamaño máximo permitido.';
    return {
      status: 413,
      message
    };
  }

  return {
    status: 400,
    message: err.message || 'Error en la carga de archivos'
  };
};

// Middleware global de manejo de errores
const errorHandler = (err, req, res, _next) => {
  const safeBody = redactSensitive(req.body);
  const safeParams = redactSensitive(req.params);
  const safeQuery = redactSensitive(req.query);

  // Loggear el error usando el logger centralizado
  logger.error(`Error en ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: err.stack,
    body: safeBody,
    params: safeParams,
    query: safeQuery,
    requestId: req.requestId,
  });

  // Determinar el tipo de error y manejarlo apropiadamente
  let errorResponse;

  // Errores de validación Joi
  if (err.isJoi) {
    errorResponse = handleJoiValidationError(err);
  } else if (err.name === 'ValidationError') {
    errorResponse = handleValidationError(err);
  } else if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    errorResponse = handleMulterError(err);
  } else if (err.name === 'DatabaseError' || err.code?.startsWith('23')) {
    errorResponse = handleDatabaseError(err);
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    errorResponse = handleAuthError(err);
  } else {
    const explicitErrors = Array.isArray(err.errors)
      ? err.errors
      : err.errors
        ? [err.errors]
        : null;

    // Error genérico
    errorResponse = {
      status: err.statusCode || err.status || 500,
      message: err.message || 'Error interno del servidor',
      errors:
        explicitErrors ||
        (process.env.NODE_ENV === 'development'
          ? [{ message: err.message || 'Error interno del servidor', stack: err.stack }]
          : [{ message: err.message || 'Error interno del servidor' }]),
    };
  }

  // Enviar respuesta
  const status = errorResponse.status;
  const errors = Array.isArray(errorResponse.errors)
    ? errorResponse.errors
    : errorResponse.error
      ? [errorResponse.error]
      : [];

  const response = {
    success: false,
    message: errorResponse.message,
    data: null,
    errors,
    requestId: req.requestId,
    ...(errorResponse.fieldErrors && { fieldErrors: errorResponse.fieldErrors }),
  };

  res.status(status).json(response);
};

module.exports = errorHandler;
