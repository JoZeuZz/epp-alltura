const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const NotificationController = require('../controllers/notification.controller');
const { pushSubscription } = require('../validation');

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
  subscription: pushSubscription.required(),
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

// ============================================
// ENDPOINTS - NOTIFICACIONES IN-APP
// ============================================

/**
 * GET /api/notifications/in-app
 * Obtener notificaciones in-app del usuario autenticado
 */
router.get('/in-app', NotificationController.getInAppNotifications);

/**
 * GET /api/notifications/in-app/unread-count
 * Obtener cantidad de notificaciones no leídas
 */
router.get('/in-app/unread-count', NotificationController.getUnreadCount);

/**
 * GET /api/notifications/in-app/stats
 * Obtener estadísticas de notificaciones
 */
router.get('/in-app/stats', NotificationController.getStats);

/**
 * PUT /api/notifications/in-app/:notificationId/read
 * Marcar una notificación como leída
 */
router.put('/in-app/:notificationId/read', NotificationController.markAsRead);

/**
 * PUT /api/notifications/in-app/mark-all-read
 * Marcar todas las notificaciones como leídas
 */
router.put('/in-app/mark-all-read', NotificationController.markAllAsRead);

/**
 * DELETE /api/notifications/in-app/clear-read
 * Eliminar todas las notificaciones leídas
 * IMPORTANTE: Esta ruta debe estar ANTES de la ruta con parámetro :notificationId
 */
router.delete('/in-app/clear-read', NotificationController.deleteAllRead);

/**
 * DELETE /api/notifications/in-app/:notificationId
 * Eliminar una notificación
 */
router.delete('/in-app/:notificationId', NotificationController.deleteNotification);

module.exports = router;
