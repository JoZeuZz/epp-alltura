'use strict';
const { PassThrough } = require('stream');
const { createDoc } = require('../../lib/pdfGenerator');

describe('pdfGenerator.createDoc', () => {
  it('outputs valid PDF bytes (%PDF header)', (done) => {
    const chunks = [];
    const res = new PassThrough();
    res.setHeader = jest.fn();
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const output = Buffer.concat(chunks).toString('binary', 0, 4);
      expect(output).toBe('%PDF');
      done();
    });
    const doc = createDoc('Test', res, 'test.pdf');
    doc.end();
  });

  it('sets Content-Type: application/pdf', () => {
    const res = new PassThrough();
    res.setHeader = jest.fn();
    createDoc('Title', res, 'out.pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });

  it('sets Content-Disposition attachment with given filename', () => {
    const res = new PassThrough();
    res.setHeader = jest.fn();
    createDoc('Title', res, 'my-file.pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="my-file.pdf"'
    );
  });

  it('returns a pdfkit-table doc with a .table() method', () => {
    const res = new PassThrough();
    res.setHeader = jest.fn();
    const doc = createDoc('Title', res, 'out.pdf');
    expect(typeof doc.table).toBe('function');
    doc.end();
  });
});

const { bufferPdf } = require('../../lib/pdfGenerator');

describe('pdfGenerator.bufferPdf', () => {
  it('resolves with Buffer starting with %PDF', async () => {
    const buf = await bufferPdf('Test Title', (doc) => {
      doc.fontSize(9).text('Hello world');
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString('binary')).toBe('%PDF');
  });

  it('rejects when buildFn throws synchronously', async () => {
    await expect(
      bufferPdf('Test', () => { throw new Error('build failed'); })
    ).rejects.toThrow('build failed');
  });

  it('rejects when buildFn throws asynchronously', async () => {
    await expect(
      bufferPdf('Test', async () => { throw new Error('async fail'); })
    ).rejects.toThrow('async fail');
  });

  it('produces different buffers for different content', async () => {
    const buf1 = await bufferPdf('A', (doc) => { doc.text('foo'); });
    const buf2 = await bufferPdf('B', (doc) => { doc.text('bar'); });
    expect(buf1.equals(buf2)).toBe(false);
  });
});
