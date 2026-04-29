const express = require('express');
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const NotificationController = require('../controllers/notification.controller');
const { pushSubscription } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const subscribeSchema = Joi.object({
  subscription: pushSubscription.required(),
});

const notificationIdParamSchema = Joi.object({
  notificationId: Joi.number().integer().positive().required(),
});

const testTargetParamSchema = Joi.object({
  userId: uuid.required(),
});

const validateBody = (schema) => {
  return async (req, _res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const validateParam = (schema) => {
  return async (req, _res, next) => {
    try {
      req.params = await schema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

router.post('/subscribe', validateBody(subscribeSchema), NotificationController.subscribe);

router.post(
  '/test/:userId',
  isAdmin,
  validateParam(testTargetParamSchema),
  NotificationController.sendTest
);

router.get('/in-app', NotificationController.getInAppNotifications);
router.get('/in-app/unread-count', NotificationController.getUnreadCount);
router.get('/in-app/stats', NotificationController.getStats);

router.put(
  '/in-app/:notificationId/read',
  validateParam(notificationIdParamSchema),
  NotificationController.markAsRead
);

router.put('/in-app/mark-all-read', NotificationController.markAllAsRead);
router.delete('/in-app/clear-read', NotificationController.deleteAllRead);

router.delete(
  '/in-app/:notificationId',
  validateParam(notificationIdParamSchema),
  NotificationController.deleteNotification
);

module.exports = router;
