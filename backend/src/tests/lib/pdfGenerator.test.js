const { generateScaffoldsPDF } = require('../../lib/pdfGenerator');
const fs = require('fs');
const PDFDocument = require('pdfkit');

jest.mock('fs');
jest.mock('pdfkit');

describe('PDF Generator', () => {
  let mockPdfDoc;
  let res;

  beforeEach(() => {
    mockPdfDoc = {
      pipe: jest.fn(),
      image: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      bufferedPageRange: jest.fn(() => ({ start: 0, count: 1 })),
      switchToPage: jest.fn().mockReturnThis(),
      end: jest.fn(),
      page: { height: 792, width: 612 },
      y: 100,
    };

    res = {
      setHeader: jest.fn(),
    };

    PDFDocument.mockImplementation(() => mockPdfDoc);
    fs.existsSync.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it('debe configurar headers y generar PDF', async () => {
    const project = { name: 'Proyecto Test', client_name: 'Cliente Test S.A.' };
    const scaffolds = [];

    await generateScaffoldsPDF(project, scaffolds, res);

    expect(PDFDocument).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('Informe-Andamios-Proyecto-Test-')
    );
    expect(mockPdfDoc.pipe).toHaveBeenCalledWith(res);
    expect(mockPdfDoc.end).toHaveBeenCalled();
  });

  it('debe escribir información del proyecto', async () => {
    const project = { name: 'Proyecto Test', client_name: 'Cliente Test S.A.' };
    const scaffolds = [];

    await generateScaffoldsPDF(project, scaffolds, res);

    const textCalls = mockPdfDoc.text.mock.calls.map((args) => args[0]);
    expect(textCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Proyecto Test'),
        expect.stringContaining('Cliente Test S.A.'),
      ])
    );
  });
});
