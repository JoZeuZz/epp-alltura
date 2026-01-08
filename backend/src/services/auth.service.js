const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { generateTokenPair, revokeToken } = require('../middleware/auth');
const { logger } = require('../lib/logger');
const redisClient = require('../lib/redis');

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
  // ============================================
  // REGISTRO Y AUTENTICACIÓN
  // ============================================

  /**
   * Registrar un nuevo usuario
   * @param {object} userData - Datos del usuario
   * @returns {Promise<object>} Usuario creado con tokens
   */
  static async registerUser(userData) {
    const { email, password, first_name, last_name, role, rut, phone_number } = userData;

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const error = new Error('User with this email already exists.');
      error.statusCode = 400;
      throw error;
    }

    // Crear usuario
    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      role,
      rut,
      phone_number,
    });

    // Generar tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    logger.info(`Usuario registrado exitosamente: ${email} (ID: ${user.id})`);

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
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
    const failedAttempts = await redisClient.getFailedLoginCount(email);
    if (failedAttempts >= 5) {
      logger.warn(`⚠️  Cuenta bloqueada temporalmente por múltiples intentos fallidos: ${email}`);
      const error = new Error(
        'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.'
      );
      error.statusCode = 429;
      error.code = 'ACCOUNT_TEMPORARILY_LOCKED';
      throw error;
    }

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    if (!user) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(email);
      await redisClient.incrementFailedLogin(ip);

      logger.warn(`Intento de login fallido para email no existente: ${email}`);
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(email);
      await redisClient.incrementFailedLogin(ip);

      logger.warn(`Intento de login fallido para usuario: ${email} desde IP: ${ip}`);
      const error = new Error('Invalid credentials.');
      error.statusCode = 401;
      throw error;
    }

    // Login exitoso - resetear contador de intentos fallidos
    await redisClient.resetFailedLogin(email);
    await redisClient.resetFailedLogin(ip);

    // Generar par de tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    // Actualizar última conexión
    await User.updateLastLogin(user.id, ip, userAgent);

    logger.info(`✅ Login exitoso para usuario: ${email} desde IP: ${ip}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        must_change_password: user.must_change_password,
      },
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
      const isValid = await redisClient.isRefreshTokenValid(decoded.user.id, refreshToken);
      if (!isValid) {
        logger.warn(`⚠️  Intento de uso de refresh token inválido para usuario ${decoded.user.id}`);
        const error = new Error('Invalid or expired refresh token');
        error.statusCode = 401;
        error.code = 'REFRESH_TOKEN_INVALID';
        throw error;
      }

      // Obtener información actualizada del usuario
      const user = await User.findById(decoded.user.id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // TOKEN ROTATION: Revocar el refresh token actual y generar uno nuevo
      await redisClient.revokeRefreshToken(decoded.user.id, refreshToken);

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
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
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
    await User.updatePassword(userId, newPassword);

    // Si tenía que cambiar contraseña, marcar como completado
    if (user.must_change_password) {
      await User.clearPasswordChangeFlag(userId);
    }

    // Revocar todos los tokens existentes (logout en todos los dispositivos)
    await redisClient.revokeAllUserRefreshTokens(userId);

    // Generar nuevos tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

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
    const user = await User.findByEmail(email);
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
    const failedAttempts = await redisClient.getFailedLoginCount(email);
    return failedAttempts >= 5;
  }
}

module.exports = AuthService;
