'use strict';

jest.mock('../../db');
jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const EntregasService = require('../../services/entregas.service');

// Valid UUIDs for route validation (must be different)
const BODEGA_ID = '11111111-1111-1111-1111-111111111111';
const PROYECTO_ID = '22222222-2222-2222-2222-222222222222';

describe('EntregasService._validateRoute — proyecto debe estar activo', () => {
  it('lanza error si proyecto destino está finalizado', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: BODEGA_ID, estado: 'activo' }] })
        .mockResolvedValueOnce({ rows: [{ id: PROYECTO_ID, estado: 'finalizado' }] }),
    };

    await expect(
      EntregasService._validateRoute(mockClient, BODEGA_ID, PROYECTO_ID)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lanza error si proyecto destino está inactivo', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: BODEGA_ID, estado: 'activo' }] })
        .mockResolvedValueOnce({ rows: [{ id: PROYECTO_ID, estado: 'inactivo' }] }),
    };

    await expect(
      EntregasService._validateRoute(mockClient, BODEGA_ID, PROYECTO_ID)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('permite entrega si proyecto está activo', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: BODEGA_ID, estado: 'activo' }] })
        .mockResolvedValueOnce({ rows: [{ id: PROYECTO_ID, estado: 'activo' }] }),
    };

    await expect(
      EntregasService._validateRoute(mockClient, BODEGA_ID, PROYECTO_ID)
    ).resolves.not.toThrow();
  });
});
