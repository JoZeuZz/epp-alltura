const webpush = require('web-push');
const db = require('../db');
const logger = require('./logger');

// Configurar las claves VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@alltura.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('VAPID keys not configured. Push notifications will not work.', {
    env: process.env.NODE_ENV
  });
}

class PushNotificationService {
  // Guardar suscripción de usuario
  async saveSubscription(userId, subscription) {
    try {
      const query = `
        INSERT INTO push_subscriptions (user_id, subscription_data, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET subscription_data = $2, updated_at = NOW()
      `;
      await db.query(query, [userId, JSON.stringify(subscription)]);
      logger.info(`Suscripción guardada para usuario ${userId}`);
    } catch (error) {
      logger.error('Error guardando suscripción:', error);
      throw error;
    }
  }

  // Enviar notificación a un usuario específico
  async sendToUser(userId, payload) {
    try {
      const query = 'SELECT subscription_data FROM push_subscriptions WHERE user_id = $1';
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        logger.warn(`No hay suscripción para usuario ${userId}`);
        return;
      }

      const subscription = JSON.parse(result.rows[0].subscription_data);
      
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      logger.info(`Notificación enviada a usuario ${userId}`);
    } catch (error) {
      logger.error(`Error enviando notificación a usuario ${userId}:`, error);
      
      // Si la suscripción es inválida, eliminarla
      if (error.statusCode === 410) {
        await this.removeSubscription(userId);
      }
    }
  }

  // Enviar a todos los supervisores de un proyecto
  async sendToProjectSupervisors(projectId, payload) {
    try {
      const query = `
        SELECT DISTINCT u.id 
        FROM users u 
        JOIN project_users pu ON u.id = pu.userid 
        WHERE pu.projectid = $1 AND u.role = 'supervisor'
      `;
      const result = await db.query(query, [projectId]);
      
      const promises = result.rows.map(row => 
        this.sendToUser(row.id, payload)
      );
      
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error enviando notificaciones a supervisores:', error);
    }
  }

  // Remover suscripción inválida
  async removeSubscription(userId) {
    try {
      await db.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    } catch (error) {
      logger.error('Error removiendo suscripción:', error);
    }
  }
}

module.exports = new PushNotificationService();
