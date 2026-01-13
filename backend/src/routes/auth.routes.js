const express = require('express');
const Joi = require('joi');
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { passwordValidationMiddleware } = require('../middleware/passwordPolicy');
const rateLimit = require('express-rate-limit');

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

// Limitar intentos de login: 5 intentos cada 15 minutos en producción
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: 'Demasiados intentos de inicio de sesión desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// ============================================
// VALIDACIÓN SCHEMAS (JOI)
// ============================================

const registerSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(255).required(),
  role: Joi.string().valid('admin', 'supervisor', 'client').required(),
  rut: Joi.string()
    .pattern(/^\d{7,8}-[\dkK]$/)
    .required(),
  phone_number: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .min(8)
    .max(20)
    .allow(null, ''),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(255).required(),
});

// ============================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================

/**
 * Middleware para validar body con esquema Joi
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages,
      });
    }
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
 * - Rate limit: 5 intentos/15min (producción)
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
