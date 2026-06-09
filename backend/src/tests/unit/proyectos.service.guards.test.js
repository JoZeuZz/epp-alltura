'use strict';

jest.mock('../../models/proyecto');
jest.mock('../../lib/auditoriaDb', () => ({ writeAuditEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));
jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../../services/notification.service', () => ({
  createBatchInAppNotifications: jest.fn().mockResolvedValue(undefined),
}));

const ProyectoModel = require('../../models/proyecto');
const db = require('../../db');
const ProyectosService = require('../../services/proyectos.service');
const NotificationService = require('../../services/notification.service');

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

describe('ProyectosService.update — finalización con notificación', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna { data, warnings } con warnings cuando hay artículos pendientes al finalizar', async () => {
    ProyectoModel.findById.mockResolvedValue({ id: 'proj-3', nombre: 'Obra Norte', estado: 'activo' });
    ProyectoModel.update.mockResolvedValue({ id: 'proj-3', nombre: 'Obra Norte', estado: 'finalizado' });

    db.query
      .mockResolvedValueOnce({ rows: [{ count: 5 }] })            // count artículos
      .mockResolvedValueOnce({ rows: [{ id: 'user-1' }, { id: 'user-2' }] }); // admin+supervisor ids

    const result = await ProyectosService.update('proj-3', { estado: 'finalizado' });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ code: 'articulos_pendientes', count: 5 });
    expect(NotificationService.createBatchInAppNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'proyecto_finalizado_con_articulos',
          link: '/ubicacion/proyectos/proj-3',
        }),
      ])
    );
  });

  it('retorna { data, warnings: [] } sin notificaciones cuando no hay artículos pendientes', async () => {
    ProyectoModel.findById.mockResolvedValue({ id: 'proj-4', nombre: 'Obra Sur', estado: 'activo' });
    ProyectoModel.update.mockResolvedValue({ id: 'proj-4', nombre: 'Obra Sur', estado: 'finalizado' });

    db.query.mockResolvedValue({ rows: [{ count: 0 }] });

    const result = await ProyectosService.update('proj-4', { estado: 'finalizado' });

    expect(result.warnings).toHaveLength(0);
    expect(NotificationService.createBatchInAppNotifications).not.toHaveBeenCalled();
  });

  it('no dispara notificaciones si proyecto ya era finalizado (idempotente)', async () => {
    ProyectoModel.findById.mockResolvedValue({ id: 'proj-5', nombre: 'Obra Este', estado: 'finalizado' });
    ProyectoModel.update.mockResolvedValue({ id: 'proj-5', nombre: 'Obra Este', estado: 'finalizado' });

    const result = await ProyectosService.update('proj-5', { estado: 'finalizado' });

    expect(result.warnings).toHaveLength(0);
    expect(NotificationService.createBatchInAppNotifications).not.toHaveBeenCalled();
  });
});
