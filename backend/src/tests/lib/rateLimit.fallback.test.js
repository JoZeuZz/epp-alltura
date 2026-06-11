jest.mock('../../lib/redis', () => ({
  rateLimit: jest.fn(),
}));

const redisClient = require('../../lib/redis');
const { createRedisRateLimiter } = require('../../middleware/rateLimit');

const mockReq = (ip = '127.0.0.1') => ({ ip });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  return res;
};

describe('createRedisRateLimiter — fallback in-memory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Redis lanza → request pasa mientras no exceda max', async () => {
    redisClient.rateLimit.mockRejectedValue(new Error('Redis connection refused'));

    const limiter = createRedisRateLimiter({
      keyPrefix: 'test-fb-pass',
      windowMs: 60000,
      max: 5,
    });

    const next = jest.fn();
    const req = mockReq('10.1.0.1');
    const res = mockRes();

    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  test('Redis lanza → al exceder max dentro de la ventana, responde 429', async () => {
    redisClient.rateLimit.mockRejectedValue(new Error('Redis connection refused'));

    const limiter = createRedisRateLimiter({
      keyPrefix: 'test-fb-block',
      windowMs: 60000,
      max: 2,
    });

    const next = jest.fn();
    const req = mockReq('10.1.0.2');

    // request 1 y 2 pasan (count 1 y 2, ambos ≤ max=2)
    await limiter(req, mockRes(), next);
    await limiter(req, mockRes(), next);

    // request 3 debe bloquearse (count=3 > max=2)
    const res = mockRes();
    await limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('Redis funciona → respeta result.blocked', async () => {
    redisClient.rateLimit.mockResolvedValue({
      blocked: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const limiter = createRedisRateLimiter({
      keyPrefix: 'test-redis-blocked',
      windowMs: 60000,
      max: 10,
    });

    const next = jest.fn();
    const req = mockReq('10.1.0.3');
    const res = mockRes();

    await limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });
});
