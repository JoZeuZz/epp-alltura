const excel = require('exceljs');

async function generateReportExcel(project, scaffolds) {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet(`Reporte ${project.name}`);

  // Add columns
  worksheet.columns = [
    { header: 'ID Andamio', key: 'id', width: 12 },
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Usuario', key: 'user', width: 30 },
    { header: 'Alto (m)', key: 'height', width: 10 },
    { header: 'Ancho (m)', key: 'width', width: 10 },
    { header: 'Prof. (m)', key: 'depth', width: 10 },
    { header: 'Metros Cúbicos (m³)', key: 'cubic_meters', width: 20 },
    { header: '% Avance', key: 'progress', width: 10 },
    { header: 'Notas Montaje', key: 'notes', width: 50 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };

  // Add rows
  scaffolds.forEach(scaffold => {
    worksheet.addRow({
      id: scaffold.id,
      date: new Date(scaffold.assembly_created_at),
      user: scaffold.user_name,
      height: parseFloat(scaffold.height),
      width: parseFloat(scaffold.width),
      depth: parseFloat(scaffold.depth),
      cubic_meters: parseFloat(scaffold.cubic_meters),
      progress: scaffold.progress_percentage,
      notes: scaffold.assembly_notes
    });
  });

  // Return buffer
  return await workbook.xlsx.writeBuffer();
}

module.exports = { generateReportExcel };
