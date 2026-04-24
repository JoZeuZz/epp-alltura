const DevolucionesService = require('../../services/devoluciones.service');
const db = require('../../db');

jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

describe('DevolucionesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeCreateDetails', () => {
    it('rechaza activo_ids cuando cantidad es distinta de 1', () => {
      expect(() =>
        DevolucionesService.normalizeCreateDetails([
          {
            articulo_id: 'articulo-1',
            activo_ids: ['activo-1'],
            cantidad: 2,
            condicion_entrada: 'ok',
            disposicion: 'devuelto',
          },
        ])
      ).toThrow('Los detalles con activo_ids deben usar cantidad 1');
    });

    it('rechaza payload legacy con activo_id singular', () => {
      expect(() =>
        DevolucionesService.normalizeCreateDetails([
          {
            articulo_id: 'articulo-1',
            activo_id: 'activo-legacy',
            cantidad: 1,
            condicion_entrada: 'ok',
            disposicion: 'devuelto',
          },
        ])
      ).toThrow('Payload legacy no soportado: use activo_ids para devoluciones de activos');
    });
  });

  describe('create', () => {
    it('requires at least one detail', async () => {
      await expect(
        DevolucionesService.create(
          {
            trabajador_id: 'trabajador-1',
            ubicacion_recepcion_id: 'ubicacion-1',
            detalles: [],
          },
          'user-1'
        )
      ).rejects.toThrow('Debe incluir al menos un detalle en la devolución');
    });
  });

  describe('signInDevice', () => {
    it('rechaza firma cuando el actor no creó la devolución', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'devolucion-1',
                recibido_por_usuario_id: 'owner-user',
                estado: 'borrador',
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      db.pool.connect.mockResolvedValue(mockClient);

      await expect(
        DevolucionesService.signInDevice(
          'devolucion-1',
          {
            firma_imagen_url: 'https://example.com/signature.png',
            texto_aceptacion: 'Confirmo recepción de equipos y herramientas.',
          },
          {
            ip: '127.0.0.1',
            userAgent: 'jest',
          },
          'other-user'
        )
      ).rejects.toThrow('Solo el usuario que creó la devolución puede firmar la recepción');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('rejects confirmation when actor is not the creator of the return', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'devolucion-1',
                recibido_por_usuario_id: 'owner-user',
                estado: 'pendiente_firma',
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      db.pool.connect.mockResolvedValue(mockClient);

      await expect(DevolucionesService.confirm('devolucion-1', 'other-user')).rejects.toThrow(
        'Solo el usuario que creó la devolución puede confirmar la recepción'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects confirmation when return is not in pendiente_firma state', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'devolucion-1',
                recibido_por_usuario_id: 'user-1',
                estado: 'confirmada',
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      db.pool.connect.mockResolvedValue(mockClient);

      await expect(DevolucionesService.confirm('devolucion-1', 'user-1')).rejects.toThrow(
        'No se puede confirmar una devolución en estado "confirmada"'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
