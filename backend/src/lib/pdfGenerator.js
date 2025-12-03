const PDFDocument = require('pdfkit');

function generateScaffoldsPDF(project, scaffolds, res, filters = {}) {
  const doc = new PDFDocument({ margin: 50 });

  // Configurar la respuesta para que el navegador descargue el archivo
  const filename = `Reporte-Proyecto-${project.name.replace(/\s/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Encabezado
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Reporte de Andamios - Alltura', { align: 'center' });
  
  doc.moveDown();

  // Información del Proyecto
  doc.fontSize(16).font('Helvetica-Bold').text('Detalles del Proyecto');
  doc.fontSize(12).font('Helvetica');
  doc.text(`Nombre: ${project.name}`);
  doc.text(`Cliente: ${project.client_name}`);
  doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`);

  // Añadir información de filtros si existen
  const appliedFilters = Object.entries(filters).filter(([, value]) => value && value !== 'all');
  if (appliedFilters.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Filtros Aplicados:');
    doc.fontSize(10).font('Helvetica');
    if (filters.status && filters.status !== 'all') doc.text(`- Estado: ${filters.status === 'assembled' ? 'Armado' : 'Desarmado'}`);
    if (filters.startDate) doc.text(`- Desde: ${new Date(filters.startDate).toLocaleDateString()}`);
    if (filters.endDate) doc.text(`- Hasta: ${new Date(filters.endDate).toLocaleDateString()}`);
  }

  doc.moveDown(2);

  // Resumen
  const totalCubicMeters = scaffolds.reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  doc.fontSize(16).font('Helvetica-Bold').text('Resumen');
  doc.fontSize(12).font('Helvetica');
  doc.text(`Total de Andamios Reportados: ${scaffolds.length}`);
  doc.text(`Total Metros Cúbicos (m³): ${totalCubicMeters.toFixed(2)}`);

  doc.moveDown(2);

  // Tabla de Andamios
  doc.fontSize(16).font('Helvetica-Bold').text('Listado de Andamios');
  doc.moveDown();

  // Listado detallado de andamios
  doc.fontSize(10).font('Helvetica');
  scaffolds.forEach((scaffold, index) => {
    // Añadir nueva página si es necesario
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.fontSize(12).font('Helvetica-Bold').text(`Andamio #${scaffold.id}`);
    doc.fontSize(10).font('Helvetica');
    
    if (scaffold.scaffold_number) doc.text(`Nº de Andamio: ${scaffold.scaffold_number}`);
    if (scaffold.area) doc.text(`Área: ${scaffold.area}`);
    if (scaffold.tag) doc.text(`TAG: ${scaffold.tag}`);
    if (scaffold.company_name) doc.text(`Solicitante: ${scaffold.company_name}`);
    if (scaffold.end_user_name) doc.text(`Usuario: ${scaffold.end_user_name}`);
    if (scaffold.supervisor_name) doc.text(`Supervisor: ${scaffold.supervisor_name}`);
    
    doc.text(`Dimensiones: ${scaffold.height}m x ${scaffold.width}m x ${scaffold.depth}m`);
    doc.text(`Volumen: ${parseFloat(scaffold.cubic_meters).toFixed(2)} m³`);
    doc.text(`Técnico: ${scaffold.user_name}`);
    doc.text(`Fecha de Montaje: ${new Date(scaffold.assembly_created_at).toLocaleDateString()}`);
    doc.text(`Progreso: ${scaffold.progress_percentage}%`);
    
    if (scaffold.assembly_notes) {
      doc.text(`Notas: ${scaffold.assembly_notes}`);
    }
    
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
  });

  // Pie de página
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 50, {
      align: 'center'
    });
  }

  // Finalizar el PDF
  doc.end();
}

module.exports = { generateScaffoldsPDF };