const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const PersonaModel = require('../models/persona');
const UsuarioModel = require('../models/usuario');
const RolModel = require('../models/rol');
const { generateTokenPair, revokeToken } = require('../middleware/auth');
const { logger } = require('../lib/logger');
const redisClient = require('../lib/redis');
const { PASSWORD_CONFIG } = require('../middleware/passwordPolicy');
const { toDbRole, toExternalRole, normalizeDbRoles, buildCompatibleRoles } = require('../lib/roleUtils');

const AUTH_LOGIN_LOCK_MAX_ATTEMPTS = Number.parseInt(
  process.env.AUTH_LOGIN_LOCK_MAX_ATTEMPTS || '',
  10
);
const AUTH_LOGIN_LOCK_THRESHOLD =
  Number.isFinite(AUTH_LOGIN_LOCK_MAX_ATTEMPTS) && AUTH_LOGIN_LOCK_MAX_ATTEMPTS > 0
    ? AUTH_LOGIN_LOCK_MAX_ATTEMPTS
    : 5;

/**
 * AuthService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Validaciones de autenticación
 * - Gestión de tokens (JWT, refresh)
 * - Gestión de sesiones y bloqueos
 * - Cambio de contraseñas
 * - Rate limiting y seguridad
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class AuthService {
  static normalizeEmail(userData = {}) {
    return (userData.email_login || userData.email || '').trim().toLowerCase();
  }

  static normalizeRole(role) {
    if (!role) return '';
    return toDbRole(role);
  }

  static buildUserResponse(user) {
    const dbRoles = normalizeDbRoles(user.roles || user.role);
    const { compatibleRoles } = buildCompatibleRoles(dbRoles);
    const dbPrimaryRole = toDbRole(user.role) || dbRoles[0] || null;
    const primaryRole = toExternalRole(dbPrimaryRole);

    return {
      id: user.id,
      email: user.email_login,
      email_login: user.email_login,
      first_name: user.nombres || '',
      last_name: user.apellidos || '',
      role: primaryRole,
      role_db: dbPrimaryRole,
      roles: compatibleRoles,
      roles_db: dbRoles,
      estado: user.estado,
      rut: user.rut || null,
    };
  }

  // ============================================
  // REGISTRO Y AUTENTICACIÓN
  // ============================================

  /**
   * Registrar un nuevo usuario
   * @param {object} userData - Datos del usuario
   * @returns {Promise<object>} Usuario creado con tokens
   */
  static async registerUser(userData) {
    const emailLogin = AuthService.normalizeEmail(userData);
    const roleName = AuthService.normalizeRole(userData.role);
    const nombres = (userData.nombres || userData.first_name || '').trim();
    const apellidos = (userData.apellidos || userData.last_name || '').trim();
    const telefono = userData.telefono || userData.phone_number || null;
    const rut = (userData.rut || '').trim();
    const password = userData.password || '';

    if (!emailLogin) {
      const error = new Error('Email is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!nombres || !apellidos) {
      const error = new Error('First name and last name are required.');
      error.statusCode = 400;
      throw error;
    }

    if (!rut) {
      const error = new Error('RUT is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!roleName) {
      const error = new Error('Role is not valid.');
      error.statusCode = 400;
      throw error;
    }

    const role = await RolModel.findByNombre(roleName);
    if (!role) {
      const error = new Error(`Role "${roleName}" is not valid.`);
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await UsuarioModel.findByEmailLogin(emailLogin);
    if (existingUser) {
      const error = new Error('User with this email already exists.');
      error.statusCode = 400;
      throw error;
    }

    const existingPersona = await PersonaModel.findByRut(rut);
    if (existingPersona) {
      const error = new Error('Person with this RUT already exists.');
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);
    const client = await db.pool.connect();
    let userId;

    try {
      await client.query('BEGIN');

      const personaResult = await client.query(
        `
        INSERT INTO persona (rut, nombres, apellidos, telefono, email, estado)
        VALUES ($1, $2, $3, $4, $5, 'activo')
        RETURNING id
        `,
        [rut, nombres, apellidos, telefono, emailLogin]
      );

      const personaId = personaResult.rows[0].id;

      const usuarioResult = await client.query(
        `
        INSERT INTO usuario (persona_id, email_login, password_hash, estado)
        VALUES ($1, $2, $3, 'activo')
        RETURNING id
        `,
        [personaId, emailLogin, passwordHash]
      );

      userId = usuarioResult.rows[0].id;

      await client.query(
        `
        INSERT INTO usuario_rol (usuario_id, rol_id)
        VALUES ($1, $2)
        `,
        [userId, role.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const user = await UsuarioModel.findByIdWithRoles(userId);
    const { accessToken, refreshToken } = await generateTokenPair(user);

    logger.info(`Usuario registrado exitosamente: ${emailLogin} (ID: ${user.id})`);

    return {
      message: 'User created successfully',
      user: AuthService.buildUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Autenticar usuario (login)
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @param {string} ip - IP del cliente
   * @param {string} userAgent - User agent del cliente
   * @returns {Promise<object>} Tokens y datos del usuario
   */
  static async loginUser(email, password, ip, userAgent) {
    // Verificar rate limiting por email (protección contra brute force)
    const normalizedEmail = (email || '').trim().toLowerCase();
    const failedAttempts = await redisClient.getFailedLoginCount(normalizedEmail);
    if (failedAttempts >= AUTH_LOGIN_LOCK_THRESHOLD) {
      logger.warn(`⚠️  Cuenta bloqueada temporalmente por múltiples intentos fallidos: ${email}`);
      const error = new Error(
        'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.'
      );
      error.statusCode = 429;
      error.code = 'ACCOUNT_TEMPORARILY_LOCKED';
      throw error;
    }

    // Buscar usuario por email_login
    const user = await UsuarioModel.findByEmailLoginWithRoles(normalizedEmail);
    if (!user) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(normalizedEmail);
      await redisClient.incrementFailedLogin(ip);

      logger.warn(`Intento de login fallido para email no existente: ${email}`);
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    if (user.estado === 'bloqueado') {
      const error = new Error('Account is blocked. Contact an administrator.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_BLOCKED';
      throw error;
    }

    if (user.estado === 'inactivo') {
      const error = new Error('Account is inactive.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    if (!Array.isArray(user.roles) || user.roles.length === 0) {
      const error = new Error('User has no roles assigned.');
      error.statusCode = 403;
      error.code = 'NO_ROLES_ASSIGNED';
      throw error;
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(normalizedEmail);
      await redisClient.incrementFailedLogin(ip);

      logger.warn(`Intento de login fallido para usuario: ${email} desde IP: ${ip}`);
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    // Login exitoso - resetear contador de intentos fallidos
    await redisClient.resetFailedLogin(normalizedEmail);
    await redisClient.resetFailedLogin(ip);

    // Generar par de tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    // Actualizar última conexión
    await UsuarioModel.updateLastLogin(user.id);

    logger.info(`✅ Login exitoso para usuario: ${email} desde IP: ${ip} (${userAgent})`);

    return {
      accessToken,
      refreshToken,
      user: AuthService.buildUserResponse(user),
    };
  }

  /**
   * Cerrar sesión de usuario
   * @param {number} userId - ID del usuario
   * @param {string} accessToken - Token de acceso actual
   * @returns {Promise<void>}
   */
  static async logoutUser(userId, accessToken) {
    // Revocar access token actual
    if (accessToken) {
      await revokeToken(accessToken);
    }

    // Revocar todos los refresh tokens del usuario
    await redisClient.revokeAllUserRefreshTokens(userId);

    logger.info(`Usuario ${userId} cerró sesión exitosamente`);
  }

  // ============================================
  // GESTIÓN DE TOKENS
  // ============================================

  /**
   * Refrescar access token usando refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} Nuevos tokens
   */
  static async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      error.statusCode = 400;
      throw error;
    }

    try {
      // Verificar firma del refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      if (decoded.type !== 'refresh') {
        const error = new Error('Invalid token type');
        error.statusCode = 401;
        throw error;
      }

      // Verificar que el refresh token esté en Redis
      const userId = decoded.user?.id;
      const isValid = await redisClient.isRefreshTokenValid(userId, refreshToken);
      if (!isValid) {
        logger.warn(`⚠️  Intento de uso de refresh token inválido para usuario ${userId}`);
        const error = new Error('Invalid or expired refresh token');
        error.statusCode = 401;
        error.code = 'REFRESH_TOKEN_INVALID';
        throw error;
      }

      // Obtener información actualizada del usuario
      const user = await UsuarioModel.findByIdWithRoles(userId);
      if (!user) {
        await redisClient.revokeRefreshToken(userId, refreshToken);
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      if (user.estado !== 'activo') {
        await redisClient.revokeAllUserRefreshTokens(user.id);
        const error = new Error('User account is not active');
        error.statusCode = 403;
        error.code = 'ACCOUNT_NOT_ACTIVE';
        throw error;
      }

      if (!Array.isArray(user.roles) || user.roles.length === 0) {
        await redisClient.revokeAllUserRefreshTokens(user.id);
        const error = new Error('User has no roles assigned');
        error.statusCode = 403;
        error.code = 'NO_ROLES_ASSIGNED';
        throw error;
      }

      // TOKEN ROTATION: Revocar el refresh token actual y generar uno nuevo
      await redisClient.revokeRefreshToken(user.id, refreshToken);

      // Generar nuevos tokens
      const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(user);

      logger.info(`✅ Tokens renovados exitosamente para usuario ${user.id}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Refresh token expired');
        err.statusCode = 401;
        err.code = 'REFRESH_TOKEN_EXPIRED';
        throw err;
      }

      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        err.code = 'REFRESH_TOKEN_INVALID';
        throw err;
      }

      // Re-lanzar errores que ya tienen statusCode
      if (error.statusCode) {
        throw error;
      }

      logger.error('Error en refresh token:', error);
      const err = new Error('Error refreshing token');
      err.statusCode = 500;
      throw err;
    }
  }

  // ============================================
  // GESTIÓN DE CONTRASEÑAS
  // ============================================

  /**
   * Cambiar contraseña de usuario
   * @param {number} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<object>} Nuevos tokens
   */
  static async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required');
      error.statusCode = 400;
      throw error;
    }

    // Obtener usuario
    const user = await UsuarioModel.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.estado !== 'activo') {
      const error = new Error('User account is not active');
      error.statusCode = 403;
      throw error;
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn(`Intento fallido de cambio de contraseña para usuario ${userId}`);
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      const error = new Error('New password must be different from current password');
      error.statusCode = 400;
      throw error;
    }

    // Actualizar contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_CONFIG.BCRYPT_ROUNDS);
    await UsuarioModel.updatePasswordHash(userId, newPasswordHash);

    // Revocar todos los tokens existentes (logout en todos los dispositivos)
    await redisClient.revokeAllUserRefreshTokens(userId);

    const refreshedUser = await UsuarioModel.findByIdWithRoles(userId);

    // Generar nuevos tokens
    const { accessToken, refreshToken } = await generateTokenPair(refreshedUser);

    logger.info(`✅ Contraseña cambiada exitosamente para usuario ${userId}`);

    return {
      message: 'Password changed successfully',
      accessToken,
      refreshToken,
    };
  }

  // ============================================
  // VALIDACIONES Y UTILIDADES
  // ============================================

  /**
   * Verificar si un email ya está registrado
   * @param {string} email - Email a verificar
   * @returns {Promise<boolean>} true si existe
   */
  static async emailExists(email) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await UsuarioModel.findByEmailLogin(normalizedEmail);
    return !!user;
  }

  /**
   * Obtener conteo de intentos fallidos de login
   * @param {string} identifier - Email o IP
   * @returns {Promise<number>} Número de intentos fallidos
   */
  static async getFailedLoginAttempts(identifier) {
    return await redisClient.getFailedLoginCount(identifier);
  }

  /**
   * Verificar si una cuenta está bloqueada temporalmente
   * @param {string} email - Email del usuario
   * @returns {Promise<boolean>} true si está bloqueada
   */
  static async isAccountLocked(email) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const failedAttempts = await redisClient.getFailedLoginCount(normalizedEmail);
    return failedAttempts >= AUTH_LOGIN_LOCK_THRESHOLD;
  }
}

module.exports = AuthService;
