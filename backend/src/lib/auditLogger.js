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

module.exports = {
  logAudit,
  AuditEvents,
};
