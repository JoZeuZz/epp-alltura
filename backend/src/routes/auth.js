const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { revokeToken, generateTokenPair, authMiddleware, TOKEN_CONFIG } = require('../middleware/auth');
const { passwordValidationMiddleware } = require('../middleware/passwordPolicy');
const { validate, authValidators } = require('../middleware/validators');
const { logger } = require('../lib/logger');
const redisClient = require('../lib/redis');

// Rate limiter específico para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 intentos en producción (reducido de 10)
  message: 'Demasiados intentos de login, por favor intenta de nuevo más tarde.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiter solo a login
router.use('/login', authLimiter);

// Register a new user
router.post('/register', 
  validate(authValidators.register), 
  passwordValidationMiddleware, 
  async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, rut, phone_number } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists.' 
      });
    }

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

    res.status(201).json({
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
    });

  } catch (error) {
    logger.error(`Error en el registro de usuario: ${error.message}`, error);
    next(error);
  }
});

// Login a user
router.post('/login', 
  validate(authValidators.login),
  async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Verificar rate limiting adicional por email (protección contra brute force)
    const failedAttempts = await redisClient.getFailedLoginCount(email);
    if (failedAttempts >= 5) {
      logger.warn(`⚠️  Cuenta bloqueada temporalmente por múltiples intentos fallidos: ${email}`);
      return res.status(429).json({
        success: false,
        error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.',
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(email);
      await redisClient.incrementFailedLogin(req.ip);
      
      logger.warn(`Intento de login fallido para email no existente: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Incrementar contador de intentos fallidos
      await redisClient.incrementFailedLogin(email);
      await redisClient.incrementFailedLogin(req.ip);
      
      logger.warn(`Intento de login fallido para usuario: ${email} desde IP: ${req.ip}`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Login exitoso - resetear contador de intentos fallidos
    await redisClient.resetFailedLogin(email);
    await redisClient.resetFailedLogin(req.ip);

    // Generar par de tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    // Actualizar última conexión
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await User.updateLastLogin(user.id, ip, userAgent);

    logger.info(`✅ Login exitoso para usuario: ${email} desde IP: ${ip}`);

    res.json({
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
    });
  } catch (error) {
    logger.error(`Fallo en el intento de login para el usuario: ${req.body.email}`, error);
    next(error);
  }
});

// Logout a user
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        await revokeToken(token);
      }
    }

    // Revocar todos los refresh tokens del usuario
    await redisClient.revokeAllUserRefreshTokens(req.user.id);

    logger.info(`Usuario ${req.user.id} cerró sesión exitosamente`);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verificar firma del refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Verificar que el refresh token esté en Redis
    const isValid = await redisClient.isRefreshTokenValid(decoded.user.id, refreshToken);
    if (!isValid) {
      logger.warn(`⚠️  Intento de uso de refresh token inválido para usuario ${decoded.user.id}`);
      return res.status(401).json({
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Obtener información actualizada del usuario
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // TOKEN ROTATION: Revocar el refresh token actual y generar uno nuevo
    await redisClient.revokeRefreshToken(decoded.user.id, refreshToken);

    // Generar nuevos tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(user);

    logger.info(`✅ Tokens renovados exitosamente para usuario ${user.id}`);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    logger.error('Error en refresh token:', error);
    res.status(500).json({ message: 'Error refreshing token' });
  }
});

// Change password (requiere cambio obligatorio)
router.post('/change-password', authMiddleware, passwordValidationMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      });
    }

    // Obtener usuario
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn(`Intento fallido de cambio de contraseña para usuario ${req.user.id}`);
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password',
      });
    }

    // Actualizar contraseña
    await User.updatePassword(user.id, newPassword);

    // Si tenía que cambiar contraseña, marcar como completado
    if (user.must_change_password) {
      await User.clearPasswordChangeFlag(user.id);
    }

    // Revocar todos los tokens existentes (logout en todos los dispositivos)
    await redisClient.revokeAllUserRefreshTokens(user.id);

    // Generar nuevos tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    logger.info(`✅ Contraseña cambiada exitosamente para usuario ${user.id}`);

    res.json({
      message: 'Password changed successfully',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

module.exports = router;
