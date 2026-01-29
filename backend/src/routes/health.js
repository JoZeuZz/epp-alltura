const express = require('express');
const router = express.Router();
const healthCheckService = require('../lib/healthCheck');
const redisClient = require('../lib/redis');

// Endpoint de health check básico
router.get('/', async (req, res) => {
  try {
    const health = await healthCheckService.runAllChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint simple de liveness (para Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Endpoint de readiness
router.get('/ready', async (req, res) => {
  try {
    await healthCheckService.checkDatabase();
    const redisHealth = await redisClient.healthCheck();
    if (!redisHealth.healthy) {
      return res.status(503).json({
        status: 'not ready',
        error: `Redis: ${redisHealth.message || 'unhealthy'}`,
      });
    }
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

module.exports = router;
