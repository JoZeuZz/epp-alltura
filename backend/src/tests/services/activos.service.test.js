// backend/src/tests/services/activos.service.test.js
const ActivosService = require('../../services/activos.service');

jest.mock('../../services/entregas.service', () => ({
  create: jest.fn(),
}));

jest.mock('../../services/devoluciones.service', () => ({
  create: jest.fn(),
}));

const EntregasService = require('../../services/entregas.service');
const DevolucionesService = require('../../services/devoluciones.service');

const ACTIVO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TRAB_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ART_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const UBIC_ORIGEN = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const UBIC_DESTINO = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const UBIC_RECEPCION = '11111111-1111-1111-1111-111111111111';

describe('ActivosService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('entregar', () => {
    const basePayload = {
      trabajador_id: TRAB_ID,
      ubicacion_origen_id: UBIC_ORIGEN,
      ubicacion_destino_id: UBIC_DESTINO,
      detalles: [
        {
          articulo_id: ART_ID,
          activo_ids: [ACTIVO_ID],
          condicion_salida: 'ok',
          notas: null,
        },
      ],
    };

    it('throws ASSET_NOT_IN_DETAILS when activoId not in any detalle', async () => {
      const payload = {
        ...basePayload,
        detalles: [{ articulo_id: ART_ID, activo_ids: ['otro-uuid'], condicion_salida: 'ok', notas: null }],
      };

      await expect(ActivosService.entregar(ACTIVO_ID, payload, USER_ID))
        .rejects.toMatchObject({ code: 'ASSET_NOT_IN_DETAILS', statusCode: 400 });

      expect(EntregasService.create).not.toHaveBeenCalled();
    });

    it('delegates to EntregasService.create when activoId is in detalles', async () => {
      const mockResult = { id: 'entrega-uuid', estado: 'borrador' };
      EntregasService.create.mockResolvedValue(mockResult);

      const result = await ActivosService.entregar(ACTIVO_ID, basePayload, USER_ID);

      expect(EntregasService.create).toHaveBeenCalledWith(basePayload, USER_ID);
      expect(result).toEqual(mockResult);
    });

    it('finds activoId in any detalle (not just first)', async () => {
      EntregasService.create.mockResolvedValue({ id: 'e2', estado: 'borrador' });

      const payload = {
        ...basePayload,
        detalles: [
          { articulo_id: ART_ID, activo_ids: ['otro-uuid-1'], condicion_salida: 'ok', notas: null },
          { articulo_id: ART_ID, activo_ids: [ACTIVO_ID], condicion_salida: 'ok', notas: null },
        ],
      };

      await expect(ActivosService.entregar(ACTIVO_ID, payload, USER_ID)).resolves.toBeDefined();
    });

    it('propagates errors from EntregasService.create', async () => {
      EntregasService.create.mockRejectedValue(
        Object.assign(new Error('WORKER_NOT_FOUND'), { statusCode: 400, code: 'WORKER_NOT_FOUND' })
      );

      await expect(ActivosService.entregar(ACTIVO_ID, basePayload, USER_ID))
        .rejects.toMatchObject({ code: 'WORKER_NOT_FOUND' });
    });
  });

  describe('devolver', () => {
    const basePayload = {
      trabajador_id: TRAB_ID,
      ubicacion_recepcion_id: UBIC_RECEPCION,
      notas: null,
      detalles: [
        {
          articulo_id: ART_ID,
          activo_ids: [ACTIVO_ID],
          condicion_entrada: 'ok',
          disposicion: 'devuelto',
          notas: null,
        },
      ],
    };

    it('throws ASSET_NOT_IN_DETAILS when activoId not in any detalle', async () => {
      const payload = {
        ...basePayload,
        detalles: [{ articulo_id: ART_ID, activo_ids: ['otro-uuid'], condicion_entrada: 'ok', disposicion: 'devuelto', notas: null }],
      };

      await expect(ActivosService.devolver(ACTIVO_ID, payload, USER_ID))
        .rejects.toMatchObject({ code: 'ASSET_NOT_IN_DETAILS', statusCode: 400 });

      expect(DevolucionesService.create).not.toHaveBeenCalled();
    });

    it('delegates to DevolucionesService.create when activoId is in detalles', async () => {
      const mockResult = { id: 'devol-uuid', estado: 'borrador' };
      DevolucionesService.create.mockResolvedValue(mockResult);

      const result = await ActivosService.devolver(ACTIVO_ID, basePayload, USER_ID);

      expect(DevolucionesService.create).toHaveBeenCalledWith(basePayload, USER_ID);
      expect(result).toEqual(mockResult);
    });

    it('propagates errors from DevolucionesService.create', async () => {
      DevolucionesService.create.mockRejectedValue(
        Object.assign(new Error('ACTIVE_CUSTODY_NOT_FOUND'), { statusCode: 409, code: 'ACTIVE_CUSTODY_NOT_FOUND' })
      );

      await expect(ActivosService.devolver(ACTIVO_ID, basePayload, USER_ID))
        .rejects.toMatchObject({ code: 'ACTIVE_CUSTODY_NOT_FOUND' });
    });
  });
});
