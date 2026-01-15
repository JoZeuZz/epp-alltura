const winston = require('winston');
const path = require('path');
const config = require('../config');

// Formato personalizado para logs estructurados
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'alltura-backend',
      environment: config.NODE_ENV,
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: config.LOGGING.LEVEL,
  format: logFormat,
  defaultMeta: { 
    service: 'alltura-backend',
    version: config.VERSION
  },
  transports: [
    // Archivo para todos los logs
    new winston.transports.File({ 
      filename: path.join(config.LOGGING.DIR, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Archivo separado para errores
    new winston.transports.File({ 
      filename: path.join(config.LOGGING.DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    
    // Console en desarrollo
    ...(config.IS_DEVELOPMENT ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ],
});

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      userRole: req.user?.role
    });
  });
  
  next();
};

// Función para logging de operaciones de base de datos
const logDbOperation = (operation, table, params = {}) => {
  logger.info('Database Operation', {
    operation,
    table,
    params: JSON.stringify(params),
    type: 'database'
  });
};

// Función para logging de autenticación
const logAuth = (action, userId, details = {}) => {
  logger.info('Authentication', {
    action,
    userId,
    ...details,
    type: 'auth'
  });
};

// Función para logging de errores de negocio
const logBusinessError = (operation, error, context = {}) => {
  logger.error('Business Error', {
    operation,
    error: error.message,
    stack: error.stack,
    ...context,
    type: 'business'
  });
};

// Función para logging de operaciones de seguridad
const logSecurity = (action, level = 'info', details = {}) => {
  logger[level]('Security Event', {
    action,
    ...details,
    type: 'security'
  });
};

// Función para logging de validaciones
const logValidation = (resource, errors, context = {}) => {
  logger.warn('Validation Failed', {
    resource,
    errors: Array.isArray(errors) ? errors : [errors],
    ...context,
    type: 'validation'
  });
};

// Función para logging de operaciones de archivos
const logFileOperation = (action, filename, details = {}) => {
  logger.info('File Operation', {
    action,
    filename,
    ...details,
    type: 'file'
  });
};

// Función para logging de notificaciones
const logNotification = (notificationType, recipient, status, details = {}) => {
  logger.info('Notification', {
    notificationType,
    recipient,
    status,
    ...details,
    type: 'notification'
  });
};

// Función para logging de cambios de estado
const logStateChange = (resource, oldState, newState, actor, details = {}) => {
  logger.info('State Change', {
    resource,
    oldState,
    newState,
    actor,
    ...details,
    type: 'state_change'
  });
};

// Función para logging de operaciones de cache
const logCache = (action, key, hit = null, details = {}) => {
  logger.debug('Cache Operation', {
    action,
    key,
    hit,
    ...details,
    type: 'cache'
  });
};

// Función para logging de métricas de performance
const logPerformance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level]('Performance Metric', {
    operation,
    duration,
    ...details,
    type: 'performance'
  });
};

module.exports = {
  logger,
  requestLogger,
  logDbOperation,
  logAuth,
  logBusinessError,
  logSecurity,
  logValidation,
  logFileOperation,
  logNotification,
  logStateChange,
  logCache,
  logPerformance
};
