const winston = require('winston');
const path = require('path');

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
      environment: process.env.NODE_ENV || 'development',
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'alltura-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Archivo para todos los logs
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Archivo separado para errores
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    
    // Console en desarrollo
    ...(process.env.NODE_ENV !== 'production' ? [
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

module.exports = {
  logger,
  requestLogger,
  logDbOperation,
  logAuth,
  logBusinessError
};
