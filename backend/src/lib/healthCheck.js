const db = require('../db');
const { Storage } = require('@google-cloud/storage');
const logger = require('./logger');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.initializeChecks();
  }

  initializeChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('google-storage', this.checkGoogleStorage.bind(this));
    this.checks.set('memory', this.checkMemoryUsage.bind(this));
    this.checks.set('disk', this.checkDiskSpace.bind(this));
  }

  async runAllChecks() {
    const results = {};
    const promises = [];

    for (const [name, checkFn] of this.checks) {
      promises.push(
        this.runSingleCheck(name, checkFn)
          .then(result => ({ name, result }))
      );
    }

    const checkResults = await Promise.allSettled(promises);
    
    checkResults.forEach(({ status, value }) => {
      if (status === 'fulfilled') {
        results[value.name] = value.result;
      }
    });

    const overallHealth = Object.values(results).every(check => check.status === 'healthy');
    
    return {
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  async runSingleCheck(name, checkFn) {
    const startTime = Date.now();
    
    try {
      await checkFn();
      const duration = Date.now() - startTime;
      
      return {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Health check failed: ${name}`, {
        error: error.message,
        duration,
        type: 'health-check'
      });

      return {
        status: 'unhealthy',
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkDatabase() {
    const result = await db.query('SELECT 1 as health_check');
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Database query returned no results');
    }
  }

  async checkGoogleStorage() {
    if (!process.env.GCS_BUCKET_NAME) {
      throw new Error('Google Storage not configured');
    }

    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    const [exists] = await bucket.exists();
    
    if (!exists) {
      throw new Error('Google Storage bucket not accessible');
    }
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    
    // Alerta si el uso de memoria supera el 80%
    if (heapUsedMB / heapTotalMB > 0.8) {
      throw new Error(`High memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`);
    }
  }

  async checkDiskSpace() {
    const fs = require('fs').promises;
    const stats = await fs.statfs('./');
    
    const freeMB = (stats.bavail * stats.bsize) / 1024 / 1024;
    const totalMB = (stats.blocks * stats.bsize) / 1024 / 1024;
    const usedPercent = ((totalMB - freeMB) / totalMB) * 100;
    
    // Alerta si el uso de disco supera el 90%
    if (usedPercent > 90) {
      throw new Error(`Low disk space: ${usedPercent.toFixed(2)}% used`);
    }
  }
}

module.exports = new HealthCheckService();
