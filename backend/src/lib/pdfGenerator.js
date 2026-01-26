const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('./logger');
const { formatShortName } = require('./nameUtils');

// Colores corporativos de Alltura Servicios Industriales
const COLORS = {
  primary: '#0c4a6e', // Azul petróleo oscuro (profesional)
  secondary: '#0369a1', // Azul corporativo
  accent: '#059669', // Verde esmeralda (señal de seguridad)
  warning: '#d97706', // Naranja (en proceso)
  danger: '#dc2626', // Rojo (peligro/desarmado)
  text: '#111827', // Negro suave
  textLight: '#6b7280', // Gris medio
  textMuted: '#9ca3af', // Gris claro
  background: '#f8fafc', // Blanco azulado
  backgroundDark: '#e0f2fe', // Azul muy claro
  border: '#cbd5e1', // Gris azulado
  white: '#ffffff'
};

const IMAGE_PAGE_TITLE_Y = 120;
const IMAGE_PAGE_PADDING = 20;

let gcsStorage = null;
const getGcsStorage = () => {
  if (gcsStorage) return gcsStorage;
  const storageOptions = {};

  if (process.env.GCS_PROJECT_ID) {
    storageOptions.projectId = process.env.GCS_PROJECT_ID;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  gcsStorage = new Storage(storageOptions);
  return gcsStorage;
};

const parseGcsUrl = (imageUrl) => {
  try {
    const parsed = new URL(imageUrl);
    const host = parsed.hostname;
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'storage.googleapis.com') {
      if (parts.length < 2) return null;
      const [bucketName, ...objectParts] = parts;
      return { bucketName, objectName: decodeURIComponent(objectParts.join('/')) };
    }

    if (host.endsWith('.storage.googleapis.com')) {
      const bucketName = host.replace('.storage.googleapis.com', '');
      if (!bucketName || parts.length < 1) return null;
      return { bucketName, objectName: decodeURIComponent(parts.join('/')) };
    }

    return null;
  } catch (_error) {
    return null;
  }
};

const getLocalFilePathFromUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (!imageUrl.includes('/uploads/')) return null;

  const urlParts = imageUrl.split('/uploads/');
  if (urlParts.length < 2) return null;
  const filename = urlParts[1];
  if (!filename) return null;

  return path.join(__dirname, '../../uploads', filename);
};

const fetchBuffer = async (url, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
};

const getImageBuffer = async (imageUrl, cache) => {
  if (!imageUrl) return null;
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  let buffer = null;

  try {
    if (imageUrl.includes('storage.googleapis.com')) {
      const gcsInfo = parseGcsUrl(imageUrl);
      if (gcsInfo) {
        const storage = getGcsStorage();
        const file = storage.bucket(gcsInfo.bucketName).file(gcsInfo.objectName);
        const [fileBuffer] = await file.download();
        buffer = fileBuffer;
      }
    } else {
      const localPath = getLocalFilePathFromUrl(imageUrl);
      if (localPath && fs.existsSync(localPath)) {
        buffer = await fs.promises.readFile(localPath);
      } else {
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        buffer = await fetchBuffer(absoluteUrl);
      }
    }
  } catch (error) {
    logger.warn('No se pudo cargar imagen para PDF', {
      error: error.message,
      imageUrl,
    });
  }

  cache.set(imageUrl, buffer);
  return buffer;
};

