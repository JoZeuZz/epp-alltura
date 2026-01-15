const ProjectService = require('../../services/projects.service');
const Project = require('../../models/project');

jest.mock('../../models/project');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('../../lib/pdfGenerator', () => ({
  generateScaffoldsPDF: jest.fn(),
}));
jest.mock('../../lib/excelGenerator', () => ({
  generateReportExcel: jest.fn(),
}));

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe crear un proyecto exitosamente', async () => {
    const projectData = { client_id: 1, name: 'Proyecto Test', status: 'active' };
    Project.create.mockResolvedValue({ id: 1, ...projectData });

    const result = await ProjectService.createProject(projectData);

    expect(Project.create).toHaveBeenCalledWith(projectData);
    expect(result).toMatchObject({ id: 1, name: 'Proyecto Test' });
  });

  describe('deleteOrDeactivateProject', () => {
    it('debe desactivar si hay andamios asociados', async () => {
      Project.getScaffoldCount.mockResolvedValue(3);
      Project.deactivate.mockResolvedValue({ id: 1, active: false });

      const result = await ProjectService.deleteOrDeactivateProject(1);

      expect(Project.deactivate).toHaveBeenCalledWith(1);
      expect(result.deactivated).toBe(true);
      expect(result.project).toMatchObject({ id: 1, active: false });
    });

    it('debe eliminar si no hay andamios asociados', async () => {
      Project.getScaffoldCount.mockResolvedValue(0);
      Project.delete.mockResolvedValue({ id: 1 });

      const result = await ProjectService.deleteOrDeactivateProject(1);

      expect(Project.delete).toHaveBeenCalledWith(1);
      expect(result.deleted).toBe(true);
    });

    it('debe lanzar error si no existe al desactivar', async () => {
      Project.getScaffoldCount.mockResolvedValue(2);
      Project.deactivate.mockResolvedValue(null);

      await expect(ProjectService.deleteOrDeactivateProject(1)).rejects.toThrow('Project not found');
    });

    it('debe lanzar error si no existe al eliminar', async () => {
      Project.getScaffoldCount.mockResolvedValue(0);
      Project.delete.mockResolvedValue(null);

      await expect(ProjectService.deleteOrDeactivateProject(1)).rejects.toThrow('Project not found');
    });
  });

  describe('reactivateProject', () => {
    it('debe reactivar proyecto', async () => {
      Project.reactivate.mockResolvedValue({ id: 1, active: true });

      const result = await ProjectService.reactivateProject(1);

      expect(Project.reactivate).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({ id: 1, active: true });
    });

    it('debe lanzar error si no existe', async () => {
      Project.reactivate.mockResolvedValue(null);

      await expect(ProjectService.reactivateProject(1)).rejects.toThrow('Project not found');
    });
  });

  describe('getProjectById', () => {
    it('debe obtener proyecto por id', async () => {
      Project.getById.mockResolvedValue({ id: 1, name: 'Proyecto Test' });

      const result = await ProjectService.getProjectById(1);

      expect(Project.getById).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({ id: 1, name: 'Proyecto Test' });
    });
  });
});
