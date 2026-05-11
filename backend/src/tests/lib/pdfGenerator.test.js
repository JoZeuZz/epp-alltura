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