async function generateScaffoldsPDF(project, scaffolds, res, _filters = {}) {

  
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'LETTER',
    bufferPages: false, // CRÍTICO: false para evitar páginas en blanco
    autoFirstPage: false, // Controlamos manualmente las páginas
    info: {
      Title: `Informe de Andamios - ${project.name}`,
      Author: 'Alltura Servicios Industriales',
      Subject: 'Reporte detallado de andamios por proyecto',
      Keywords: 'andamios, seguridad industrial, construcción'
    }
  });

  // Logo paths - preferir logo blanco para fondos oscuros
  const logoWhitePath = path.join(__dirname, '../assets/logo-alltura-white.png');
  const logoPath = path.join(__dirname, '../assets/logo-alltura.png');
  const logoWhiteExists = fs.existsSync(logoWhitePath);
  const logoExists = fs.existsSync(logoPath);



  // Configurar respuesta HTTP
  const filename = `Informe-Andamios-${project.name.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // ==================== PORTADA PROFESIONAL ====================
  doc.addPage(); // Primera página (portada)
  
  // Fondo degradado azul
  const gradient = doc.linearGradient(0, 0, 0, doc.page.height);
  gradient.stop(0, COLORS.primary).stop(1, COLORS.secondary);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(gradient);

  // Logo centrado superior (preferir versión blanca)
  if (logoWhiteExists) {
    const logoWidth = 180;
    const logoX = (doc.page.width - logoWidth) / 2;
    doc.image(logoWhitePath, logoX, 120, { width: logoWidth });
  } else if (logoExists) {
    // Fallback a texto si no hay logo blanco
    doc
      .fontSize(32)
      .font('Helvetica-Bold')
      .fillColor(COLORS.white)
      .text('ALLTURA', 0, 130, { align: 'center', width: doc.page.width });
    doc
      .fontSize(16)
      .fillColor('#fbbf24')
      .text('SERVICIOS INDUSTRIALES', 0, 170, { align: 'center', width: doc.page.width });
  }

  // Línea decorativa dorada
  doc
    .strokeColor('#fbbf24')
    .lineWidth(3)
    .moveTo(100, 240)
    .lineTo(doc.page.width - 100, 240)
    .stroke();

  // Título principal
  doc
    .fontSize(38)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text('INFORME TÉCNICO', 0, 280, { align: 'center', width: doc.page.width });

  doc
    .fontSize(28)
    .fillColor('#fbbf24')
    .text('GESTIÓN DE ANDAMIOS', 0, 330, { align: 'center', width: doc.page.width });

  // Caja de información del proyecto con diseño moderno
  const infoBoxY = 420;
  const infoBoxHeight = 200;
  
  // Sombra de la caja
  doc
    .fillColor('rgba(0,0,0,0.15)')
    .roundedRect(115, infoBoxY + 5, doc.page.width - 230, infoBoxHeight, 10)
    .fill();

  // Caja principal blanca
  doc
    .fillColor(COLORS.white)
    .roundedRect(110, infoBoxY, doc.page.width - 220, infoBoxHeight, 10)
    .fill();

  // Borde de la caja
  doc
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .roundedRect(110, infoBoxY, doc.page.width - 220, infoBoxHeight, 10)
    .stroke();

  // Barra superior verde de la caja
  doc
    .fillColor(COLORS.accent)
    .roundedRect(110, infoBoxY, doc.page.width - 220, 35, 10)
    .fill();
  
  // "Detalles del Proyecto" en barra verde
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text('DETALLES DEL PROYECTO', 120, infoBoxY + 10);

  // Contenido de la caja - formato más limpio
  let infoY = infoBoxY + 55;
  const leftMargin = 130;

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text('Nombre del Proyecto:', leftMargin, infoY);
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text(project.name, leftMargin, infoY + 16);
  infoY += 46;

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text('Cliente:', leftMargin, infoY);
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(project.client_name || 'N/A', leftMargin, infoY + 16);
  infoY += 46;

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text('Fecha de Generación:', leftMargin, infoY);
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(new Date().toLocaleDateString('es-CL', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), leftMargin, infoY + 16);

  // Pie de portada
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(COLORS.white)
    .text('ALLTURA SERVICIOS INDUSTRIALES', 0, doc.page.height - 80, { 
      align: 'center', 
      width: doc.page.width 
    });
  doc
    .fontSize(8)
    .fillColor('#fbbf24')
    .text('Seguridad • Calidad • Excelencia', 0, doc.page.height - 65, { 
      align: 'center', 
      width: doc.page.width 
    });

  // ==================== PÁGINA DE RESUMEN EJECUTIVO ====================
  doc.addPage();
  addProfessionalHeader(doc, logoWhitePath, logoWhiteExists);

  // Título de sección con línea
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('RESUMEN EJECUTIVO', 50, 120);

  doc
    .strokeColor(COLORS.accent)
    .lineWidth(3)
    .moveTo(50, 155)
    .lineTo(300, 155)
    .stroke();

  // Calcular estadísticas detalladas
  const stats = calculateStatistics(scaffolds);

  // Grid de KPIs - 4 columnas
  const kpiStartY = 180;
  const kpiGap = 12;
  const kpiWidth = 125;
  const kpiHeight = 85;

  // Fila 1: Totales
  drawModernKPI(doc, 50, kpiStartY, kpiWidth, kpiHeight,
    stats.total.toString(), 'Total de Andamios', COLORS.primary, 'square');
  
  drawModernKPI(doc, 50 + kpiWidth + kpiGap, kpiStartY, kpiWidth, kpiHeight,
    stats.assembled.toString(), 'Armados', COLORS.accent, 'check');
  
  drawModernKPI(doc, 50 + (kpiWidth + kpiGap) * 2, kpiStartY, kpiWidth, kpiHeight,
    stats.inProgress.toString(), 'En Proceso', COLORS.warning, 'clock');
  
  drawModernKPI(doc, 50 + (kpiWidth + kpiGap) * 3, kpiStartY, kpiWidth, kpiHeight,
    stats.disassembled.toString(), 'Desarmados', COLORS.danger, 'cross');

  // Fila 2: Metros cúbicos
  const row2Y = kpiStartY + kpiHeight + kpiGap;
  
  drawModernKPI(doc, 50, row2Y, kpiWidth, kpiHeight,
    `${stats.totalM3.toFixed(1)}`, 'Total m³', COLORS.secondary, 'cube');
  
  drawModernKPI(doc, 50 + kpiWidth + kpiGap, row2Y, kpiWidth, kpiHeight,
    `${stats.assembledM3.toFixed(1)}`, 'm³ Armados', COLORS.accent, 'cube');
  
  drawModernKPI(doc, 50 + (kpiWidth + kpiGap) * 2, row2Y, kpiWidth, kpiHeight,
    stats.greenCards.toString(), 'Tarjetas Verdes', '#059669', 'shield');
  
  drawModernKPI(doc, 50 + (kpiWidth + kpiGap) * 3, row2Y, kpiWidth, kpiHeight,
    stats.redCards.toString(), 'Tarjetas Rojas', COLORS.danger, 'alert');

  // Análisis de cumplimiento
  const analysisY = row2Y + kpiHeight + 30;
  
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('Indicadores de Seguridad', 50, analysisY);

  const indicatorY = analysisY + 35;
  const barWidth = doc.page.width - 100;

  // Porcentaje de andamios con tarjeta verde (seguridad)
  const greenPercentage = stats.assembled > 0 ? (stats.greenCards / stats.assembled * 100) : 0;
  drawProgressBar(doc, 50, indicatorY, barWidth, 35,
    greenPercentage, 'Andamios Seguros (Tarjeta Verde)', COLORS.accent);

  // Porcentaje de andamios armados
  const assembledPercentage = stats.total > 0 ? (stats.assembled / stats.total * 100) : 0;
  drawProgressBar(doc, 50, indicatorY + 50, barWidth, 35,
    assembledPercentage, 'Tasa de Ocupación', COLORS.secondary);

  // Tabla de resumen por estado
  const tableY = indicatorY + 120;
  
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('Distribución Detallada', 50, tableY);

  drawSummaryTable(doc, 50, tableY + 30, stats);
  


  // ==================== LISTADO DETALLADO DE ANDAMIOS ====================
  doc.addPage();
  addProfessionalHeader(doc, logoWhitePath, logoWhiteExists);

  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('LISTADO DETALLADO', 50, 120);

  doc
    .strokeColor(COLORS.accent)
    .lineWidth(3)
    .moveTo(50, 155)
    .lineTo(280, 155)
    .stroke();

  let currentY = 180;

  const imageCache = new Map();

  for (const [index, scaffold] of scaffolds.entries()) {
    let cardHeight = 185;

    if (scaffold.assembly_notes && scaffold.disassembly_notes) {
      cardHeight += 50;
    } else if (scaffold.assembly_notes || scaffold.disassembly_notes) {
      cardHeight += 10;
    }

    // Verificar si necesitamos nueva página
    if (currentY + cardHeight > doc.page.height - 80) {
      // Crear nueva página
      doc.addPage();
      addProfessionalHeader(doc, logoWhitePath, logoWhiteExists);
      currentY = 120;
    }

    // Dibujar tarjeta de andamio con diseño moderno
    await drawScaffoldCard(
      doc,
      50,
      currentY,
      doc.page.width - 100,
      cardHeight,
      scaffold,
      index + 1
    );

    currentY += cardHeight + 18;

    if (scaffold.assembly_image_url || scaffold.disassembly_image_url) {
      await drawScaffoldImagesPage(
        doc,
        scaffold,
        index + 1,
        imageCache,
        logoWhitePath,
        logoWhiteExists
      );
    }
  }
  


  doc.end();
}

// ==================== FUNCIONES AUXILIARES ====================

// Header profesional para páginas internas
function addProfessionalHeader(doc, logoWhitePath, logoWhiteExists) {
  // Fondo de header
  doc
    .fillColor(COLORS.primary)
    .rect(0, 0, doc.page.width, 80)
    .fill();

  // Logo blanco si existe
  if (logoWhiteExists) {
    doc.image(logoWhitePath, 50, 20, { width: 100 });
  } else {
    // Fallback a texto
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(COLORS.white)
      .text('ALLTURA', 50, 28);
  }

  // Nombre de la empresa
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text('ALLTURA SERVICIOS INDUSTRIALES', logoWhiteExists ? 170 : 50, 30, {
      width: doc.page.width - (logoWhiteExists ? 220 : 100)
    });

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#fbbf24')
    .text('Seguridad Industrial • Gestión de Andamios', logoWhiteExists ? 170 : 50, 52, {
      width: doc.page.width - (logoWhiteExists ? 220 : 100)
    });
}

// KPI moderno con iconografía
function drawModernKPI(doc, x, y, width, height, value, label, color, icon) {
  // Sombra suave
  doc
    .fillColor('rgba(0,0,0,0.08)')
    .roundedRect(x + 3, y + 3, width, height, 8)
    .fill();

  // Fondo blanco
  doc
    .fillColor(COLORS.white)
    .roundedRect(x, y, width, height, 8)
    .fill();

  // Borde de color
  doc
    .strokeColor(color)
    .lineWidth(2)
    .roundedRect(x, y, width, height, 8)
    .stroke();

  // Barra superior de color
  doc
    .fillColor(color)
    .roundedRect(x, y, width, 28, 8)
    .fill();
  
  // Rectángulo para cubrir esquinas inferiores de la barra
  doc
    .fillColor(color)
    .rect(x, y + 20, width, 8)
    .fill();

  // Icono representativo (simple)
  drawIcon(doc, x + width - 28, y + 6, 16, icon, COLORS.white);

  // Valor principal
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(value, x + 10, y + 38, { width: width - 20, align: 'left' });

  // Etiqueta
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text(label, x + 10, y + height - 20, { width: width - 20, align: 'left' });
}

// Dibujar iconos simples
function drawIcon(doc, x, y, size, type, color) {
  doc.save();
  doc.fillColor(color);
  
  switch (type) {
    case 'check':
      doc
        .lineWidth(3)
        .strokeColor(color)
        .moveTo(x, y + size / 2)
        .lineTo(x + size / 3, y + size - 2)
        .lineTo(x + size, y)
        .stroke();
      break;
    
    case 'cross':
      doc
        .lineWidth(3)
        .strokeColor(color)
        .moveTo(x, y)
        .lineTo(x + size, y + size)
        .moveTo(x + size, y)
        .lineTo(x, y + size)
        .stroke();
      break;
    
    case 'clock':
      doc
        .circle(x + size / 2, y + size / 2, size / 2)
        .stroke();
      doc
        .moveTo(x + size / 2, y + size / 2)
        .lineTo(x + size / 2, y + 2)
        .moveTo(x + size / 2, y + size / 2)
        .lineTo(x + size - 2, y + size / 2)
        .stroke();
      break;
    
    case 'cube':
    case 'square':
      doc.rect(x, y, size, size).fill();
      break;
    
    case 'shield':
      doc
        .moveTo(x + size / 2, y)
        .lineTo(x + size, y + size / 3)
        .lineTo(x + size, y + 2 * size / 3)
        .lineTo(x + size / 2, y + size)
        .lineTo(x, y + 2 * size / 3)
        .lineTo(x, y + size / 3)
        .fill();
      break;
    
    case 'alert':
      doc
        .moveTo(x + size / 2, y)
        .lineTo(x + size, y + size)
        .lineTo(x, y + size)
        .fill();
      doc.fillColor(COLORS.white).circle(x + size / 2, y + size - 8, 2).fill();
      break;
  }
  doc.restore();
}

// Barra de progreso horizontal
function drawProgressBar(doc, x, y, width, height, percentage, label, color) {
  // Etiqueta
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(label, x, y);

  const barY = y + 18;
  const barHeight = 12;

  // Fondo de la barra
  doc
    .fillColor('#e5e7eb')
    .roundedRect(x, barY, width, barHeight, 6)
    .fill();

  // Barra de progreso
  const filledWidth = (width * percentage) / 100;
  if (filledWidth > 0) {
    doc
      .fillColor(color)
      .roundedRect(x, barY, filledWidth, barHeight, 6)
      .fill();
  }

  // Porcentaje
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(`${percentage.toFixed(1)}%`, x + width + 10, barY - 1);
}

// Tabla de resumen
function drawSummaryTable(doc, x, y, stats) {
  const tableWidth = doc.page.width - 100;
  const rowHeight = 32;
  const colWidth = tableWidth / 4;

  // Encabezados
  doc
    .fillColor(COLORS.primary)
    .rect(x, y, tableWidth, rowHeight)
    .fill();

  const headers = ['Estado', 'Cantidad', 'm³', '% del Total'];
  headers.forEach((header, i) => {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.white)
      .text(header, x + colWidth * i + 10, y + 10, { width: colWidth - 20 });
  });

  // Filas de datos
  const rows = [
    { label: 'Armados', count: stats.assembled, m3: stats.assembledM3, color: COLORS.accent },
    { label: 'En Proceso', count: stats.inProgress, m3: stats.inProgressM3, color: COLORS.warning },
    { label: 'Desarmados', count: stats.disassembled, m3: stats.disassembledM3, color: COLORS.danger }
  ];

  rows.forEach((row, i) => {
    const rowY = y + rowHeight * (i + 1);
    const bgColor = i % 2 === 0 ? '#f9fafb' : COLORS.white;
    
    doc
      .fillColor(bgColor)
      .rect(x, rowY, tableWidth, rowHeight)
      .fill();

    // Indicador de color
    doc
      .fillColor(row.color)
      .rect(x, rowY, 6, rowHeight)
      .fill();

    const percentage = stats.total > 0 ? ((row.count / stats.total) * 100).toFixed(1) : '0.0';

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.text)
      .text(row.label, x + 16, rowY + 10, { width: colWidth - 26 })
      .text(row.count.toString(), x + colWidth + 10, rowY + 10, { width: colWidth - 20 })
      .text(`${row.m3.toFixed(1)} m³`, x + colWidth * 2 + 10, rowY + 10, { width: colWidth - 20 })
      .text(`${percentage}%`, x + colWidth * 3 + 10, rowY + 10, { width: colWidth - 20 });
  });
}

// Tarjeta de andamio mejorada
async function drawScaffoldCard(doc, x, y, width, height, scaffold, number) {
  // Sombra
  doc
    .fillColor('rgba(0,0,0,0.1)')
    .roundedRect(x + 3, y + 3, width, height, 10)
    .fill();

  // Fondo
  doc
    .fillColor(COLORS.white)
    .roundedRect(x, y, width, height, 10)
    .fill();

  // Borde según estado
  let borderColor = COLORS.accent;
  if (scaffold.assembly_status === 'in_progress') borderColor = COLORS.warning;
  if (scaffold.assembly_status === 'disassembled') borderColor = COLORS.danger;

  doc
    .strokeColor(borderColor)
    .lineWidth(3)
    .roundedRect(x, y, width, height, 10)
    .stroke();

  // Barra superior con número
  doc
    .fillColor(COLORS.primary)
    .roundedRect(x, y, width, 35, 10)
    .fill();
  
  doc
    .fillColor(COLORS.primary)
    .rect(x, y + 25, width, 10)
    .fill();

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text(`ANDAMIO #${number}`, x + 15, y + 10);

  // Badges de estado
  const badgeY = y + 8;
  const rightX = x + width;

  // Badge de estado de armado
  const statusText = scaffold.assembly_status === 'assembled' ? 'ARMADO' :
                     scaffold.assembly_status === 'in_progress' ? 'EN PROCESO' : 'DESARMADO';
  const statusColor = scaffold.assembly_status === 'assembled' ? COLORS.accent :
                      scaffold.assembly_status === 'in_progress' ? COLORS.warning : COLORS.danger;

  doc
    .fillColor(statusColor)
    .roundedRect(rightX - 215, badgeY, 100, 20, 10)
    .fill();
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text(statusText, rightX - 210, badgeY + 5, { width: 90, align: 'center' });

  // Badge de tarjeta
  const cardColor = scaffold.card_status === 'green' ? '#059669' : COLORS.danger;
  const cardText = scaffold.card_status === 'green' ? 'VERDE' : 'ROJA';

  doc
    .fillColor(cardColor)
    .roundedRect(rightX - 105, badgeY, 90, 20, 10)
    .fill();
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white)
    .text(cardText, rightX - 100, badgeY + 5, { width: 80, align: 'center' });

  // Contenido - diseño de dos columnas
  let contentY = y + 50;
  const leftCol = x + 20;
  const rightCol = x + width / 2 + 10;
  const lineHeight = 16;

  // === COLUMNA IZQUIERDA ===
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);

  // Número de andamio
  if (scaffold.scaffold_number) {
    doc.text('Nº Andamio:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(scaffold.scaffold_number, leftCol + 70, contentY);
    contentY += lineHeight;
  }

  // Área
  if (scaffold.area) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Área:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(scaffold.area, leftCol + 70, contentY);
    contentY += lineHeight;
  }

  // TAG
  if (scaffold.tag) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('TAG:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(scaffold.tag, leftCol + 70, contentY);
    contentY += lineHeight;
  }

  // Empresa
  if (scaffold.company_name) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Empresa:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(scaffold.company_name, leftCol + 70, contentY, { width: width / 2 - 100, ellipsis: true });
    contentY += lineHeight;
  }

  // Usuario Solicitante (NUEVO)
  if (scaffold.client_user_name) {
    const clientUserName = formatShortName(scaffold.client_user_name);
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Usuario Solicitante:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(clientUserName, leftCol + 100, contentY, { width: width / 2 - 130, ellipsis: true });
    contentY += lineHeight;
  }

  // Supervisor de obra
  const supervisorObra = scaffold.creator_role === 'admin' 
    ? formatShortName(scaffold.supervisor_name || '')
    : formatShortName(scaffold.created_by_name || scaffold.user_name || '');
  
  if (supervisorObra) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Supervisor Obra:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(supervisorObra, leftCol + 100, contentY, { width: width / 2 - 130, ellipsis: true });
    contentY += lineHeight;
  }

  // Creado por
  if (scaffold.created_by_name) {
    const createdByName = formatShortName(scaffold.created_by_name);
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Creado por:', leftCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(createdByName, leftCol + 70, contentY, { width: width / 2 - 100, ellipsis: true });
  }

  // === COLUMNA DERECHA ===
  contentY = y + 50;

  // Dimensiones
  const length = scaffold.length || scaffold.depth;
  doc.font('Helvetica').fillColor(COLORS.textLight)
     .text('Dimensiones:', rightCol, contentY)
     .font('Helvetica-Bold').fillColor(COLORS.text)
     .text(`${scaffold.height}m × ${scaffold.width}m × ${length}m`, rightCol + 75, contentY);
  contentY += lineHeight;

  // m³ Base
  doc.font('Helvetica').fillColor(COLORS.textLight)
     .text('m³ Base:', rightCol, contentY)
     .font('Helvetica-Bold').fillColor(COLORS.text)
     .text(`${parseFloat(scaffold.cubic_meters).toFixed(2)} m³`, rightCol + 75, contentY);
  contentY += lineHeight;

  // m³ Adicionales (si existe)
  const additionalM3 = parseFloat(scaffold.additional_cubic_meters || 0);
  if (additionalM3 > 0) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('m³ Adicionales:', rightCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.warning)
       .text(`${additionalM3.toFixed(2)} m³`, rightCol + 75, contentY);
    contentY += lineHeight;

    const totalM3 = parseFloat(scaffold.total_cubic_meters || scaffold.cubic_meters);
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Total m³:', rightCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.accent)
       .text(`${totalM3.toFixed(2)} m³`, rightCol + 75, contentY);
    contentY += lineHeight;
  }

  // Progreso
  doc.font('Helvetica').fillColor(COLORS.textLight)
     .text('Progreso:', rightCol, contentY)
     .font('Helvetica-Bold').fillColor(COLORS.text)
     .text(`${scaffold.progress_percentage}%`, rightCol + 75, contentY);
  contentY += lineHeight;

  // Fecha de Creación
  doc.font('Helvetica').fillColor(COLORS.textLight)
     .text('Fecha Creación:', rightCol, contentY)
     .font('Helvetica-Bold').fillColor(COLORS.text)
     .text(new Date(scaffold.assembly_created_at).toLocaleDateString('es-CL'), rightCol + 90, contentY);
  contentY += lineHeight;

  // Fecha de Montaje (NUEVO - solo si está armado)
  if (scaffold.assembly_status === 'assembled' && scaffold.assembly_date) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Fecha Montaje:', rightCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.accent)
       .text(new Date(scaffold.assembly_date).toLocaleDateString('es-CL') + ' ' + 
             new Date(scaffold.assembly_date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), 
             rightCol + 90, contentY);
    contentY += lineHeight;
  }

  // Fecha de Desarmado (si existe)
  if (scaffold.disassembled_at) {
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Fecha Desarmado:', rightCol, contentY)
       .font('Helvetica-Bold').fillColor(COLORS.danger)
       .text(new Date(scaffold.disassembled_at).toLocaleDateString('es-CL'), rightCol + 105, contentY);
  }

  // Notas de montaje (si existen)
  if (scaffold.assembly_notes) {
    const notesY = y + height - 50;
    
    // Fondo para notas
    doc
      .fillColor('#f3f4f6')
      .roundedRect(x + 15, notesY, width - 30, 40, 5)
      .fill();

    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.text)
       .text('Notas de Montaje:', x + 25, notesY + 8);
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textLight)
       .text(scaffold.assembly_notes, x + 25, notesY + 20, { 
         width: width - 50,
         ellipsis: true,
         lineBreak: true
       });
  }

  // Notas de desarmado (si existen)
  if (scaffold.disassembly_notes) {
    const notesY = scaffold.assembly_notes ? y + height - 100 : y + height - 50;
    
    doc
      .fillColor('#fef2f2')
      .roundedRect(x + 15, notesY, width - 30, 40, 5)
      .fill();

    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.danger)
       .text('Notas de Desarmado:', x + 25, notesY + 8);
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.textLight)
       .text(scaffold.disassembly_notes, x + 25, notesY + 20, { 
         width: width - 50,
         ellipsis: true,
         lineBreak: true
       });
  }
}

