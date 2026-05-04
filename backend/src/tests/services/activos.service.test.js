// backend/src/tests/services/activos.service.test.js
const ActivosService = require('../../services/activos.service');
const db = require('../../db');
const EntregasService = require('../../services/entregas.service');
const DevolucionesService = require('../../services/devoluciones.service');
const { writeAuditEvent } = require('../../lib/auditoriaDb');

jest.mock('../../db', () => ({
  pool: { connect: jest.fn() },
}));

jest.mock('../../lib/auditoriaDb', () => ({
  writeAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/entregas.service', () => ({
  validateWorkerActive: jest.fn().mockResolvedValue(undefined),
  validateMovementRoute: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/devoluciones.service', () => ({
  validateReceivingLocationOperational: jest.fn().mockResolvedValue(undefined),
}));

const makeClient = (queryResponses) => {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() => {
      const response = queryResponses[callIndex++];
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response ?? { rows: [] });
    }),
    release: jest.fn(),
  };
};

describe('ActivosService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('entregar', () => {
    const activoId = 'activo-uuid-1';
    const userId = 'user-uuid-1';
    const payload = {
      trabajador_id: 'trabajador-uuid-1',
      ubicacion_origen_id: 'ubic-origen-uuid',
      ubicacion_destino_id: 'ubic-destino-uuid',
      condicion_salida: 'ok',
      notas: null,
      fecha_devolucion_esperada: null,
      firma_imagen_url: 'https://example.com/firma.png',
    };

    it('rechaza si el activo no existe', async () => {
      const client = makeClient([
        undefined,          // BEGIN
        { rows: [] },       // SELECT activo
        undefined,          // ROLLBACK
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.entregar(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'Activo no encontrado', statusCode: 404 });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('rechaza si el activo no está en_stock', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'asignado', ubicacion_actual_id: 'ubic-origen-uuid', articulo_id: 'art-1' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.entregar(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'El activo no está disponible para entrega', statusCode: 409 });
    });

    it('rechaza si el activo no está en la ubicación de origen', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'otra-ubicacion', articulo_id: 'art-1' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.entregar(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'El activo no está en la ubicación de origen indicada', statusCode: 409 });
    });

    it('rechaza si ya existe una custodia activa', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'ubic-origen-uuid', articulo_id: 'art-1' }] },
        { rows: [{ id: 'custodia-existente' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.entregar(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'El activo ya tiene una custodia activa', statusCode: 409 });
    });

    it('crea entrega, custodia y movimiento en una sola TX y retorna IDs', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'ubic-origen-uuid', articulo_id: 'art-1' }] },
        { rows: [] },
        { rows: [{ id: 'entrega-uuid-1' }] },
        { rows: [] },
        { rows: [] },
        { rows: [] },
        { rows: [{ id: 'custodia-uuid-1' }] },
        { rows: [{ id: 'movimiento-uuid-1' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      const result = await ActivosService.entregar(activoId, payload, userId);

      expect(result).toEqual({
        activo_id: activoId,
        entrega_id: 'entrega-uuid-1',
        custodia_id: 'custodia-uuid-1',
        movimiento_id: 'movimiento-uuid-1',
        estado: 'confirmada',
      });
      expect(writeAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ entidadTipo: 'activo', accion: 'entregar' })
      );
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('devolver', () => {
    const activoId = 'activo-uuid-1';
    const userId = 'user-uuid-1';
    const payload = {
      trabajador_id: 'trabajador-uuid-1',
      ubicacion_recepcion_id: 'ubic-recepcion-uuid',
      condicion_entrada: 'ok',
      disposicion: 'devuelto',
      notas: null,
      firma_imagen_url: 'https://example.com/firma.png',
    };

    it('rechaza si el activo no existe', async () => {
      const client = makeClient([
        undefined,
        { rows: [] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.devolver(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'Activo no encontrado', statusCode: 404 });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('rechaza si el activo no está en estado asignado', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'ubic-a', articulo_id: 'art-1' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.devolver(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'El activo no está en estado asignado', statusCode: 409 });
    });

    it('rechaza si no existe custodia activa para el trabajador', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'asignado', ubicacion_actual_id: 'ubic-a', articulo_id: 'art-1' }] },
        { rows: [] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.devolver(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'No existe custodia activa para este activo y trabajador', statusCode: 409 });
    });

    it('crea devolucion, cierra custodia e inserta movimiento en una sola TX', async () => {
      const client = makeClient([
        undefined,
        { rows: [{ id: activoId, estado: 'asignado', ubicacion_actual_id: 'ubic-a', articulo_id: 'art-1' }] },
        { rows: [{ id: 'custodia-uuid-1', entrega_id: 'entrega-uuid-1' }] },
        { rows: [{ id: 'devolucion-uuid-1' }] },
        { rows: [] },
        { rows: [] },
        { rows: [] },
        { rows: [] },
        { rows: [{ id: 'movimiento-uuid-1' }] },
        undefined,
      ]);
      db.pool.connect.mockResolvedValue(client);

      const result = await ActivosService.devolver(activoId, payload, userId);

      expect(result).toEqual({
        activo_id: activoId,
        devolucion_id: 'devolucion-uuid-1',
        custodia_id: 'custodia-uuid-1',
        movimiento_id: 'movimiento-uuid-1',
        estado: 'confirmada',
      });
      expect(writeAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ entidadTipo: 'activo', accion: 'devolver' })
      );
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
