const ScaffoldService = require('../../services/scaffolds.service');
const Scaffold = require('../../models/scaffold');
const ScaffoldHistory = require('../../models/scaffoldHistory');
const Project = require('../../models/project');
const { uploadFile } = require('../../lib/googleCloud');

jest.mock('../../models/scaffold');
jest.mock('../../models/scaffoldHistory');
jest.mock('../../models/project');
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
}));
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ScaffoldService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCubicMeters', () => {
    it('debe calcular metros cúbicos correctamente', () => {
      expect(ScaffoldService.calculateCubicMeters(10, 5, 8)).toBe(400);
    });
  });

  describe('determineAssemblyState', () => {
    it('debe mapear 0 a disassembled con tarjeta roja', () => {
      expect(ScaffoldService.determineAssemblyState(0)).toEqual({
        assembly_status: 'disassembled',
        card_status: 'red',
      });
    });

    it('debe mapear 1-99 a in_progress con tarjeta roja', () => {
      expect(ScaffoldService.determineAssemblyState(50)).toEqual({
        assembly_status: 'in_progress',
        card_status: 'red',
      });
    });

    it('debe mapear 100 a assembled con tarjeta roja', () => {
      expect(ScaffoldService.determineAssemblyState(100)).toEqual({
        assembly_status: 'assembled',
        card_status: 'red',
      });
    });
  });

  describe('createScaffold', () => {
    const user = { id: 1, role: 'supervisor' };
    const scaffoldData = {
      project_id: 1,
      scaffold_number: 'A-001',
      area: 'Zona Norte',
      tag: 'TAG-001',
      height: 10,
      width: 5,
      length: 8,
      progress_percentage: 0,
    };

    it('debe requerir imagen de montaje', async () => {
      await expect(ScaffoldService.createScaffold(scaffoldData, user)).rejects.toThrow(
        'La imagen de montaje es obligatoria.'
      );
    });

    it('debe lanzar error si el proyecto está inactivo', async () => {
      Project.getById.mockResolvedValue({ id: 1, active: false, client_active: true });

      await expect(
        ScaffoldService.createScaffold(scaffoldData, user, Buffer.from('img'))
      ).rejects.toThrow(/proyecto o cliente desactivado/i);
    });

    it('debe crear un andamio exitosamente', async () => {
      Project.getById.mockResolvedValue({ id: 1, name: 'Proyecto Test', active: true, client_active: true });
      uploadFile.mockResolvedValue('https://gcs/img.png');
      Scaffold.create.mockResolvedValue({ id: 10, ...scaffoldData });
      ScaffoldHistory.create.mockResolvedValue({});

      const result = await ScaffoldService.createScaffold(scaffoldData, user, Buffer.from('img'));

      expect(uploadFile).toHaveBeenCalled();
      expect(Scaffold.create).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 1,
          user_id: 1,
          assembly_image_url: 'https://gcs/img.png',
          card_status: 'red',
          assembly_status: 'disassembled',
        })
      );
      expect(ScaffoldHistory.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 10 });
    });
  });

  describe('updateAssemblyStatus', () => {
    const user = { id: 1, role: 'supervisor' };

    it('debe lanzar error si el andamio no existe', async () => {
      Scaffold.getById.mockResolvedValue(null);

      await expect(
        ScaffoldService.updateAssemblyStatus(1, 'assembled', user)
      ).rejects.toThrow('Andamio no encontrado.');
    });

    it('debe requerir imagen al desarmar', async () => {
      Scaffold.getById.mockResolvedValue({ id: 1, project_id: 1, assembly_status: 'assembled' });
      Project.getById.mockResolvedValue({ id: 1, assigned_supervisor_id: 1 });

      await expect(
        ScaffoldService.updateAssemblyStatus(1, 'disassembled', user)
      ).rejects.toThrow('Se requiere imagen de desarmado.');
    });

    it('debe actualizar estado de armado', async () => {
      Scaffold.getById.mockResolvedValue({
        id: 1,
        project_id: 1,
        assembly_status: 'assembled',
        card_status: 'green',
        scaffold_number: 'A-001',
      });
      Project.getById.mockResolvedValue({ id: 1, assigned_supervisor_id: 1 });
      uploadFile.mockResolvedValue('https://gcs/disassembly.png');
      Scaffold.updateAssemblyStatus.mockResolvedValue({
        id: 1,
        assembly_status: 'disassembled',
        card_status: 'red',
      });
      ScaffoldHistory.create.mockResolvedValue({});

      const result = await ScaffoldService.updateAssemblyStatus(
        1,
        'disassembled',
        user,
        Buffer.from('img')
      );

      expect(Scaffold.updateAssemblyStatus).toHaveBeenCalledWith(
        1,
        'disassembled',
        'https://gcs/disassembly.png'
      );
      expect(ScaffoldHistory.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 1, assembly_status: 'disassembled' });
    });
  });
});
