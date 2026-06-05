'use strict';

jest.mock('../../models/plantilla');
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn().mockResolvedValue('https://gcs/foto.jpg'),
  uploadDocument: jest.fn().mockResolvedValue('https://gcs/manual.pdf'),
  deleteFileByUrl: jest.fn().mockResolvedValue(undefined),
  resolveImageUrl: jest.fn((u) => Promise.resolve(u)),
}));
jest.mock('../../db', () => ({
  pool: { connect: jest.fn() },
  query: jest.fn(),
}));
jest.mock('../../lib/auditoriaDb', () => ({ writeAuditEvent: jest.fn() }));

const PlantillaModel = require('../../models/plantilla');
const db = require('../../db');
const { PlantillasService } = require('../../services/plantillas.service');

const mockClient = () => {
  const client = { query: jest.fn(), release: jest.fn() };
  db.pool.connect.mockResolvedValue(client);
  client.query.mockResolvedValue({ rows: [] });
  return client;
};

describe('PlantillasService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('inserts plantilla and returns it with instance_count 0', async () => {
      const client = mockClient();
      PlantillaModel.insert = jest.fn().mockResolvedValue('plantilla-uuid');
      PlantillaModel.upsertEspecialidades = jest.fn().mockResolvedValue();
      PlantillaModel.findByIdWithClient = jest.fn().mockResolvedValue({
        id: 'plantilla-uuid', nombre: 'Casco V-Gard', tipo: 'epp',
        especialidades: [], certificaciones: [],
      });
      PlantillaModel.countInstances = jest.fn().mockResolvedValue(0);

      const result = await PlantillasService.create(
        { tipo: 'epp', nombre: 'Casco V-Gard', especialidades: [] },
        'user-id'
      );

      expect(PlantillaModel.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tipo: 'epp', nombre: 'Casco V-Gard' })
      );
      expect(result.instance_count).toBe(0);
    });
  });

  describe('update', () => {
    it('returns plantilla with instance_count', async () => {
      const client = mockClient();
      PlantillaModel.findByIdWithClient = jest.fn()
        .mockResolvedValueOnce({ id: 'p1', nombre: 'Casco', tipo: 'epp', foto_url: null, manual_url: null })
        .mockResolvedValueOnce({ id: 'p1', nombre: 'Casco V2', tipo: 'epp', especialidades: [], certificaciones: [] });
      PlantillaModel.updateFields = jest.fn().mockResolvedValue();
      PlantillaModel.upsertEspecialidades = jest.fn().mockResolvedValue();
      PlantillaModel.countInstances = jest.fn().mockResolvedValue(47);

      const result = await PlantillasService.update('p1', { nombre: 'Casco V2' }, 'user-id');

      expect(result.instance_count).toBe(47);
    });
  });

  describe('getById', () => {
    it('throws 404 when plantilla not found', async () => {
      PlantillaModel.findById = jest.fn().mockResolvedValue(null);
      await expect(PlantillasService.getById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
