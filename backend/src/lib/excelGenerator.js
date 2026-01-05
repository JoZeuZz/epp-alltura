const excel = require('exceljs');

async function generateReportExcel(project, scaffolds) {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet(`Reporte ${project.name}`);

  // Metadatos del archivo
  workbook.creator = 'Alltura - Sistema de Gestión de Andamios';
  workbook.created = new Date();

  // Add columns
  worksheet.columns = [
    { header: 'Nº Andamio', key: 'scaffold_number', width: 15 },
    { header: 'Área', key: 'area', width: 20 },
    { header: 'TAG', key: 'tag', width: 15 },
    { header: 'Empresa Solicitante', key: 'company_name', width: 30 },
    { header: 'Supervisor de Obra', key: 'supervisor_name', width: 30 },
    { header: 'Estado Armado', key: 'assembly_status', width: 15 },
    { header: 'Tarjeta', key: 'card_status', width: 12 },
    { header: '% Avance', key: 'progress', width: 10 },
    { header: 'Alto (m)', key: 'height', width: 10 },
    { header: 'Ancho (m)', key: 'width', width: 10 },
    { header: 'Largo (m)', key: 'length', width: 10 },
    { header: 'Metros Cúbicos (m³)', key: 'cubic_meters', width: 18 },
    { header: 'Fecha Creación', key: 'date_created', width: 18 },
    { header: 'Creado Por', key: 'user', width: 30 },
    { header: 'Notas Montaje', key: 'notes', width: 50 },
    { header: 'Fecha Desarmado', key: 'disassembled_at', width: 18 },
    { header: 'Notas Desarmado', key: 'disassembly_notes', width: 50 },
  ];

  // Style header - hacer más visible
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e3a8a' } // Azul corporativo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Add rows
  scaffolds.forEach(scaffold => {
    // Determinar el supervisor de obra:
    // - Si lo creó un admin (creator_role === 'admin'), usar el supervisor asignado al proyecto
    // - Si lo creó un supervisor, usar ese supervisor
    let supervisorObra = '';
    if (scaffold.creator_role === 'admin') {
      supervisorObra = scaffold.supervisor_name || '';
    } else {
      supervisorObra = scaffold.created_by_name || scaffold.user_name || '';
    }
    
    const row = worksheet.addRow({
      scaffold_number: scaffold.scaffold_number || '',
      area: scaffold.area || '',
      tag: scaffold.tag || '',
      company_name: scaffold.company_name || '',
      supervisor_name: supervisorObra,
      assembly_status: scaffold.assembly_status === 'assembled' ? 'Armado' : 
                       scaffold.assembly_status === 'in_progress' ? 'En Proceso' : 'Desarmado',
      card_status: scaffold.card_status === 'green' ? 'Verde' : 'Roja',
      progress: scaffold.progress_percentage,
      height: parseFloat(scaffold.height),
      width: parseFloat(scaffold.width),
      length: parseFloat(scaffold.length || scaffold.depth),
      cubic_meters: parseFloat(scaffold.cubic_meters),
      date_created: new Date(scaffold.assembly_created_at),
      user: scaffold.created_by_name || scaffold.user_name,
      notes: scaffold.assembly_notes || '',
      disassembled_at: scaffold.disassembled_at ? new Date(scaffold.disassembled_at) : '',
      disassembly_notes: scaffold.disassembly_notes || ''
    });

    // Colorear la fila según el estado
    if (scaffold.assembly_status === 'assembled') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F5E9' } // Verde claro
      };
    } else if (scaffold.assembly_status === 'in_progress') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFBEA' } // Amarillo claro
      };
    } else if (scaffold.assembly_status === 'disassembled') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE' } // Rojo claro
      };
    }

    // Formatear celdas de porcentaje
    row.getCell('progress').numFmt = '0"%"';
    
    // Formatear celdas numéricas
    row.getCell('height').numFmt = '0.00';
    row.getCell('width').numFmt = '0.00';
    row.getCell('length').numFmt = '0.00';
    row.getCell('cubic_meters').numFmt = '0.00';

    // Formatear fechas
    row.getCell('date_created').numFmt = 'dd/mm/yyyy hh:mm';
    if (scaffold.disassembled_at) {
      row.getCell('disassembled_at').numFmt = 'dd/mm/yyyy hh:mm';
    }
  });

  // Agregar bordes a todas las celdas
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  // Agregar hoja de resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  
  // Estadísticas
  const totalScaffolds = scaffolds.length;
  const assembledCount = scaffolds.filter(s => s.assembly_status === 'assembled').length;
  const inProgressCount = scaffolds.filter(s => s.assembly_status === 'in_progress').length;
  const disassembledCount = scaffolds.filter(s => s.assembly_status === 'disassembled').length;
  const totalM3 = scaffolds.reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  const assembledM3 = scaffolds.filter(s => s.assembly_status === 'assembled').reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  const greenCards = scaffolds.filter(s => s.card_status === 'green').length;
  const redCards = scaffolds.filter(s => s.card_status === 'red').length;

  // Configurar columnas del resumen
  summarySheet.columns = [
    { width: 30 },
    { width: 20 }
  ];

  // Título del resumen
  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `Resumen del Proyecto: ${project.name}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1e3a8a' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;

  // Información del proyecto
  summarySheet.getCell('A3').value = 'Cliente:';
  summarySheet.getCell('A3').font = { bold: true };
  summarySheet.getCell('B3').value = project.client_name;

  summarySheet.getCell('A4').value = 'Fecha de generación:';
  summarySheet.getCell('A4').font = { bold: true };
  summarySheet.getCell('B4').value = new Date();
  summarySheet.getCell('B4').numFmt = 'dd/mm/yyyy hh:mm';

  // Estadísticas de andamios
  summarySheet.getCell('A6').value = 'Estadísticas de Andamios';
  summarySheet.getCell('A6').font = { bold: true, size: 14, color: { argb: 'FF1e3a8a' } };
  
  summarySheet.getCell('A8').value = 'Total de andamios:';
  summarySheet.getCell('B8').value = totalScaffolds;
  
  summarySheet.getCell('A9').value = 'Armados:';
  summarySheet.getCell('B9').value = assembledCount;
  summarySheet.getCell('B9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  
  summarySheet.getCell('A10').value = 'En Proceso:';
  summarySheet.getCell('B10').value = inProgressCount;
  summarySheet.getCell('B10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEA' } };
  
  summarySheet.getCell('A11').value = 'Desarmados:';
  summarySheet.getCell('B11').value = disassembledCount;
  summarySheet.getCell('B11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE' } };

  // Estadísticas de metros cúbicos
  summarySheet.getCell('A13').value = 'Metros Cúbicos';
  summarySheet.getCell('A13').font = { bold: true, size: 14, color: { argb: 'FF1e3a8a' } };
  
  summarySheet.getCell('A15').value = 'Total m³:';
  summarySheet.getCell('B15').value = totalM3.toFixed(2);
  
  summarySheet.getCell('A16').value = 'm³ Armados:';
  summarySheet.getCell('B16').value = assembledM3.toFixed(2);

  // Estadísticas de tarjetas
  summarySheet.getCell('A18').value = 'Tarjetas de Seguridad';
  summarySheet.getCell('A18').font = { bold: true, size: 14, color: { argb: 'FF1e3a8a' } };
  
  summarySheet.getCell('A20').value = 'Tarjetas Verdes:';
  summarySheet.getCell('B20').value = greenCards;
  summarySheet.getCell('B20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  
  summarySheet.getCell('A21').value = 'Tarjetas Rojas:';
  summarySheet.getCell('B21').value = redCards;
  summarySheet.getCell('B21').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE' } };

  // Return buffer
  return await workbook.xlsx.writeBuffer();
}

module.exports = { generateReportExcel };
