'use strict';

jest.mock('../../models/proyecto');
jest.mock('../../lib/auditoriaDb', () => ({ writeAuditEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));
jest.mock('../../db', () => ({ query: jest.fn() }));

const ProyectoModel = require('../../models/proyecto');
const db = require('../../db');
const ProyectosService = require('../../services/proyectos.service');

describe('ProyectosService.remove — guardia desactivación', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza 409 si el proyecto tiene artículos asignados', async () => {
    ProyectoModel.findById.mockResolvedValue({ id: 'proj-1', nombre: 'Test', estado: 'activo' });
    db.query.mockResolvedValue({ rows: [{ count: 3 }] });

    await expect(ProyectosService.remove('proj-1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('desactiva correctamente si no hay artículos asignados', async () => {
    ProyectoModel.findById.mockResolvedValue({ id: 'proj-2', nombre: 'Test', estado: 'activo' });
    ProyectoModel.update.mockResolvedValue({ id: 'proj-2', estado: 'inactivo' });
    db.query.mockResolvedValue({ rows: [{ count: 0 }] });

    const result = await ProyectosService.remove('proj-2');
    expect(result.estado).toBe('inactivo');
  });
});
