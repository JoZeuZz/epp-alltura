'use strict';
const PdfTable = require('pdfkit-table');
const path = require('path');
const fs = require('fs');

const PRIMARY_BLUE = '#2A64A4';
const DARK_BLUE = '#1E2A4A';
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
  doc.fontSize(8).fillColor('#888')
    .text(`Generado: ${new Date().toLocaleString('es-CL')}`, { align: 'right' });
  doc.moveDown(0.5)
    .moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y)
    .strokeColor(PRIMARY_BLUE).stroke()
    .moveDown(0.5);
  doc.fillColor('#333');

  return doc;
}

module.exports = { createDoc };