async function drawScaffoldImagesPage(doc, scaffold, number, imageCache, logoWhitePath, logoWhiteExists) {
  doc.addPage();
  addProfessionalHeader(doc, logoWhitePath, logoWhiteExists);

  const title = `EVIDENCIAS FOTOGRÁFICAS - ANDAMIO #${number}`;

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text(title, 50, IMAGE_PAGE_TITLE_Y);

  const subtitleParts = [];
  if (scaffold.project_name) subtitleParts.push(`Proyecto: ${scaffold.project_name}`);
  if (scaffold.scaffold_number) subtitleParts.push(`N° ${scaffold.scaffold_number}`);
  if (scaffold.area) subtitleParts.push(`Área: ${scaffold.area}`);

  if (subtitleParts.length > 0) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text(subtitleParts.join(' • '), 50, IMAGE_PAGE_TITLE_Y + 22);
  }

  const hasAssembly = Boolean(scaffold.assembly_image_url);
  const hasDisassembly = Boolean(scaffold.disassembly_image_url);
  const contentOffset = subtitleParts.length > 0 ? 46 : 32;
  const boxY = IMAGE_PAGE_TITLE_Y + contentOffset;
  const pageWidth = doc.page.width;
  const boxHeight = doc.page.height - boxY - 80;
  const gap = 16;
  const boxX = 50;

  const drawImageBox = async (label, imageUrl, x, width) => {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.textLight)
      .text(label, x, boxY);

    const imageBoxY = boxY + 14;
    const imageBoxHeight = boxHeight - 14;

    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .roundedRect(x, imageBoxY, width, imageBoxHeight, 8)
      .stroke();

    const imageBuffer = await getImageBuffer(imageUrl, imageCache);
    if (imageBuffer) {
      doc.image(imageBuffer, x + IMAGE_PAGE_PADDING, imageBoxY + IMAGE_PAGE_PADDING, {
        fit: [width - IMAGE_PAGE_PADDING * 2, imageBoxHeight - IMAGE_PAGE_PADDING * 2],
        align: 'center',
        valign: 'center',
      });
    } else {
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor(COLORS.textMuted)
        .text('No se pudo cargar la imagen', x, imageBoxY + imageBoxHeight / 2 - 6, {
          width,
          align: 'center',
        });
    }
  };

  if (hasAssembly && hasDisassembly) {
    const boxWidth = (pageWidth - 100 - gap) / 2;
    await drawImageBox('Montaje', scaffold.assembly_image_url, boxX, boxWidth);
    await drawImageBox('Desarmado', scaffold.disassembly_image_url, boxX + boxWidth + gap, boxWidth);
  } else if (hasAssembly) {
    const boxWidth = pageWidth - 100;
    await drawImageBox('Montaje', scaffold.assembly_image_url, boxX, boxWidth);
  } else if (hasDisassembly) {
    const boxWidth = pageWidth - 100;
    await drawImageBox('Desarmado', scaffold.disassembly_image_url, boxX, boxWidth);
  }
}

// Calcular estadísticas detalladas
function calculateStatistics(scaffolds) {
  const stats = {
    total: scaffolds.length,
    assembled: 0,
    inProgress: 0,
    disassembled: 0,
    totalM3: 0,
    assembledM3: 0,
    inProgressM3: 0,
    disassembledM3: 0,
    greenCards: 0,
    redCards: 0
  };

  scaffolds.forEach(s => {
    const m3 = parseFloat(s.total_cubic_meters || s.cubic_meters || 0);
    stats.totalM3 += m3;

    if (s.assembly_status === 'assembled') {
      stats.assembled++;
      stats.assembledM3 += m3;
    } else if (s.assembly_status === 'in_progress') {
      stats.inProgress++;
      stats.inProgressM3 += m3;
    } else if (s.assembly_status === 'disassembled') {
      stats.disassembled++;
      stats.disassembledM3 += m3;
    }

    if (s.card_status === 'green') stats.greenCards++;
    if (s.card_status === 'red') stats.redCards++;
  });

  return stats;
}

module.exports = { generateScaffoldsPDF };
