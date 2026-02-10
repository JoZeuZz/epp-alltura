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

  describe('confirm', () => {
    it('rejects confirmation when return is not in borrador state', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'devolucion-1',
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
