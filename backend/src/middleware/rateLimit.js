const { logger } = require('../lib/logger');
const redisClient = require('../lib/redis');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const getRateLimitConfig = (envPrefix, defaults) => {
  const windowMs = parsePositiveInt(
    process.env[`${envPrefix}_RATE_LIMIT_WINDOW_MS`],
    defaults.windowMs
  );
  const max = parsePositiveInt(
    process.env[`${envPrefix}_RATE_LIMIT_MAX`],
    defaults.max
  );

  return { windowMs, max };
};

const createRedisRateLimiter = ({ keyPrefix, windowMs, max, getKey, message }) => {
  return async (req, res, next) => {
    const identifier = (typeof getKey === 'function' && getKey(req)) || req.ip || 'unknown';
    const key = `${keyPrefix}:${identifier}`;

    try {
      const result = await redisClient.rateLimit(key, windowMs, max);

      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', result.remaining);
      res.setHeader('RateLimit-Reset', Math.ceil(result.resetAt / 1000));

      if (result.blocked) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({
          message: message || 'Demasiadas solicitudes, intenta nuevamente más tarde.',
        });
      }

      return next();
    } catch (error) {
      logger.warn('Rate limit check failed', {
        error: error.message,
        keyPrefix,
      });
      return next();
    }
  };
};

module.exports = {
  createRedisRateLimiter,
  getRateLimitConfig,
};
