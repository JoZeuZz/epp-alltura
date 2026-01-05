const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Colores corporativos de Alltura
const COLORS = {
  primary: '#1e3a8a', // Azul oscuro
  secondary: '#3b82f6', // Azul
  accent: '#10b981', // Verde
  text: '#1f2937', // Gris oscuro
  textLight: '#6b7280', // Gris
  background: '#f9fafb', // Gris muy claro
  border: '#e5e7eb' // Gris claro
};

function generateScaffoldsPDF(project, scaffolds, res, filters = {}) {
  const doc = new PDFDocument({ 
    margin: 40,
    size: 'LETTER',
    bufferPages: true
  });

  // Configurar la respuesta para que el navegador descargue el archivo
  const filename = `Reporte-Proyecto-${project.name.replace(/\s/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // ===== PÁGINA DE PORTADA =====
  const logoPath = path.join(__dirname, '../assets/logo-alltura.png');
  
  // Verificar si el logo existe
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 120 });
  }

  // Título principal
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('Reporte de Andamios', 40, 200, { align: 'center' });
  
  doc
    .fontSize(24)
    .fillColor(COLORS.secondary)
    .text(project.name, { align: 'center' });
  
  doc.moveDown(3);

  // Caja de información del proyecto
  const boxY = 300;
  doc
    .fillColor(COLORS.background)
    .rect(80, boxY, doc.page.width - 160, 140)
    .fill();
  
  doc
    .fillColor(COLORS.primary)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .rect(80, boxY, doc.page.width - 160, 140)
    .stroke();

  // Información del proyecto dentro de la caja
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text('Detalles del Proyecto', 100, boxY + 20);
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text(`Nombre: `, 100, boxY + 45, { continued: true })
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(project.name);
  
  doc
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text(`Cliente: `, 100, boxY + 65, { continued: true })
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(project.client_name);
  
  doc
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text(`Fecha de Generación: `, 100, boxY + 85, { continued: true })
    .font('Helvetica-Bold')
    .fillColor(COLORS.text)
    .text(new Date().toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

  // Añadir información de filtros si existen
  const appliedFilters = Object.entries(filters).filter(([, value]) => value && value !== 'all');
  if (appliedFilters.length > 0) {
    doc
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text('Filtros Aplicados:', 100, boxY + 105);
    
    let filterY = boxY + 120;
    if (filters.status && filters.status !== 'all') {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text(`- Estado: ${filters.status === 'assembled' ? 'Armado' : 'Desarmado'}`, 100, filterY);
    }
  }

  // Nueva página para el resumen
  doc.addPage();
  
  // ===== PÁGINA DE RESUMEN =====
  addHeader(doc, logoPath);
  
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('Resumen', 40, 100);
  
  // Línea decorativa
  doc
    .strokeColor(COLORS.secondary)
    .lineWidth(3)
    .moveTo(40, 130)
    .lineTo(200, 130)
    .stroke();

  // Calcular estadísticas
  const totalCubicMeters = scaffolds.reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  const assembledCount = scaffolds.filter(s => s.assembly_status === 'assembled').length;
  const inProgressCount = scaffolds.filter(s => s.assembly_status === 'in_progress').length;
  const disassembledCount = scaffolds.filter(s => s.assembly_status === 'disassembled').length;
  const assembledM3 = scaffolds.filter(s => s.assembly_status === 'assembled').reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  const greenCards = scaffolds.filter(s => s.card_status === 'green').length;
  const redCards = scaffolds.filter(s => s.card_status === 'red').length;

  // Tarjetas de estadísticas
  const cardY = 160;
  const cardWidth = 140;
  const cardHeight = 80;
  const cardGap = 15;

  // Primera fila de tarjetas
  // Tarjeta 1: Total Andamios
  drawStatCard(doc, 40, cardY, cardWidth, cardHeight, 
    scaffolds.length.toString(), 
    'Total de Andamios', 
    COLORS.primary);

  // Tarjeta 2: Armados
  drawStatCard(doc, 40 + cardWidth + cardGap, cardY, cardWidth, cardHeight, 
    assembledCount.toString(), 
    'Armados', 
    COLORS.accent);

  // Tarjeta 3: En Proceso
  drawStatCard(doc, 40 + (cardWidth + cardGap) * 2, cardY, cardWidth, cardHeight, 
    inProgressCount.toString(), 
    'En Proceso', 
    '#f59e0b');

  // Tarjeta 4: Desarmados
  drawStatCard(doc, 40 + (cardWidth + cardGap) * 3, cardY, cardWidth, cardHeight, 
    disassembledCount.toString(), 
    'Desarmados', 
    '#ef4444');

  // Segunda fila de tarjetas
  const secondRowY = cardY + cardHeight + 20;

  // Tarjeta 5: Total m³
  drawStatCard(doc, 40, secondRowY, cardWidth, cardHeight, 
    `${totalCubicMeters.toFixed(1)} m³`, 
    'Total Metros Cúbicos', 
    COLORS.secondary);

  // Tarjeta 6: m³ Armados
  drawStatCard(doc, 40 + cardWidth + cardGap, secondRowY, cardWidth, cardHeight, 
    `${assembledM3.toFixed(1)} m³`, 
    'm³ Armados', 
    COLORS.accent);

  // Tarjeta 7: Tarjetas Verdes
  drawStatCard(doc, 40 + (cardWidth + cardGap) * 2, secondRowY, cardWidth, cardHeight, 
    greenCards.toString(), 
    'Tarjetas Verdes', 
    '#10b981');

  // Tarjeta 8: Tarjetas Rojas
  drawStatCard(doc, 40 + (cardWidth + cardGap) * 3, secondRowY, cardWidth, cardHeight, 
    redCards.toString(), 
    'Tarjetas Rojas', 
    '#ef4444');

  // Nueva página para el listado
  doc.addPage();

  // ===== LISTADO DE ANDAMIOS =====
  addHeader(doc, logoPath);
  
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('Listado de Andamios', 40, 100);
  
  // Línea decorativa
  doc
    .strokeColor(COLORS.secondary)
    .lineWidth(3)
    .moveTo(40, 130)
    .lineTo(240, 130)
    .stroke();

  let currentY = 160;

  // Listado detallado de andamios
  scaffolds.forEach((scaffold, index) => {
    // Verificar si necesitamos nueva página
    if (currentY > doc.page.height - 200) {
      doc.addPage();
      addHeader(doc, logoPath);
      currentY = 100;
    }

    // Caja de andamio
    const boxHeight = 160;
    
    // Fondo de la caja
    doc
      .fillColor(COLORS.background)
      .rect(40, currentY, doc.page.width - 80, boxHeight)
      .fill();

    // Borde de la caja con color según estado
    let borderColor = COLORS.accent; // assembled
    if (scaffold.assembly_status === 'in_progress') borderColor = '#f59e0b';
    if (scaffold.assembly_status === 'disassembled') borderColor = '#ef4444';
    
    doc
      .strokeColor(borderColor)
      .lineWidth(2)
      .rect(40, currentY, doc.page.width - 80, boxHeight)
      .stroke();

    // Badge de número de andamio
    doc
      .fillColor(COLORS.primary)
      .rect(40, currentY, 100, 30)
      .fill();
    
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(`Andamio #${index + 1}`, 50, currentY + 8);

    // Estado badge - assembly_status
    const statusX = doc.page.width - 220;
    let statusColor = COLORS.accent;
    let statusText = 'ARMADO';
    
    if (scaffold.assembly_status === 'in_progress') {
      statusColor = '#f59e0b';
      statusText = 'EN PROCESO';
    } else if (scaffold.assembly_status === 'disassembled') {
      statusColor = '#ef4444';
      statusText = 'DESARMADO';
    }
    
    doc
      .fillColor(statusColor)
      .rect(statusX, currentY + 5, 95, 20)
      .fill();
    
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(statusText, statusX + 5, currentY + 10, { width: 85, align: 'center' });

    // Badge de tarjeta - card_status
    const cardBadgeX = doc.page.width - 115;
    const cardColor = scaffold.card_status === 'green' ? '#10b981' : '#ef4444';
    const cardText = scaffold.card_status === 'green' ? 'VERDE' : 'ROJA';
    
    doc
      .fillColor(cardColor)
      .rect(cardBadgeX, currentY + 5, 70, 20)
      .fill();
    
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(cardText, cardBadgeX + 5, currentY + 10, { width: 60, align: 'center' });

    // Contenido de la caja - columna izquierda
    let contentY = currentY + 40;
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);

    if (scaffold.scaffold_number) {
      doc.text('Nº Andamio: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(scaffold.scaffold_number);
      contentY += 15;
    }

    if (scaffold.area) {
      doc.font('Helvetica').fillColor(COLORS.textLight)
         .text('Área: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(scaffold.area);
      contentY += 15;
    }

    if (scaffold.tag) {
      doc.font('Helvetica').fillColor(COLORS.textLight)
         .text('TAG: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(scaffold.tag);
      contentY += 15;
    }

    if (scaffold.company_name) {
      doc.font('Helvetica').fillColor(COLORS.textLight)
         .text('Empresa: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(scaffold.company_name);
      contentY += 15;
    }

    // Determinar supervisor de obra según lógica:
    // - Si lo creó un admin, usar supervisor del proyecto
    // - Si lo creó un supervisor, usar ese supervisor
    const supervisorObra = scaffold.creator_role === 'admin' 
      ? (scaffold.supervisor_name || '')
      : (scaffold.created_by_name || scaffold.user_name || '');
    
    if (supervisorObra) {
      doc.font('Helvetica').fillColor(COLORS.textLight)
         .text('Supervisor Obra: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(supervisorObra);
      contentY += 15;
    }

    // Creado por
    if (scaffold.created_by_name) {
      doc.font('Helvetica').fillColor(COLORS.textLight)
         .text('Creado por: ', 50, contentY, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.text).text(scaffold.created_by_name);
    }

    // Contenido de la caja - columna derecha
    contentY = currentY + 40;
    const rightColX = 320;

    const length = scaffold.length || scaffold.depth;
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Dimensiones: ', rightColX, contentY, { continued: true })
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(`${scaffold.height}m x ${scaffold.width}m x ${length}m`);
    contentY += 15;

    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Volumen: ', rightColX, contentY, { continued: true })
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(`${parseFloat(scaffold.cubic_meters).toFixed(2)} m³`);
    contentY += 15;

    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Fecha Creación: ', rightColX, contentY, { continued: true })
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(new Date(scaffold.assembly_created_at).toLocaleDateString('es-CL'));
    contentY += 15;

    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Progreso: ', rightColX, contentY, { continued: true })
       .font('Helvetica-Bold').fillColor(COLORS.text)
       .text(`${scaffold.progress_percentage}%`);
    contentY += 15;

    // Estado de tarjeta
    const tarjetaEstado = scaffold.card_status === 'green' ? 'Verde' : 'Roja';
    doc.font('Helvetica').fillColor(COLORS.textLight)
       .text('Tarjeta: ', rightColX, contentY, { continued: true })
       .font('Helvetica-Bold').fillColor(scaffold.card_status === 'green' ? '#10b981' : '#ef4444')
       .text(tarjetaEstado);

    // Notas si existen
    if (scaffold.assembly_notes) {
      const notesY = currentY + boxHeight - 35;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.text)
         .text('Notas:', 50, notesY);
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.textLight)
         .text(scaffold.assembly_notes, 50, notesY + 12, { 
           width: doc.page.width - 120,
           ellipsis: true 
         });
    }

    currentY += boxHeight + 15;
  });

  // Pie de página en todas las páginas
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    // Línea superior del pie de página
    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(40, doc.page.height - 60)
      .lineTo(doc.page.width - 40, doc.page.height - 60)
      .stroke();
    
    // Texto del pie de página
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text(`Reporte generado por Alltura - ${new Date().toLocaleDateString('es-CL')}`, 
        40, doc.page.height - 45, { align: 'left' });
    
    doc
      .text(`Página ${i + 1} de ${pageCount}`, 
        40, doc.page.height - 45, { align: 'right' });
  }

  // Finalizar el PDF
  doc.end();
}

// Función auxiliar para dibujar el header en cada página
function addHeader(doc, logoPath) {
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 80 });
  }
  
  // Línea decorativa del header
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(40, 85)
    .lineTo(doc.page.width - 40, 85)
    .stroke();
}

// Función auxiliar para dibujar tarjetas de estadísticas
function drawStatCard(doc, x, y, width, height, value, label, color) {
  // Fondo
  doc
    .fillColor('#ffffff')
    .rect(x, y, width, height)
    .fill();
  
  // Borde
  doc
    .strokeColor(color)
    .lineWidth(2)
    .rect(x, y, width, height)
    .stroke();
  
  // Barra superior de color
  doc
    .fillColor(color)
    .rect(x, y, width, 8)
    .fill();
  
  // Valor
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(color)
    .text(value, x, y + 20, { width: width, align: 'center' });
  
  // Label
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(COLORS.textLight)
    .text(label, x, y + 52, { width: width, align: 'center' });
}

module.exports = { generateScaffoldsPDF };