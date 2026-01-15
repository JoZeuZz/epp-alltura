const ExcelJS = require('exceljs');
const { generateReportExcel } = require('../../lib/excelGenerator');

describe('Excel Generator', () => {
  it('debe generar un buffer con hojas y datos básicos', async () => {
    const project = { name: 'Proyecto Test', client_name: 'Cliente Test' };
    const scaffolds = [
      {
        scaffold_number: 'A-001',
        area: 'Zona Norte',
        tag: 'TAG-001',
        company_name: 'Empresa X',
        supervisor_name: 'Supervisor X',
        creator_role: 'supervisor',
        created_by_name: 'Supervisor X',
        assembly_status: 'assembled',
        card_status: 'green',
        progress_percentage: 100,
        height: 10,
        width: 5,
        length: 8,
        cubic_meters: 400,
        assembly_created_at: new Date('2026-01-01'),
      },
    ];

    const buffer = await generateReportExcel(project, scaffolds);

    expect(Buffer.isBuffer(buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const reportSheet = workbook.getWorksheet(`Reporte ${project.name}`);
    const summarySheet = workbook.getWorksheet('Resumen');

    expect(reportSheet).toBeTruthy();
    expect(summarySheet).toBeTruthy();

    expect(reportSheet.getCell('A2').value).toBe('A-001');
    expect(reportSheet.getCell('F2').value).toBe('Armado');
    expect(reportSheet.getCell('G2').value).toBe('Verde');
  });
});
