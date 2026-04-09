const pushService = require('../lib/pushNotifications');
const { logger } = require('../lib/logger');
const NotificationModel = require('../models/notification');

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

class NotificationService {
  static async saveSubscription(userId, subscription) {
    if (!userId) {
      throw buildError('Usuario inválido para guardar suscripción', 400, 'USER_REQUIRED');
    }

    if (!subscription || typeof subscription !== 'object') {
      throw buildError('Subscription data is required', 400, 'SUBSCRIPTION_REQUIRED');
    }

    await pushService.saveSubscription(userId, subscription);
    logger.info(`Suscripción push guardada para usuario ${userId}`);
  }

  static async sendTestNotification(targetUserId, notification = null) {
    if (!targetUserId) {
      throw buildError('Target user is required', 400, 'TARGET_USER_REQUIRED');
    }

    const defaultNotification = {
      title: 'Notificación de Prueba',
      body: 'Esta es una notificación de prueba',
      icon: '/logo192.png',
    };

    await pushService.sendToUser(targetUserId, notification || defaultNotification);
    logger.info(`Notificación push de prueba enviada a usuario ${targetUserId}`);
  }

  static canSendNotifications(userRole) {
    if (!userRole) return false;
    if (Array.isArray(userRole)) {
      return userRole.includes('admin');
    }
    return userRole === 'admin';
  }

  static async createInAppNotification(notificationData) {
    try {
      if (notificationData.metadata) {
        const hasDuplicate = await NotificationModel.hasDuplicate(
          notificationData.user_id,
          notificationData.type,
          notificationData.metadata,
          5
        );

        if (hasDuplicate) {
          logger.debug('Duplicate notification prevented', {
            userId: notificationData.user_id,
            type: notificationData.type,
          });
          return null;
        }
      }

      const notification = await NotificationModel.create(notificationData);

      logger.info('In-app notification created', {
        notificationId: notification.id,
        userId: notificationData.user_id,
        type: notificationData.type,
      });

      return notification;
    } catch (error) {
      logger.error('Error creating in-app notification', {
        error: error.message,
        notificationData,
      });
      throw error;
    }
  }

  static async createBatchInAppNotifications(notifications) {
    try {
      const created = await NotificationModel.createBatch(notifications);

      logger.info('Batch in-app notifications created', {
        count: created.length,
      });

      return created;
    } catch (error) {
      logger.error('Error creating batch in-app notifications', {
        error: error.message,
        count: notifications.length,
      });
      throw error;
    }
  }

  static async getInAppNotifications(userId, options = {}) {
    try {
      return await NotificationModel.getByUser(userId, options);
    } catch (error) {
      logger.error('Error getting in-app notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  static async getInAppNotificationsByType(userId, type, options = {}) {
    try {
      return await NotificationModel.getByType(userId, type, options);
    } catch (error) {
      logger.error('Error getting in-app notifications by type', {
        error: error.message,
        userId,
        type,
      });
      throw error;
    }
  }

  static async markInAppAsRead(notificationId, userId) {
    try {
      const notification = await NotificationModel.markAsRead(notificationId, userId);

      if (notification) {
        logger.info('In-app notification marked as read', {
          notificationId,
          userId,
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error marking in-app notification as read', {
        error: error.message,
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async markAllInAppAsRead(userId) {
    try {
      const count = await NotificationModel.markAllAsRead(userId);

      logger.info('All in-app notifications marked as read', {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Error marking all in-app notifications as read', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  static async getInAppUnreadCount(userId) {
    try {
      return await NotificationModel.getUnreadCount(userId);
    } catch (error) {
      logger.error('Error getting in-app unread count', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  static async deleteInAppNotification(notificationId, userId) {
    try {
      const deleted = await NotificationModel.delete(notificationId, userId);

      if (deleted) {
        logger.info('In-app notification deleted', {
          notificationId,
          userId,
        });
      }

      return deleted;
    } catch (error) {
      logger.error('Error deleting in-app notification', {
        error: error.message,
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async deleteAllReadInApp(userId) {
    try {
      const count = await NotificationModel.deleteAllRead(userId);

      logger.info('All read in-app notifications deleted', {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Error deleting read in-app notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  static async getInAppStats(userId) {
    try {
      return await NotificationModel.getStats(userId);
    } catch (error) {
      logger.error('Error getting in-app notification stats', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  static async cleanOldInAppNotifications(days = 30) {
    try {
      const count = await NotificationModel.deleteOld(days);

      logger.info('Old in-app notifications cleaned', {
        days,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Error cleaning old in-app notifications', {
        error: error.message,
        days,
      });
      throw error;
    }
  }
}

module.exports = NotificationService;
