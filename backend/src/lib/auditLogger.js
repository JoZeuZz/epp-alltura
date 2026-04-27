const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * Sistema de logging y auditoría para el backend
 * Registra acciones importantes del sistema en archivos separados
 * Complementa a Winston logger con auditoría en archivos específicos
 */

const LOG_DIR = path.join(__dirname, '../../logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Formatea un mensaje de log con timestamp
 */
function formatLogMessage(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(metadata).length > 0 
    ? JSON.stringify(metadata) 
    : '';
  
  return `[${timestamp}] [${level}] ${message} ${metaString}\n`;
}

/**
 * Escribe en un archivo de log
 */
function writeToLog(filePath, message) {
  try {
    fs.appendFileSync(filePath, message, 'utf8');
  } catch (error) {
    logger.error('Error writing to audit log file', { 
      error: error.message,
      filePath 
    });
  }
}

/**
 * Log de auditoría - Para acciones importantes del sistema
 */
function logAudit(action, userId, details = {}) {
  const message = formatLogMessage('AUDIT', action, {
    userId,
    ...details,
  });
  writeToLog(AUDIT_LOG_FILE, message);
  logger.info('Audit event', { action, userId, ...details });
}

/**
 * Log de errores - Para errores del sistema
 */
function logError(error, context = {}) {
  const message = formatLogMessage('ERROR', error.message || error, {
    stack: error.stack,
    ...context,
  });
  writeToLog(ERROR_LOG_FILE, message);
  logger.error('Audit error logged', { 
    error: error.message || error,
    stack: error.stack,
    ...context 
  });
}

/**
 * Log de acceso - Para registrar accesos a endpoints
 */
function logAccess(method, path, userId, statusCode, duration) {
  const message = formatLogMessage('ACCESS', `${method} ${path}`, {
    userId,
    statusCode,
    duration: `${duration}ms`,
  });
  writeToLog(ACCESS_LOG_FILE, message);
}

/**
 * Log de información general
 */
function logInfo(message, metadata = {}) {
  const formattedMessage = formatLogMessage('INFO', message, metadata);
  writeToLog(AUDIT_LOG_FILE, formattedMessage);
  logger.info('Audit info', { message, ...metadata });
}

/**
 * Middleware para registrar accesos
 */
function auditMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Guardar el método original res.json
  const originalJson = res.json;
  
  // Sobrescribir res.json para capturar la respuesta
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const userId = req.user?.id || 'anonymous';
    
    logAccess(req.method, req.path, userId, res.statusCode, duration);
    
    // Llamar al método original
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Eventos de auditoría predefinidos
 */
const AuditEvents = {
  // Autenticación
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  
  // Equipos
  ASSET_CREATED: 'ASSET_CREATED',
  ASSET_UPDATED: 'ASSET_UPDATED',
  ASSET_DELETED: 'ASSET_DELETED',
  ASSET_CARD_STATUS_CHANGED: 'ASSET_CARD_STATUS_CHANGED',
  ASSET_ASSEMBLY_STATUS_CHANGED: 'ASSET_ASSEMBLY_STATUS_CHANGED',
  
  // Proyectos
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  PROJECT_CLIENT_ASSIGNED: 'PROJECT_CLIENT_ASSIGNED',
  PROJECT_SUPERVISOR_ASSIGNED: 'PROJECT_SUPERVISOR_ASSIGNED',
  
  // Usuarios
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  
  // Accesos no autorizados
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS',
};

/**
 * Limpia logs antiguos (mantiene solo los últimos 30 días)
 */
function cleanOldLogs(days = 30) {
  const maxAge = days * 24 * 60 * 60 * 1000; // días a milisegundos
  const now = Date.now();
  
  [AUDIT_LOG_FILE, ERROR_LOG_FILE, ACCESS_LOG_FILE].forEach(logFile => {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        // Archivar el log viejo
        const archiveFile = logFile.replace('.log', `-${new Date().toISOString().split('T')[0]}.log`);
        fs.renameSync(logFile, archiveFile);
        logInfo(`Log file archived: ${archiveFile}`);
      }
    }
  });
}

/**
 * Obtiene las últimas N líneas de un archivo de log
 */
function getRecentLogs(logType = 'audit', lines = 100) {
  let logFile;
  
  switch (logType) {
    case 'audit':
      logFile = AUDIT_LOG_FILE;
      break;
    case 'error':
      logFile = ERROR_LOG_FILE;
      break;
    case 'access':
      logFile = ACCESS_LOG_FILE;
      break;
    default:
      throw new Error('Invalid log type');
  }
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  const content = fs.readFileSync(logFile, 'utf8');
  const allLines = content.split('\n').filter(line => line.trim());
  
  return allLines.slice(-lines);
}

module.exports = {
  logAudit,
  logError,
  logAccess,
  logInfo,
  auditMiddleware,
  AuditEvents,
  cleanOldLogs,
  getRecentLogs,
};
