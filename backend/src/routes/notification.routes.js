const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const NotificationController = require('../controllers/notification.controller');

/**
 * NotificationRoutes
 * Capa de Rutas - Definición de Endpoints y Middlewares
 * Responsabilidades:
 * - Definir endpoints de notificaciones
 * - Aplicar autenticación y autorización
 * - Validar datos de entrada
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ============================================
// VALIDACIÓN SCHEMAS (JOI)
// ============================================

const subscribeSchema = Joi.object({
  subscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    expirationTime: Joi.any().allow(null),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required(),
    }).required(),
  }).required(),
});

/**
 * Middleware para validar body con esquema Joi
 */
const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.validateAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error.isJoi) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.details[0].message,
        });
      }
      next(error);
    }
  };
};

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/notifications/subscribe
 * Suscribir usuario autenticado a notificaciones push
 * - Requiere: datos de suscripción del navegador
 * - Retorna: confirmación
 */
router.post('/subscribe', validateBody(subscribeSchema), NotificationController.subscribe);

/**
 * POST /api/notifications/test/:userId
 * Enviar notificación de prueba (solo admin)
 * - Requiere: rol admin + userId válido
 * - Retorna: confirmación
 */
router.post('/test/:userId', isAdmin, NotificationController.sendTest);

module.exports = router;
