// backend/src/tests/services/activos.service.test.js
const ActivosService = require('../../services/activos.service');
const db = require('../../db');
const { writeAuditEvent } = require('../../lib/auditoriaDb');

jest.mock('../../db', () => ({
  pool: { connect: jest.fn() },
}));

jest.mock('../../lib/auditoriaDb', () => ({
  writeAuditEvent: jest.fn().mockResolvedValue(undefined),
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

    const trabajadorRow = { rows: [{ id: 'trabajador-uuid-1', estado: 'activo', persona_estado: 'activo' }] };
    const ubicacionesRows = { rows: [
      { id: 'ubic-origen-uuid', tipo: 'bodega', estado: 'activo' },
      { id: 'ubic-destino-uuid', tipo: 'planta', estado: 'activo' },
    ]};

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
        undefined,                                                                                                // BEGIN
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'ubic-origen-uuid', articulo_id: 'art-1' }] }, // SELECT activo
        trabajadorRow,                                                                                           // _validateWorkerActive
        ubicacionesRows,                                                                                         // _validateMovementRoute
        { rows: [{ id: 'custodia-existente' }] },                                                               // SELECT custodia (found)
        undefined,                                                                                               // ROLLBACK
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.entregar(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'El activo ya tiene una custodia activa', statusCode: 409 });
    });

    it('crea entrega, custodia y movimiento en una sola TX y retorna IDs', async () => {
      const client = makeClient([
        undefined,                                                                                                // BEGIN
        { rows: [{ id: activoId, estado: 'en_stock', ubicacion_actual_id: 'ubic-origen-uuid', articulo_id: 'art-1' }] }, // SELECT activo
        trabajadorRow,                                                                                           // _validateWorkerActive
        ubicacionesRows,                                                                                         // _validateMovementRoute
        { rows: [] },                                                                                            // SELECT custodia (not found)
        { rows: [{ id: 'entrega-uuid-1' }] },                                                                   // INSERT entrega
        { rows: [] },                                                                                            // INSERT entrega_detalle
        { rows: [] },                                                                                            // INSERT firma_entrega
        { rows: [] },                                                                                            // UPDATE activo
        { rows: [{ id: 'custodia-uuid-1' }] },                                                                  // INSERT custodia_activo
        { rows: [{ id: 'movimiento-uuid-1' }] },                                                                // INSERT movimiento_activo
        undefined,                                                                                               // COMMIT
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

    const ubicacionRecepcionRow = { rows: [{ id: 'ubic-recepcion-uuid', estado: 'activo', fecha_inicio_operacion: null, fecha_cierre_operacion: null }] };

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
        undefined,                                                                                                 // BEGIN
        { rows: [{ id: activoId, estado: 'asignado', ubicacion_actual_id: 'ubic-a', articulo_id: 'art-1' }] },   // SELECT activo
        ubicacionRecepcionRow,                                                                                     // _validateReceivingLocation
        { rows: [] },                                                                                              // SELECT custodia_activo — not found
        undefined,                                                                                                 // ROLLBACK
      ]);
      db.pool.connect.mockResolvedValue(client);

      await expect(ActivosService.devolver(activoId, payload, userId))
        .rejects.toMatchObject({ message: 'No existe custodia activa para este activo y trabajador', statusCode: 409 });
    });

    it('crea devolucion, cierra custodia e inserta movimiento en una sola TX', async () => {
      const client = makeClient([
        undefined,                                                                                                 // BEGIN
        { rows: [{ id: activoId, estado: 'asignado', ubicacion_actual_id: 'ubic-a', articulo_id: 'art-1' }] },   // SELECT activo
        ubicacionRecepcionRow,                                                                                     // _validateReceivingLocation
        { rows: [{ id: 'custodia-uuid-1', entrega_id: 'entrega-uuid-1' }] },                                     // SELECT custodia
        { rows: [{ id: 'devolucion-uuid-1' }] },                                                                  // INSERT devolucion
        { rows: [] },                                                                                              // INSERT devolucion_detalle
        { rows: [] },                                                                                              // INSERT firma_devolucion
        { rows: [] },                                                                                              // UPDATE custodia_activo
        { rows: [] },                                                                                              // UPDATE activo
        { rows: [{ id: 'movimiento-uuid-1' }] },                                                                  // INSERT movimiento_activo
        undefined,                                                                                                 // COMMIT
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
