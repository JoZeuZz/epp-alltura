'use strict';
const path = require('path');
const fs = require('fs');

describe('googleCloud.uploadPdfBuffer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, IMAGE_STORAGE_PROVIDER: 'local' };
    jest.doMock('../../lib/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('writes buffer to local storage and returns full backend URL', async () => {
    process.env.BACKEND_URL = 'http://localhost:5000';
    const { uploadPdfBuffer } = require('../../lib/googleCloud');
    const buf = Buffer.from('%PDF-1.4 test content');
    const url = await uploadPdfBuffer(buf, 'test-acta.pdf', { folder: 'actas' });
    expect(url).toBe('http://localhost:5000/uploads/actas/test-acta.pdf');
    const uploadsDir = path.join(__dirname, '../../../uploads');
    const filePath = path.join(uploadsDir, 'actas', 'test-acta.pdf');
    const written = await fs.promises.readFile(filePath);
    expect(written.equals(buf)).toBe(true);
    await fs.promises.unlink(filePath).catch(() => {});
  });

  it('writes to uploads root when no folder specified', async () => {
    process.env.BACKEND_URL = 'http://localhost:5000';
    const { uploadPdfBuffer } = require('../../lib/googleCloud');
    const buf = Buffer.from('%PDF-1.4 no-folder');
    const url = await uploadPdfBuffer(buf, 'root-acta.pdf');
    expect(url).toBe('http://localhost:5000/uploads/root-acta.pdf');
    const uploadsDir = path.join(__dirname, '../../../uploads');
    await fs.promises.unlink(path.join(uploadsDir, 'root-acta.pdf')).catch(() => {});
  });

  it('is exported as a function', () => {
    const { uploadPdfBuffer } = require('../../lib/googleCloud');
    expect(typeof uploadPdfBuffer).toBe('function');
  });
});
