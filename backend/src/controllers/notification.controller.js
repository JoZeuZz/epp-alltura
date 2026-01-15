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

  // ========== Endpoints para notificaciones in-app ==========

  /**
   * GET /api/notifications/in-app
   * Obtener notificaciones in-app del usuario autenticado
   */
  static async getInAppNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const { unread_only, limit, offset } = req.query;

      const options = {
        unreadOnly: unread_only === 'true',
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0
      };

      const notifications = await NotificationService.getInAppNotifications(userId, options);

      res.json({
        data: notifications,
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });
    } catch (error) {
      logger.error('Error getting in-app notifications', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * GET /api/notifications/in-app/unread-count
   * Obtener cantidad de notificaciones no leídas
   */
  static async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await NotificationService.getInAppUnreadCount(userId);

      res.json({
        count
      });
    } catch (error) {
      logger.error('Error getting unread count', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * PUT /api/notifications/in-app/:notificationId/read
   * Marcar notificación como leída
   */
  static async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await NotificationService.markInAppAsRead(
        parseInt(notificationId, 10),
        userId
      );

      if (!notification) {
        return res.status(404).json({
          error: 'Notificación no encontrada'
        });
      }

      res.json({
        message: 'Notificación marcada como leída',
        data: notification
      });
    } catch (error) {
      logger.error('Error marking notification as read', {
        error: error.message,
        notificationId: req.params.notificationId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * PUT /api/notifications/in-app/mark-all-read
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await NotificationService.markAllInAppAsRead(userId);

      res.json({
        message: 'Todas las notificaciones marcadas como leídas',
        count
      });
    } catch (error) {
      logger.error('Error marking all notifications as read', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/in-app/:notificationId
   * Eliminar una notificación
   */
  static async deleteNotification(req, res, next) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const deleted = await NotificationService.deleteInAppNotification(
        parseInt(notificationId, 10),
        userId
      );

      if (!deleted) {
        return res.status(404).json({
          error: 'Notificación no encontrada'
        });
      }

      res.json({
        message: 'Notificación eliminada exitosamente'
      });
    } catch (error) {
      logger.error('Error deleting notification', {
        error: error.message,
        notificationId: req.params.notificationId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/in-app/clear-read
   * Eliminar todas las notificaciones leídas
   */
  static async deleteAllRead(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await NotificationService.deleteAllReadInApp(userId);

      res.json({
        message: 'Notificaciones leídas eliminadas',
        count
      });
    } catch (error) {
      logger.error('Error deleting read notifications', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * GET /api/notifications/in-app/stats
   * Obtener estadísticas de notificaciones
   */
  static async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await NotificationService.getInAppStats(userId);

      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Error getting notification stats', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }
}

module.exports = NotificationController;
