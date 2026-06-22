const jwt = require('jsonwebtoken');

describe('googleCloud.resolveImageUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.doMock('../../lib/logger', () => ({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.IMAGE_PROXY_SECRET = 'b'.repeat(64);
    process.env.IMAGE_PROXY_TTL_SECONDS = '2592000';
    process.env.GCS_IMAGE_PROXY = 'true';
    process.env.GCS_SIGNED_URLS = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exports resolveImageUrl and resolves local uploads through the image proxy', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';

    const { resolveImageUrl } = require('../../lib/googleCloud');
    const resolved = await resolveImageUrl('http://localhost:5000/uploads/epp/photo.jpg');

    expect(resolved).toMatch(/^\/api\/image-proxy\?token=/);

    const token = new URLSearchParams(resolved.split('?')[1]).get('token');
    const payload = jwt.verify(token, process.env.IMAGE_PROXY_SECRET);

    expect(payload.t).toBe('local');
    expect(payload.f).toBe('epp/photo.jpg');
  });

  it('resolves GCS object URLs through the image proxy when proxy is enabled', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'gcs';
    process.env.GCS_PROJECT_ID = 'alltura-test';
    process.env.GCS_BUCKET_NAME = 'private-bucket';

    const { resolveImageUrl } = require('../../lib/googleCloud');
    const resolved = await resolveImageUrl(
      'https://storage.googleapis.com/private-bucket/images%2Fhelmet.jpg'
    );

    expect(resolved).toMatch(/^\/api\/image-proxy\?token=/);

    const token = new URLSearchParams(resolved.split('?')[1]).get('token');
    const payload = jwt.verify(token, process.env.IMAGE_PROXY_SECRET);

    expect(payload.b).toBe('private-bucket');
    expect(payload.o).toBe('images/helmet.jpg');
  });

  it('drops and warns on a non-string (object) value instead of leaking it to the client', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';

    const { logger } = require('../../lib/logger');
    const { resolveImageUrl } = require('../../lib/googleCloud');

    // simulates a runtime payload where an image field arrives as an object
    await expect(resolveImageUrl({ url: '/api/image-proxy?token=x' })).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('valor no-string'));
  });

  it('returns raw image URL when proxy token cannot be created', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    delete process.env.IMAGE_PROXY_SECRET;
    delete process.env.JWT_SECRET;

    const { resolveImageUrl } = require('../../lib/googleCloud');
    const imageUrl = 'http://localhost:5000/uploads/epp/photo.jpg';

    await expect(resolveImageUrl(imageUrl)).resolves.toBe(imageUrl);
  });
});
