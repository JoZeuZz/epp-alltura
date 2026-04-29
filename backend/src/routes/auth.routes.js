const express = require('express');
const Joi = require('joi');
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { passwordValidationMiddleware } = require('../middleware/passwordPolicy');
const rateLimit = require('express-rate-limit');
const { email, password, personName, rut, phoneNumber, userRole } = require('../lib/validation');

/**
 * AuthRoutes
 * Capa de Rutas - Definición de Endpoints y Middlewares
 * Responsabilidades:
 * - Definir endpoints (URLs y verbos HTTP)
 * - Aplicar middlewares (autenticación, validación, rate limiting)
 * - Validar schemas de entrada
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */

const router = express.Router();

// ============================================
// RATE LIMITING (Protección contra Brute Force)
// ============================================

const AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || '',
  10
);
const AUTH_LOGIN_RATE_LIMIT_MAX = Number.parseInt(
  process.env.AUTH_LOGIN_RATE_LIMIT_MAX || '',
  10
);

// Limitar intentos de login (alineado con AuthService).
const authLimiter = rateLimit({
  windowMs:
    Number.isFinite(AUTH_LOGIN_RATE_LIMIT_WINDOW_MS) && AUTH_LOGIN_RATE_LIMIT_WINDOW_MS > 0
      ? AUTH_LOGIN_RATE_LIMIT_WINDOW_MS
      : 15 * 60 * 1000,
  max:
    Number.isFinite(AUTH_LOGIN_RATE_LIMIT_MAX) && AUTH_LOGIN_RATE_LIMIT_MAX > 0
      ? AUTH_LOGIN_RATE_LIMIT_MAX
      : process.env.NODE_ENV === 'production'
        ? 30
        : 100,
  message: 'Demasiados intentos de inicio de sesión desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar intentos exitosos
});

// ============================================
// VALIDACIÓN SCHEMAS (JOI)
// ============================================

const registerSchema = Joi.object({
  first_name: personName,
  last_name: personName,
  nombres: personName,
  apellidos: personName,
  email: email,
  email_login: email,
  password: password.required(),
  role: userRole.required(),
  rut: rut.required(),
  phone_number: phoneNumber.allow('', null),
  telefono: phoneNumber.allow('', null),
})
  .or('first_name', 'nombres')
  .or('last_name', 'apellidos')
  .or('email', 'email_login');

const loginSchema = Joi.object({
  email: email,
  email_login: email,
  password: Joi.string().required(), // No usar schema de password aquí, solo validar que existe
}).or('email', 'email_login');

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.required(),
});

// ============================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================

/**
 * Middleware para validar body con esquema Joi
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return next(error);
    }

    req.body = value;
    next();
  };
};

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 * - Requiere: datos completos del usuario
 * - Valida: política de contraseñas
 * - Retorna: usuario + tokens
 */
router.post(
  '/register',
  validateBody(registerSchema),
  passwordValidationMiddleware,
  AuthController.register
);

/**
 * POST /api/auth/login
 * Iniciar sesión
 * - Requiere: email + password
 * - Rate limit IP: 30 intentos/15min (producción, configurable)
 * - Lockout por email: 5 intentos fallidos/15min (configurable)
 * - Retorna: usuario + tokens
 */
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);

/**
 * POST /api/auth/logout
 * Cerrar sesión (requiere autenticación)
 * - Requiere: access token válido
 * - Revoca: access token + refresh tokens
 * - Retorna: confirmación
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * POST /api/auth/refresh
 * Renovar access token
 * - Requiere: refresh token válido
 * - Token rotation: revoca token antiguo
 * - Retorna: nuevos tokens
 */
router.post('/refresh', validateBody(refreshSchema), AuthController.refresh);

/**
 * POST /api/auth/change-password
 * Cambiar contraseña (requiere autenticación)
 * - Requiere: contraseña actual + nueva contraseña
 * - Valida: política de contraseñas
 * - Revoca: todos los tokens existentes
 * - Retorna: nuevos tokens
 */
router.post(
  '/change-password',
  authMiddleware,
  validateBody(changePasswordSchema),
  passwordValidationMiddleware,
  AuthController.changePassword
);

module.exports = router;
