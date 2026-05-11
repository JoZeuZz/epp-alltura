const webpush = require('web-push');
const db = require('../db');
const PushSubscriptionModel = require('../models/pushSubscription');
const { logger } = require('./logger');

const vapidPublicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const vapidPrivateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:contact@alltura.com',
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (error) {
    logger.warn('VAPID keys provided are invalid. Push notifications disabled.', {
      env: process.env.NODE_ENV,
      message: error.message,
    });
  }
} else {
  logger.warn('VAPID keys not configured. Push notifications will not work.', {
    env: process.env.NODE_ENV,
  });
}

class PushNotificationService {
  async saveSubscription(userId, subscription) {
    await PushSubscriptionModel.upsert(userId, subscription);
    logger.info(`Suscripción push guardada para usuario ${userId}`);
  }

  async sendToUser(userId, payload) {
    try {
      const subscriptionRecord = await PushSubscriptionModel.findByUserId(userId);
      if (!subscriptionRecord) {
        logger.warn(`No existe suscripción push para usuario ${userId}`);
        return;
      }

      const subscription = subscriptionRecord.subscription_data;
      if (!subscription) {
        logger.warn(`Suscripción push inválida para usuario ${userId}`);
        await this.removeSubscription(userId);
        return;
      }

      await webpush.sendNotification(subscription, JSON.stringify(payload || {}));
      logger.info(`Notificación push enviada a usuario ${userId}`);
    } catch (error) {
      logger.error(`Error enviando push a usuario ${userId}`, {
        message: error.message,
        statusCode: error.statusCode,
      });

      if (error.statusCode === 404 || error.statusCode === 410) {
        await this.removeSubscription(userId);
      }

      throw error;
    }
  }

  async removeSubscription(userId) {
    try {
      await PushSubscriptionModel.removeByUserId(userId);
    } catch (error) {
      logger.error('Error removiendo suscripción push', {
        userId,
        message: error.message,
      });
    }
  }
}

module.exports = new PushNotificationService();
