const path = require('path');
const fs = require('fs');
const os = require('os');

describe('googleCloud.uploadFile', () => {
  const originalEnv = process.env;
  let tmpFile;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.doMock('../../lib/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    // Force local storage for all tests
    process.env.IMAGE_STORAGE_PROVIDER = 'local';
    process.env.IMAGE_MAX_BYTES = '26214400';
    process.env.BACKEND_URL = 'http://localhost:5000';
    // Disable sharp processing so minimal test files pass through as raw streams
    process.env.IMAGE_LOSSLESS_COMPRESSION = 'false';
    process.env.IMAGE_STRIP_METADATA = 'false';
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tmpFile) {
      try { await fs.promises.unlink(tmpFile); } catch { /* already deleted */ }
      tmpFile = null;
    }
  });

  const makeJpegFile = async () => {
    const tmpDir = path.join(__dirname, '../../../uploads/tmp');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `test-${Date.now()}.jpg`);
    // Minimal JPEG magic bytes + padding
    const buf = Buffer.alloc(64);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
    await fs.promises.writeFile(filePath, buf);
    tmpFile = filePath;
    return { path: filePath, mimetype: 'image/jpeg', originalname: 'test.jpg', size: buf.length };
  };

  it('rejects files with unsupported MIME type before touching storage', async () => {
    const { uploadFile } = require('../../lib/googleCloud');
    const fakeFile = { path: '/dev/null', mimetype: 'image/svg+xml', originalname: 'x.svg', size: 1 };
    await expect(uploadFile(fakeFile)).rejects.toThrow(/JPG, PNG, WEBP/i);
  });

  it('rejects files that exceed IMAGE_MAX_BYTES', async () => {
    process.env.IMAGE_MAX_BYTES = '1'; // 1 byte limit
    const file = await makeJpegFile();
    const { uploadFile } = require('../../lib/googleCloud');
    await expect(uploadFile(file)).rejects.toThrow(/tamaño máximo/i);
  });

  it('uploads a valid JPEG to local storage and returns a URL', async () => {
    const file = await makeJpegFile();
    const { uploadFile } = require('../../lib/googleCloud');
    const url = await uploadFile(file);
    expect(url).toMatch(/^http:\/\/localhost:5000\/uploads\/.+\.jpg$/);
    // cleanup uploaded file
    const uploaded = url.replace('http://localhost:5000', path.join(__dirname, '../../..'));
    try { await fs.promises.unlink(uploaded); } catch { /* ignore */ }
  });
});
