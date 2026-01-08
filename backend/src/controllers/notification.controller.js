const NotificationService = require('../services/notification.service');
const { logger } = require('../lib/logger');

/**
 * NotificationController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Extraer datos del request
 * - Validar permisos
 * - Llamar a la capa de servicio
 * - Formatear respuestas HTTP
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */
class NotificationController {
  /**
   * POST /api/notifications/subscribe
   * Suscribir usuario a notificaciones push
   */
  static async subscribe(req, res, _next) {
    try {
      const userId = req.user.id;
      const { subscription } = req.body;

      if (!subscription) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Subscription data is required' 
        });
      }

      await NotificationService.saveSubscription(userId, subscription);

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error guardando suscripción:', error);
      return res.status(500).json({ 
        error: 'Server Error',
        message: 'Error guardando suscripción' 
      });
    }
  }

  /**
   * POST /api/notifications/test/:userId
   * Enviar notificación de prueba (solo admin)
   */
  static async sendTest(req, res, _next) {
    try {
      const userRole = req.user.role;
      const targetUserId = parseInt(req.params.userId, 10);

      // Validar permisos (solo admin)
      if (!NotificationService.canSendNotifications(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'No autorizado' 
        });
      }

      // Validar ID de usuario
      if (isNaN(targetUserId)) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Invalid user ID' 
        });
      }

      await NotificationService.sendTestNotification(targetUserId);

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error enviando notificación:', error);
      return res.status(500).json({ 
        error: 'Server Error',
        message: 'Error enviando notificación' 
      });
    }
  }
}

module.exports = NotificationController;
