const pushService = require('../lib/pushNotifications');
const { logger } = require('../lib/logger');

/**
 * NotificationService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Gestión de suscripciones a notificaciones push
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
}

module.exports = NotificationService;
