const NotificationService = require('../services/notification.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

class NotificationController {
  static async subscribe(req, res, next) {
    try {
      await NotificationService.saveSubscription(req.user.id, req.body.subscription);

      return sendSuccess(res, {
        message: 'Suscripción push guardada correctamente',
        data: null,
      });
    } catch (error) {
      logger.error('Error guardando suscripción push', {
        message: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async sendTest(req, res, next) {
    try {
      const userRoles = req.user.roles || [req.user.role];
      if (!NotificationService.canSendNotifications(userRoles)) {
        throw buildError('No autorizado para enviar notificaciones', 403, 'FORBIDDEN');
      }

      await NotificationService.sendTestNotification(req.params.userId);

      return sendSuccess(res, {
        message: 'Notificación de prueba enviada correctamente',
        data: null,
      });
    } catch (error) {
      logger.error('Error enviando notificación de prueba', {
        message: error.message,
        actorUserId: req.user?.id,
        targetUserId: req.params?.userId,
      });
      return next(error);
    }
  }

  static async getInAppNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        unreadOnly: req.query.unread_only === 'true',
        limit: parsePositiveInt(req.query.limit, 20),
        offset: parsePositiveInt(req.query.offset, 0),
      };

      const notifications = await NotificationService.getInAppNotifications(userId, options);

      return sendSuccess(res, {
        message: 'Notificaciones obtenidas correctamente',
        data: {
          data: notifications,
          pagination: {
            limit: options.limit,
            offset: options.offset,
          },
          total: notifications.length,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo notificaciones in-app', {
        error: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getInAppUnreadCount(req.user.id);

      return sendSuccess(res, {
        message: 'Conteo de notificaciones no leídas obtenido correctamente',
        data: {
          count,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo conteo de no leídas', {
        error: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const notificationId = Number.parseInt(req.params.notificationId, 10);
      const notification = await NotificationService.markInAppAsRead(notificationId, req.user.id);

      if (!notification) {
        throw buildError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND');
      }

      return sendSuccess(res, {
        message: 'Notificación marcada como leída',
        data: notification,
      });
    } catch (error) {
      logger.error('Error marcando notificación como leída', {
        error: error.message,
        notificationId: req.params?.notificationId,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const count = await NotificationService.markAllInAppAsRead(req.user.id);

      return sendSuccess(res, {
        message: 'Todas las notificaciones fueron marcadas como leídas',
        data: {
          count,
        },
      });
    } catch (error) {
      logger.error('Error marcando todas las notificaciones como leídas', {
        error: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async deleteNotification(req, res, next) {
    try {
      const notificationId = Number.parseInt(req.params.notificationId, 10);
      const deleted = await NotificationService.deleteInAppNotification(notificationId, req.user.id);

      if (!deleted) {
        throw buildError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND');
      }

      return sendSuccess(res, {
        message: 'Notificación eliminada correctamente',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      logger.error('Error eliminando notificación', {
        error: error.message,
        notificationId: req.params?.notificationId,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async deleteAllRead(req, res, next) {
    try {
      const count = await NotificationService.deleteAllReadInApp(req.user.id);

      return sendSuccess(res, {
        message: 'Notificaciones leídas eliminadas correctamente',
        data: {
          count,
        },
      });
    } catch (error) {
      logger.error('Error eliminando notificaciones leídas', {
        error: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }

  static async getStats(req, res, next) {
    try {
      const stats = await NotificationService.getInAppStats(req.user.id);

      return sendSuccess(res, {
        message: 'Estadísticas de notificaciones obtenidas correctamente',
        data: {
          data: stats,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas de notificaciones', {
        error: error.message,
        userId: req.user?.id,
      });
      return next(error);
    }
  }
}

module.exports = NotificationController;
