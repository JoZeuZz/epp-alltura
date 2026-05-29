const cron = require('node-cron');
const { logger } = require('../lib/logger');

const tasks = [
  {
    name: 'custody-check-daily',
    schedule: '0 8 * * *',
    fn: () => require('../services/custodyCheck.service').runDailyCheck(),
  },
  {
    name: 'notification-cleanup-weekly',
    schedule: '0 3 * * 0',
    fn: () => require('../services/notification.service').cleanOldInAppNotifications(30),
  },
];

function startScheduler() {
  for (const task of tasks) {
    cron.schedule(task.schedule, async () => {
      try {
        await task.fn();
      } catch (err) {
        logger.error(`Cron [${task.name}] failed`, { error: err.message, stack: err.stack });
      }
    });
    logger.info(`Cron registered: ${task.name} (${task.schedule})`);
  }
}

module.exports = { startScheduler };
