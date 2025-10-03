const { generateReportExcel } = require('./excelGenerator');

describe('excelGenerator', () => {
  test('should generate a valid Excel buffer', async () => {
    const project = { name: 'Test Project' };
    const scaffolds = [
      {
        id: 1,
        assembly_created_at: new Date(),
        user_name: 'Test User',
        height: '10',
        width: '10',
        depth: '10',
        cubic_meters: '1000',
        progress_percentage: 100,
        assembly_notes: 'Test notes',
      },
    ];

    const buffer = await generateReportExcel(project, scaffolds);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
