const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

describe('imageProxy Redis cache', () => {
  const SECRET = 'test-secret';
  let cacheStore = {};

  beforeEach(() => {
    cacheStore = {};
    jest.resetModules();

    jest.doMock('../../lib/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    jest.doMock('../../middleware/rateLimit', () => ({
      getRateLimitConfig: jest.fn(() => ({ windowMs: 60000, max: 240 })),
      createRedisRateLimiter: jest.fn(() => (_req, _res, next) => next()),
    }));

    jest.doMock('../../lib/redis', () => ({
      getClient: async () => ({
        get: jest.fn(async (key) => cacheStore[key] || null),
        setEx: jest.fn(async (key, _ttl, value) => { cacheStore[key] = value; }),
        del: jest.fn(async (key) => { delete cacheStore[key]; }),
      }),
    }));

    // Mock GCS storage — should NOT be called on cache HIT
    jest.doMock('@google-cloud/storage', () => ({
      Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
          file: jest.fn().mockReturnValue({
            getMetadata: jest.fn().mockRejectedValue(new Error('should not be called on cache HIT')),
            download: jest.fn().mockRejectedValue(new Error('should not be called on cache HIT')),
          }),
        }),
      })),
    }));

    process.env.IMAGE_PROXY_SECRET = SECRET;
    process.env.GCS_PROJECT_ID = 'test-project';
    process.env.GCS_BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    delete process.env.IMAGE_PROXY_SECRET;
    delete process.env.GCS_PROJECT_ID;
    delete process.env.GCS_BUCKET_NAME;
    jest.clearAllMocks();
  });

  const buildToken = (bucketName, objectName) =>
    jwt.sign({ b: bucketName, o: objectName }, SECRET, { expiresIn: '1h' });

  it('serves from Redis cache on HIT without calling GCS', async () => {
    const fakeImageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const cacheKey = 'imgcache:thumb:test-bucket:images/test.webp';
    cacheStore[cacheKey] = JSON.stringify({
      data: fakeImageBuffer.toString('base64'),
      contentType: 'image/webp',
    });

    const router = require('../../routes/imageProxy.routes');
    const app = express();
    app.use(router);

    const token = buildToken('test-bucket', 'images/test.webp');
    const res = await request(app).get(`/?token=${token}&size=thumb`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch('image/webp');
    expect(res.headers['x-cache']).toBe('HIT');
    expect(Buffer.from(res.body)).toEqual(fakeImageBuffer);
  });
});
