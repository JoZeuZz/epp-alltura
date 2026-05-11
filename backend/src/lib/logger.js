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
      requestId: req.requestId,
      userId: req.user?.id,
      userRole: req.user?.role
    });
  });
  
  next();
};

module.exports = {
  logger,
  requestLogger,
};
