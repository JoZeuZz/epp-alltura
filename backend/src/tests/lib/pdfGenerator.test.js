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

const { bufferActa } = require('../../lib/pdfGenerator');

describe('pdfGenerator.bufferActa', () => {
  it('resolves with a Buffer starting with %PDF', async () => {
    const buf = await bufferActa('Acta de Entrega', async (doc) => {
      doc.text('Test content');
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString('binary')).toBe('%PDF');
  });

  it('accepts folio option without error', async () => {
    const buf = await bufferActa('Acta de Entrega', async (doc) => {
      doc.text('Content');
    }, { folio: 'ABC12345' });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('rejects when buildFn throws synchronously', async () => {
    await expect(
      bufferActa('Test', () => { throw new Error('sync fail'); })
    ).rejects.toThrow('sync fail');
  });

  it('rejects when buildFn throws asynchronously', async () => {
    await expect(
      bufferActa('Test', async () => { throw new Error('async fail'); })
    ).rejects.toThrow('async fail');
  });

  it('does not stack overflow with multi-page content (80 rows)', async () => {
    const buf = await bufferActa('Acta de Entrega', async (doc) => {
      for (let i = 0; i < 80; i++) {
        doc.fontSize(9).text(`Línea de contenido número ${i + 1} — texto de prueba para forzar múltiples páginas`);
      }
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString('binary')).toBe('%PDF');
  }, 30000);
});

const { bufferInforme, drawSectionLabel, drawTableHeader } = require('../../lib/pdfGenerator');

describe('pdfGenerator.bufferInforme', () => {
  it('resolves with a Buffer starting with %PDF', async () => {
    const buf = await bufferInforme('Reporte de Inventario', async (doc) => {
      doc.text('Test content');
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString('binary')).toBe('%PDF');
  });

  it('rejects when buildFn throws synchronously', async () => {
    await expect(
      bufferInforme('Test', () => { throw new Error('sync fail'); })
    ).rejects.toThrow('sync fail');
  });

  it('rejects when buildFn throws asynchronously', async () => {
    await expect(
      bufferInforme('Test', async () => { throw new Error('async fail'); })
    ).rejects.toThrow('async fail');
  });

  it('produces a non-empty buffer', async () => {
    const buf = await bufferInforme('Informe', async (doc) => {
      doc.text('Content line 1');
    });
    expect(buf.length).toBeGreaterThan(500);
  });

  it('does not stack overflow with multi-page content (80 rows)', async () => {
    const buf = await bufferInforme('Reporte de Inventario', async (doc) => {
      for (let i = 0; i < 80; i++) {
        doc.fontSize(9).text(`Línea de contenido número ${i + 1} — texto de prueba para forzar múltiples páginas`);
      }
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString('binary')).toBe('%PDF');
  }, 30000);
});

describe('pdfGenerator.drawSectionLabel', () => {
  it('is a function', () => {
    expect(typeof drawSectionLabel).toBe('function');
  });

  it('does not throw when called with a valid pdfkit doc', async () => {
    const PdfTable = require('pdfkit-table');
    const doc = new PdfTable({ size: 'A4', margin: 40 });
    doc.on('data', () => {});
    doc.on('end', () => {});
    expect(() => drawSectionLabel(doc, 'Mi Sección')).not.toThrow();
    doc.end();
  });
});

describe('pdfGenerator.drawTableHeader', () => {
  it('is a function', () => {
    expect(typeof drawTableHeader).toBe('function');
  });

  it('does not throw when called with a valid pdfkit doc', async () => {
    const PdfTable = require('pdfkit-table');
    const doc = new PdfTable({ size: 'A4', margin: 40 });
    doc.on('data', () => {});
    doc.on('end', () => {});
    expect(() => drawTableHeader(doc, 515)).not.toThrow();
    doc.end();
  });
});
