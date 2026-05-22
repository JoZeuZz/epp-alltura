'use strict';
const PdfTable = require('pdfkit-table');
const path = require('path');
const fs = require('fs');

const PRIMARY_BLUE = '#2A64A4';
const DARK_BLUE = '#1E2A4A';
const MUTED_GRAY = '#888888';
const BODY_TEXT = '#333333';
const LOGO_PATH = path.join(__dirname, '../assets/logo-alltura.png');

function createDoc(title, res, filename) {
  const doc = new PdfTable({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 40, 30, { height: 30 });
  }

  doc.fontSize(14).fillColor(DARK_BLUE).text(title, 40, 75);
  doc.fontSize(8).fillColor(MUTED_GRAY)
    .text(`Generado: ${new Date().toLocaleString('es-CL')}`, { align: 'right' });
  doc.moveDown(0.5)
    .moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y)
    .strokeColor(PRIMARY_BLUE).stroke()
    .moveDown(0.5);
  doc.fillColor(BODY_TEXT);

  return doc;
}

async function bufferPdf(title, buildFn) {
  const doc = new PdfTable({ margin: 40, size: 'A4' });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 40, 30, { height: 30 });
  }
  doc.fontSize(14).fillColor(DARK_BLUE).text(title, 40, 75);
  doc.fontSize(8).fillColor(MUTED_GRAY)
    .text(`Generado: ${new Date().toLocaleString('es-CL')}`, { align: 'right' });
  doc.moveDown(0.5)
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(PRIMARY_BLUE)
    .stroke()
    .moveDown(0.5);
  doc.fillColor(BODY_TEXT);

  try {
    await buildFn(doc);
  } catch (err) {
    doc.end();
    throw err;
  }

  doc.end();
  return finished;
}

module.exports = { createDoc, bufferPdf, DARK_BLUE, BODY_TEXT, MUTED_GRAY };
