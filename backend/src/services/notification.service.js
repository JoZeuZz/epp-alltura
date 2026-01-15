const pushService = require('../lib/pushNotifications');
const { logger } = require('../lib/logger');
const Notification = require('../models/notification');

/**
 * NotificationService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Gestión de suscripciones a notificaciones push
 * - Gestión de notificaciones in-app persistentes
 * - Envío de notificaciones
 * - Validaciones de permisos
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class NotificationService {
  /**
   * Guardar suscripción de notificaciones push para un usuario
   * @param {number} userId - ID del usuario
   * @param {object} subscription - Datos de suscripción del navegador
   * @returns {Promise<void>}
   */
  static async saveSubscription(userId, subscription) {
    if (!subscription) {
      const error = new Error('Subscription data is required');
      error.statusCode = 400;
      throw error;
    }

    try {
      await pushService.saveSubscription(userId, subscription);
      logger.info(`Suscripción guardada para usuario ${userId}`);
    } catch (error) {
      logger.error('Error guardando suscripción:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de prueba a un usuario
   * @param {number} targetUserId - ID del usuario destinatario
   * @param {object} notification - Datos de la notificación
   * @returns {Promise<void>}
   */
  static async sendTestNotification(targetUserId, notification = null) {
    const defaultNotification = {
      title: 'Notificación de Prueba',
      body: 'Esta es una notificación de prueba',
      icon: '/logo192.png',
    };

    const notificationData = notification || defaultNotification;

    try {
      await pushService.sendToUser(targetUserId, notificationData);
      logger.info(`Notificación de prueba enviada al usuario ${targetUserId}`);
    } catch (error) {
      logger.error('Error enviando notificación:', error);
      throw error;
    }
  }

  /**
   * Verificar si un usuario tiene permiso para enviar notificaciones
   * @param {string} userRole - Rol del usuario
   * @returns {boolean} true si tiene permiso (solo admin)
   */
  static canSendNotifications(userRole) {
    return userRole === 'admin';
  }

  // ========== Métodos para notificaciones in-app persistentes ==========

  /**
   * Crear una nueva notificación in-app
   * @param {Object} notificationData - Datos de la notificación
   * @returns {Promise<Object>} Notificación creada
   */
  static async createInAppNotification(notificationData) {
    try {
      // Verificar si ya existe una notificación duplicada reciente
      if (notificationData.metadata) {
        const hasDuplicate = await Notification.hasDuplicate(
          notificationData.user_id,
          notificationData.type,
          notificationData.metadata,
          5 // 5 minutos
        );
        
        if (hasDuplicate) {
          logger.debug('Duplicate notification prevented', {
            userId: notificationData.user_id,
            type: notificationData.type
          });
          return null; // No crear notificación duplicada
        }
      }
      
      const notification = await Notification.create(notificationData);
      
      logger.info('In-app notification created', {
        notificationId: notification.id,
        userId: notificationData.user_id,
        type: notificationData.type
      });
      
      return notification;
    } catch (error) {
      logger.error('Error creating in-app notification', {
        error: error.message,
        notificationData
      });
      throw error;
    }
  }

  /**
   * Crear notificaciones en batch
   * @param {Array<Object>} notifications - Array de notificaciones
   * @returns {Promise<Array>} Notificaciones creadas
   */
  static async createBatchInAppNotifications(notifications) {
    try {
      const created = await Notification.createBatch(notifications);
      
      logger.info('Batch in-app notifications created', {
        count: created.length
      });
      
      return created;
    } catch (error) {
      logger.error('Error creating batch in-app notifications', {
        error: error.message,
        count: notifications.length
      });
      throw error;
    }
  }

  /**
   * Obtener notificaciones in-app de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Notificaciones
   */
  static async getInAppNotifications(userId, options = {}) {
    try {
      const notifications = await Notification.getByUser(userId, options);
      return notifications;
    } catch (error) {
      logger.error('Error getting in-app notifications', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtener notificaciones por tipo
   * @param {number} userId - ID del usuario
   * @param {string} type - Tipo de notificación
   * @param {Object} options - Opciones
   * @returns {Promise<Array>} Notificaciones
   */
  static async getInAppNotificationsByType(userId, type, options = {}) {
    try {
      const notifications = await Notification.getByType(userId, type, options);
      return notifications;
    } catch (error) {
      logger.error('Error getting in-app notifications by type', {
        error: error.message,
        userId,
        type
      });
      throw error;
    }
  }

  /**
   * Marcar notificación in-app como leída
   * @param {number} notificationId - ID de la notificación
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object|null>} Notificación actualizada
   */
  static async markInAppAsRead(notificationId, userId) {
    try {
      const notification = await Notification.markAsRead(notificationId, userId);
      
      if (notification) {
        logger.info('In-app notification marked as read', {
          notificationId,
          userId
        });
      }
      
      return notification;
    } catch (error) {
      logger.error('Error marking in-app notification as read', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones in-app como leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad actualizada
   */
  static async markAllInAppAsRead(userId) {
    try {
      const count = await Notification.markAllAsRead(userId);
      
      logger.info('All in-app notifications marked as read', {
        userId,
        count
      });
      
      return count;
    } catch (error) {
      logger.error('Error marking all in-app notifications as read', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtener cantidad de notificaciones in-app no leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad
   */
  static async getInAppUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);
      return count;
    } catch (error) {
      logger.error('Error getting in-app unread count', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Eliminar una notificación in-app
   * @param {number} notificationId - ID de la notificación
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>} true si se eliminó
   */
  static async deleteInAppNotification(notificationId, userId) {
    try {
      const deleted = await Notification.delete(notificationId, userId);
      
      if (deleted) {
        logger.info('In-app notification deleted', {
          notificationId,
          userId
        });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting in-app notification', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Eliminar todas las notificaciones in-app leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad eliminada
   */
  static async deleteAllReadInApp(userId) {
    try {
      const count = await Notification.deleteAllRead(userId);
      
      logger.info('All read in-app notifications deleted', {
        userId,
        count
      });
      
      return count;
    } catch (error) {
      logger.error('Error deleting read in-app notifications', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones in-app
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  static async getInAppStats(userId) {
    try {
      const stats = await Notification.getStats(userId);
      return stats;
    } catch (error) {
      logger.error('Error getting in-app notification stats', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Limpiar notificaciones in-app antiguas (tarea programada)
   * @param {number} days - Días de antigüedad
   * @returns {Promise<number>} Cantidad eliminada
   */
  static async cleanOldInAppNotifications(days = 30) {
    try {
      const count = await Notification.deleteOld(days);
      
      logger.info('Old in-app notifications cleaned', {
        days,
        count
      });
      
      return count;
    } catch (error) {
      logger.error('Error cleaning old in-app notifications', {
        error: error.message,
        days
      });
      throw error;
    }
  }
}

module.exports = NotificationService;
