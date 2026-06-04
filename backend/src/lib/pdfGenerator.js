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

function _drawActaChrome(doc, title, folio, pageNum) {
  // Page border
  doc.save()
     .rect(15, 15, 565, 812)
     .lineWidth(0.5)
     .strokeColor('#CCCCCC')
     .stroke()
     .restore();

  // Vertical divider logo|company
  doc.moveTo(125, 18).lineTo(125, 68)
     .lineWidth(0.5).strokeColor('#CCCCCC').stroke();

  // Logo
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 25, 22, { height: 35 });
  }

  // Company block
  doc.save()
     .fontSize(8.5).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text('Alltura y Servicios Industriales Spa', 135, 25, { lineBreak: false })
     .fontSize(7.5).font('Helvetica').fillColor(MUTED_GRAY)
     .text('RUT: 77.650.492-0', 135, 38, { lineBreak: false })
     .text('Galvarino 630, Los Ángeles', 135, 49, { lineBreak: false })
     .restore();

  // Primary blue divider
  doc.moveTo(15, 72).lineTo(580, 72)
     .lineWidth(0.5).strokeColor(PRIMARY_BLUE).stroke();

  // Document title
  doc.save()
     .fontSize(11).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text(title.toUpperCase(), 40, 80, { width: 515, align: 'center', lineBreak: false })
     .restore();

  // Folio
  if (folio) {
    doc.save()
       .fontSize(8).font('Helvetica').fillColor(MUTED_GRAY)
       .text(`Folio N°: ${folio.toUpperCase()}`, 40, 97, { width: 515, align: 'right', lineBreak: false })
       .restore();
  }

  // Second divider
  doc.moveTo(15, 108).lineTo(580, 108)
     .lineWidth(0.3).strokeColor('#CCCCCC').stroke();

  // Footer line
  doc.moveTo(15, 822).lineTo(580, 822)
     .lineWidth(0.3).strokeColor('#CCCCCC').stroke();

  // Footer text
  doc.save()
     .fontSize(6.5).font('Helvetica').fillColor(MUTED_GRAY)
     .text(
       `Alltura y Servicios Industriales Spa · RUT 77.650.492-0 · Página ${pageNum}`,
       40, 826, { width: 515, align: 'center', lineBreak: false }
     )
     .restore();

  // Reset content cursor
  doc.y = 115;
  doc.fillColor(BODY_TEXT).font('Helvetica').fontSize(9)
     .lineWidth(1).strokeColor('#000000');
}

async function bufferActa(title, buildFn, opts = {}) {
  const { folio } = opts;
  const doc = new PdfTable({
    size: 'A4',
    margins: { top: 130, bottom: 65, left: 40, right: 40 },
  });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let pageNum = 1;
  _drawActaChrome(doc, title, folio, pageNum);
  doc.on('pageAdded', () => {
    pageNum += 1;
    _drawActaChrome(doc, title, folio, pageNum);
  });

  try {
    await buildFn(doc);
  } catch (err) {
    doc.end();
    throw err;
  }

  doc.end();
  return finished;
}

const LOGO_WHITE_PATH = path.join(__dirname, '../assets/logo-alltura-white.png');

function _drawInformeChrome(doc, title, pageNum) {
  // Full-width blue header bar (no left margin — absolute 0)
  doc.save()
     .rect(0, 0, 595, 58)
     .fill('#2A64A4')
     .restore();

  // White logo (fallback to standard logo if white not found)
  const logoSrc = fs.existsSync(LOGO_WHITE_PATH) ? LOGO_WHITE_PATH : LOGO_PATH;
  if (fs.existsSync(logoSrc)) {
    try { doc.image(logoSrc, 15, 10, { height: 38 }); } catch { /* ignore */ }
  }

  // Title
  doc.save()
     .fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF')
     .text(title, 140, 14, { width: 420, lineBreak: false })
     .restore();

  // Generation date subtitle
  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  doc.save()
     .fontSize(8).font('Helvetica').fillColor('#FFFFFF').fillOpacity(0.75)
     .text(`Generado: ${dateStr}`, 140, 36, { width: 420, lineBreak: false })
     .fillOpacity(1)
     .restore();

  // Footer line
  doc.moveTo(40, 800).lineTo(555, 800)
     .lineWidth(0.3).strokeColor('#CCCCCC').stroke();

  // Footer text
  doc.save()
     .fontSize(6.5).font('Helvetica').fillColor(MUTED_GRAY)
     .text(
       `Alltura y Servicios Industriales Spa · RUT 77.650.492-0 · Página ${pageNum}`,
       40, 804, { width: 515, align: 'center', lineBreak: false }
     )
     .restore();

  // Reset content cursor below header bar
  doc.y = 68;
  doc.fillColor(BODY_TEXT).font('Helvetica').fontSize(9)
     .lineWidth(1).strokeColor('#000000');
}

async function bufferInforme(title, buildFn) {
  const doc = new PdfTable({
    size: 'A4',
    margins: { top: 75, bottom: 55, left: 40, right: 40 },
  });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let pageNum = 1;
  _drawInformeChrome(doc, title, pageNum);
  doc.on('pageAdded', () => {
    pageNum += 1;
    _drawInformeChrome(doc, title, pageNum);
  });

  try {
    await buildFn(doc);
  } catch (err) {
    doc.end();
    throw err;
  }

  doc.end();
  return finished;
}

function drawSectionLabel(doc, text) {
  const y = doc.y;
  doc.save()
     .rect(40, y, 3, 13)
     .fill('#2A64A4')
     .restore();
  doc.save()
     .fontSize(9).font('Helvetica-Bold').fillColor('#1E2A4A')
     .text(text, 48, y + 1, { lineBreak: false })
     .restore();
  doc.y = y + 18;
  doc.moveDown(0.3);
}

function drawTableHeader(doc, tableWidth) {
  doc.save()
     .rect(40, doc.y, tableWidth, 18)
     .fill('#2A64A4')
     .restore();
}

module.exports = {
  createDoc, bufferPdf, bufferActa, bufferInforme,
  drawSectionLabel, drawTableHeader,
  DARK_BLUE, BODY_TEXT, MUTED_GRAY,
};
