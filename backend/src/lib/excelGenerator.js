const excel = require('exceljs');
const { formatShortName } = require('./nameUtils');

async function generateReportExcel(project, scaffolds, modifications = []) {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet(`Reporte ${project.name}`);

  // Metadatos del archivo
  workbook.creator = 'Alltura - Sistema de Gestión de Andamios';
  workbook.created = new Date();

  // Add columns (orden actualizado según requerimientos)
  worksheet.columns = [
    { header: 'Notas Montaje', key: 'notes', width: 50 },
    { header: 'Nº Andamio', key: 'scaffold_number', width: 15 },
    { header: 'Área', key: 'area', width: 20 },
    { header: 'TAG', key: 'tag', width: 15 },
    { header: 'Empresa Solicitante', key: 'company_name', width: 30 },
    { header: 'Usuario Solicitante', key: 'client_user_name', width: 30 },
    { header: 'Supervisor de Obra', key: 'supervisor_name', width: 30 },
    { header: 'Estado Armado', key: 'assembly_status', width: 15 },
    { header: 'Tarjeta', key: 'card_status', width: 12 },
    { header: '% Avance', key: 'progress', width: 10 },
    { header: 'Alto (m)', key: 'height', width: 10 },
    { header: 'Ancho (m)', key: 'width', width: 10 },
    { header: 'Largo (m)', key: 'length', width: 10 },
    { header: 'm³ Base', key: 'cubic_meters', width: 12 },
    { header: 'm³ Adicionales', key: 'additional_cubic_meters', width: 15 },
    { header: 'Total m³', key: 'total_cubic_meters', width: 12 },
    { header: 'Fecha Creación', key: 'date_created', width: 18 },
    { header: 'Fecha Montaje', key: 'assembly_date', width: 18 },
    { header: 'Creado Por', key: 'user', width: 30 },
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

    const clientUserName = formatShortName(scaffold.client_user_name || '');
    const supervisorName = formatShortName(supervisorObra);
    const createdByName = formatShortName(scaffold.created_by_name || scaffold.user_name || '');
    
    // Validar fecha de montaje: solo si está armado y existe la fecha
    const assemblyDate = (scaffold.assembly_status === 'assembled' && scaffold.assembly_date) 
      ? new Date(scaffold.assembly_date) 
      : '';

    const row = worksheet.addRow({
      notes: scaffold.assembly_notes || '',
      scaffold_number: scaffold.scaffold_number || '',
      area: scaffold.area || '',
      tag: scaffold.tag || '',
      company_name: scaffold.company_name || '',
      client_user_name: clientUserName,
      supervisor_name: supervisorName,
      assembly_status: scaffold.assembly_status === 'assembled' ? 'Armado' : 
                       scaffold.assembly_status === 'in_progress' ? 'En Proceso' : 'Desarmado',
      card_status: scaffold.card_status === 'green' ? 'Verde' : 'Roja',
      progress: scaffold.progress_percentage,
      height: parseFloat(scaffold.height),
      width: parseFloat(scaffold.width),
      length: parseFloat(scaffold.length || scaffold.depth),
      cubic_meters: parseFloat(scaffold.cubic_meters),
      additional_cubic_meters: parseFloat(scaffold.additional_cubic_meters || 0),
      total_cubic_meters: parseFloat(scaffold.total_cubic_meters || scaffold.cubic_meters),
      date_created: new Date(scaffold.assembly_created_at),
      assembly_date: assemblyDate,
      user: createdByName,
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
    row.getCell('additional_cubic_meters').numFmt = '0.00';
    row.getCell('total_cubic_meters').numFmt = '0.00';

    // Formatear fechas
    row.getCell('date_created').numFmt = 'dd/mm/yyyy hh:mm';
    if (scaffold.assembly_date && scaffold.assembly_status === 'assembled') {
      row.getCell('assembly_date').numFmt = 'dd/mm/yyyy hh:mm';
    }
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
  const totalAdditionalM3 = scaffolds.reduce((sum, s) => sum + parseFloat(s.additional_cubic_meters || 0), 0);
  const totalCombinedM3 = scaffolds.reduce((sum, s) => sum + parseFloat(s.total_cubic_meters || s.cubic_meters), 0);
  const assembledM3 = scaffolds.filter(s => s.assembly_status === 'assembled').reduce((sum, s) => sum + parseFloat(s.cubic_meters), 0);
  const assembledAdditionalM3 = scaffolds.filter(s => s.assembly_status === 'assembled').reduce((sum, s) => sum + parseFloat(s.additional_cubic_meters || 0), 0);
  const assembledTotalM3 = scaffolds.filter(s => s.assembly_status === 'assembled').reduce((sum, s) => sum + parseFloat(s.total_cubic_meters || s.cubic_meters), 0);
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
  
  summarySheet.getCell('A15').value = 'Total m³ Base:';
  summarySheet.getCell('B15').value = totalM3.toFixed(2);
  
  summarySheet.getCell('A16').value = 'Total m³ Adicionales:';
  summarySheet.getCell('B16').value = totalAdditionalM3.toFixed(2);
  summarySheet.getCell('B16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
  
  summarySheet.getCell('A17').value = 'Total m³ Combinado:';
  summarySheet.getCell('A17').font = { bold: true };
  summarySheet.getCell('B17').value = totalCombinedM3.toFixed(2);
  summarySheet.getCell('B17').font = { bold: true };
  summarySheet.getCell('B17').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  
  summarySheet.getCell('A19').value = 'm³ Base Armados:';
  summarySheet.getCell('B19').value = assembledM3.toFixed(2);
  
  summarySheet.getCell('A20').value = 'm³ Adicionales Armados:';
  summarySheet.getCell('B20').value = assembledAdditionalM3.toFixed(2);
  
  summarySheet.getCell('A21').value = 'Total m³ Armados:';
  summarySheet.getCell('A21').font = { bold: true };
  summarySheet.getCell('B21').value = assembledTotalM3.toFixed(2);
  summarySheet.getCell('B21').font = { bold: true };

  // Estadísticas de tarjetas
  summarySheet.getCell('A23').value = 'Tarjetas de Seguridad';
  summarySheet.getCell('A23').font = { bold: true, size: 14, color: { argb: 'FF1e3a8a' } };
  
  summarySheet.getCell('A25').value = 'Tarjetas Verdes:';
  summarySheet.getCell('B25').value = greenCards;
  summarySheet.getCell('B25').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  
  summarySheet.getCell('A26').value = 'Tarjetas Rojas:';
  summarySheet.getCell('B26').value = redCards;
  summarySheet.getCell('B26').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE' } };

  // Estadísticas de modificaciones (si existen)
  if (modifications && modifications.length > 0) {
    summarySheet.getCell('A28').value = 'Modificaciones de m³';
    summarySheet.getCell('A28').font = { bold: true, size: 14, color: { argb: 'FF059669' } };
    
    summarySheet.getCell('A30').value = 'Total Modificaciones Aprobadas:';
    summarySheet.getCell('B30').value = modifications.length;
    summarySheet.getCell('B30').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    
    const totalModificationM3 = modifications.reduce((sum, mod) => sum + parseFloat(mod.cubic_meters), 0);
    summarySheet.getCell('A31').value = 'Total m³ de Modificaciones:';
    summarySheet.getCell('B31').value = totalModificationM3.toFixed(2);
    summarySheet.getCell('B31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
  }

  // Agregar hoja de modificaciones aprobadas si existen
  if (modifications && modifications.length > 0) {
    const modSheet = workbook.addWorksheet('Modificaciones Aprobadas');
    
    // Configurar columnas
    modSheet.columns = [
      { header: 'Nº Andamio', key: 'scaffold_number', width: 15 },
      { header: 'Área', key: 'area', width: 20 },
      { header: 'TAG', key: 'tag', width: 15 },
      { header: 'Alto (m)', key: 'height', width: 10 },
      { header: 'Ancho (m)', key: 'width', width: 10 },
      { header: 'Largo (m)', key: 'length', width: 10 },
      { header: 'Metros Cúbicos (m³)', key: 'cubic_meters', width: 18 },
      { header: 'Motivo', key: 'reason', width: 40 },
      { header: 'Creado Por', key: 'created_by', width: 30 },
      { header: 'Fecha Creación', key: 'created_at', width: 18 },
      { header: 'Aprobado Por', key: 'approved_by', width: 30 },
      { header: 'Fecha Aprobación', key: 'approved_at', width: 18 },
    ];

    // Estilo del encabezado
    const modHeaderRow = modSheet.getRow(1);
    modHeaderRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    modHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' } // Verde para modificaciones
    };
    modHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    modHeaderRow.height = 25;

    // Agregar filas de modificaciones
    modifications.forEach(mod => {
      const row = modSheet.addRow({
        scaffold_number: mod.scaffold_number || '',
        area: mod.area || '',
        tag: mod.tag || '',
        height: parseFloat(mod.height),
        width: parseFloat(mod.width),
        length: parseFloat(mod.length),
        cubic_meters: parseFloat(mod.cubic_meters),
        reason: mod.reason || '',
        created_by: mod.created_by_name || '',
        created_at: new Date(mod.created_at),
        approved_by: mod.approved_by_name || '',
        approved_at: new Date(mod.approved_at)
      });

      // Formatear celdas numéricas
      row.getCell('height').numFmt = '0.00';
      row.getCell('width').numFmt = '0.00';
      row.getCell('length').numFmt = '0.00';
      row.getCell('cubic_meters').numFmt = '0.00';

      // Formatear fechas
      row.getCell('created_at').numFmt = 'dd/mm/yyyy hh:mm';
      row.getCell('approved_at').numFmt = 'dd/mm/yyyy hh:mm';

      // Color de fondo verde claro
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };
    });

    // Agregar bordes a todas las celdas
    modSheet.eachRow((row, _rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });

    // Agregar fila de totales
    const totalRow = modSheet.addRow({
      scaffold_number: '',
      area: '',
      tag: '',
      height: '',
      width: '',
      length: 'TOTAL:',
      cubic_meters: modifications.reduce((sum, mod) => sum + parseFloat(mod.cubic_meters), 0),
      reason: '',
      created_by: '',
      created_at: '',
      approved_by: '',
      approved_at: ''
    });

    totalRow.font = { bold: true };
    totalRow.getCell('cubic_meters').numFmt = '0.00';
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFBBF24' } // Amarillo para totales
    };
  }

  // Return buffer
  return await workbook.xlsx.writeBuffer();
}

module.exports = { generateReportExcel };
