const jwt = require('jsonwebtoken');
const redisClient = require('../lib/redis');
const { logger } = require('../lib/logger');
const UsuarioModel = require('../models/usuario');
const {
  toDbRole,
  toExternalRole,
  normalizeDbRoles,
  buildCompatibleRoles,
} = require('../lib/roleUtils');
const { buildErrorResponse } = require('../lib/apiResponse');

/**
 * Configuración de tokens JWT
 * 
 * SECURITY IMPROVEMENTS:
 * - Access token: 15 minutos (reducido de 8 horas)
 * - Refresh token: 7 días
 * - Blacklist persistente en Redis
 * - Token rotation en refresh
 * - Anomaly detection
 */
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m', // 15 minutos
  REFRESH_TOKEN_EXPIRY: '7d', // 7 días
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60, // Para Redis TTL
  REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // Para Redis TTL
};

const enrichTokenUser = (user = {}) => {
  const { dbRoles, compatibleRoles } = buildCompatibleRoles(
    user.roles_db || user.roles || user.role
  );

  const primaryDbRole = toDbRole(user.role_db || user.role || dbRoles[0] || 'trabajador');

  return {
    ...user,
    role: toExternalRole(primaryDbRole),
    role_db: primaryDbRole,
    roles: compatibleRoles,
    roles_db: dbRoles,
  };
};

/**
 * Revoca un token agregándolo a la blacklist
 * @param {string} token - JWT token a revocar
 */
async function revokeToken(token) {
  try {
    // Decodificar token para obtener tiempo de expiración
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      logger.warn('Token inválido para revocar');
      return;
    }

    // Calcular tiempo hasta expiración
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;

    if (expiresIn > 0) {
      await redisClient.blacklistToken(token, expiresIn);
      logger.info(`Token revocado exitosamente para usuario ${decoded.user?.id}`);
    }
  } catch (error) {
    logger.error('Error revocando token:', error);
    throw error;
  }
}

/**
 * Middleware de autenticación principal
 * 
 * SECURITY FEATURES:
 * - Verifica formato Bearer token
 * - Verifica firma JWT
 * - Verifica token no esté en blacklist (Redis)
 * - Verifica usuario no esté bloqueado
 * - Detecta anomalías de acceso
 * - Registra información de sesión
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extraer token del header Authorization
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res
        .status(401)
        .json(buildErrorResponse('No token, authorization denied', ['AUTH_HEADER_REQUIRED']));
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res
        .status(401)
        .json(buildErrorResponse('Token format is "Bearer <token>"', ['AUTH_HEADER_INVALID']));
    }

    const token = tokenParts[1];

    // 2. Verificar si el token está en la blacklist (Redis)
    const isBlacklisted = await redisClient.isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.warn('Intento de uso de token revocado');
      return res.status(401).json(buildErrorResponse('Token revocado', ['TOKEN_REVOKED']));
    }

    // 3. Verificar firma JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = enrichTokenUser(decoded.user || {});

    // 4. Verificar estado actual del usuario en base de datos
    const userRecord = await UsuarioModel.findById(req.user.id);
    if (!userRecord) {
      return res
        .status(401)
        .json(buildErrorResponse('Usuario no encontrado', ['USER_NOT_FOUND']));
    }

    if (userRecord.estado === 'bloqueado') {
      return res.status(403).json(buildErrorResponse('Cuenta bloqueada', ['ACCOUNT_BLOCKED']));
    }

    if (userRecord.estado === 'inactivo') {
      return res.status(403).json(buildErrorResponse('Cuenta inactiva', ['ACCOUNT_INACTIVE']));
    }

    // 5. Extraer información de la petición
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'unknown';

    // 6. Detectar anomalías de acceso
    const anomaly = await redisClient.detectAnomaly(req.user.id, ip, userAgent);
    if (anomaly.anomalous) {
      logger.warn(`⚠️  Acceso anómalo detectado para usuario ${req.user.id}: ${anomaly.reason}`);
      // Podrías enviar alerta por email/Slack aquí
      // Por ahora solo logueamos, pero permitimos el acceso
      // En producción, podrías bloquear o requerir 2FA
    }

    // 7. Registrar sesión para análisis futuro
    await redisClient.recordSession(req.user.id, ip, userAgent);

    // 8. Agregar información adicional al request
    req.sessionInfo = { ip, userAgent };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(buildErrorResponse('Token expirado', ['TOKEN_EXPIRED']));
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json(buildErrorResponse('Token inválido', ['TOKEN_INVALID']));
    }

    logger.error('Error en autenticación:', err);
    res.status(401).json(buildErrorResponse('Token is not valid', ['TOKEN_INVALID']));
  }
};

/**
 * Genera par de tokens (access + refresh)
 * @param {Object} user - Objeto de usuario
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
async function generateTokenPair(user) {
  const dbRoles = normalizeDbRoles(user.roles || user.role);
  const primaryDbRole = toDbRole(user.role || dbRoles[0] || 'trabajador');
  const { compatibleRoles } = buildCompatibleRoles(dbRoles);
  const primaryRole = toExternalRole(primaryDbRole);
  const email = user.email_login || user.email || '';
  const firstName = user.nombres || user.first_name || '';
  const lastName = user.apellidos || user.last_name || '';

  const payload = {
    user: {
      id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: primaryRole,
      role_db: primaryDbRole,
      roles: compatibleRoles,
      roles_db: dbRoles,
      estado: user.estado || 'activo',
    },
  };

  // Access token (15 minutos)
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
    issuer: 'alltura-api',
    audience: 'alltura-client',
  });

  // Refresh token (7 días)
  const refreshTokenPayload = {
    user: { id: user.id },
    type: 'refresh',
  };

  const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
    issuer: 'alltura-api',
    audience: 'alltura-client',
  });

  // Almacenar refresh token en Redis
  await redisClient.storeRefreshToken(
    user.id,
    refreshToken,
    TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS
  );

  return { accessToken, refreshToken };
}

/**
 * Middleware que verifica si el usuario debe cambiar su contraseña
 * Debe usarse DESPUÉS de authMiddleware
 */
const checkPasswordChangeRequired = async (req, res, next) => {
  try {
    const user = await UsuarioModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json(buildErrorResponse('Usuario no encontrado', ['USER_NOT_FOUND']));
    }

    if (user.estado !== 'activo') {
      return res
        .status(403)
        .json(buildErrorResponse('La cuenta no está activa', ['ACCOUNT_NOT_ACTIVE']));
    }

    next();
  } catch (error) {
    logger.error('Error verificando cambio de contraseña requerido:', error);
    next(error);
  }
};

module.exports = {
  authMiddleware,
  revokeToken,
  generateTokenPair,
  checkPasswordChangeRequired,
  TOKEN_CONFIG,
};
