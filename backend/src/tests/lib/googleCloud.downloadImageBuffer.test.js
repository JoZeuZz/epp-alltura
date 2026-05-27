'use strict';

const path = require('path');
const fs = require('fs');

describe('downloadImageBuffer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.doMock('../../lib/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null for null/undefined url', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    expect(await downloadImageBuffer(null)).toBeNull();
    expect(await downloadImageBuffer(undefined)).toBeNull();
    expect(await downloadImageBuffer('')).toBeNull();
  });

  it('reads a local file and returns a Buffer', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    process.env.PORT = '5000';

    const { downloadImageBuffer } = require('../../lib/googleCloud');
    // localUploadsDir in googleCloud.js is path.join(__dirname_of_googleCloud, '../../uploads')
    // googleCloud.js is at backend/src/lib/, so localUploadsDir = backend/uploads/
    const uploadsDir = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const tmpFile = path.join(uploadsDir, '__test_img.png');
    const content = Buffer.from('PNG_FAKE_DATA');
    fs.writeFileSync(tmpFile, content);

    try {
      const backendUrl = 'http://localhost:5000';
      const result = await downloadImageBuffer(`${backendUrl}/uploads/__test_img.png`);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('PNG_FAKE_DATA');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('returns null when local file does not exist', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    process.env.PORT = '5000';
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    const result = await downloadImageBuffer('http://localhost:5000/uploads/nonexistent.png');
    expect(result).toBeNull();
  });

  it('returns null for path traversal attempt', async () => {
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    process.env.PORT = '5000';
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    const result = await downloadImageBuffer('http://localhost:5000/uploads/../../../etc/passwd');
    expect(result).toBeNull();
  });

  it('returns null for GCS URL when GCS is not configured', async () => {
    delete process.env.GCS_PROJECT_ID;
    delete process.env.GCS_BUCKET_NAME;
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    const result = await downloadImageBuffer('https://storage.googleapis.com/bucket/object.jpg');
    expect(result).toBeNull();
  });
});
