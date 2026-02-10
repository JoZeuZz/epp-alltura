const EntregasService = require('../../services/entregas.service');
const db = require('../../db');

jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

describe('EntregasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirm', () => {
    it('rejects confirmation when delivery has no signature', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'entrega-1',
                estado: 'borrador',
                trabajador_id: 'trabajador-1',
                ubicacion_origen_id: 'ubicacion-a',
                ubicacion_destino_id: 'ubicacion-b',
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      db.pool.connect.mockResolvedValue(mockClient);

      await expect(EntregasService.confirm('entrega-1', 'user-1')).rejects.toThrow(
        'No se puede confirmar la entrega sin una firma de recepción registrada'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
