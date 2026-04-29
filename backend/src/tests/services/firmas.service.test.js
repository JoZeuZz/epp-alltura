const FirmasService = require('../../services/firmas.service');
const db = require('../../db');

jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

describe('FirmasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSignatureInDevice', () => {
    it('enforces ownership validation for non-privileged users', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'entrega-1',
                trabajador_id: 'trabajador-entrega',
                estado: 'borrador',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'trabajador-distinto',
              },
            ],
          })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      db.pool.connect.mockResolvedValue(mockClient);

      await expect(
        FirmasService.createSignatureInDevice(
          'entrega-1',
          {
            firma_imagen_url: 'https://example.com/signature.png',
            texto_aceptacion: 'Acepto la custodia de los activos.',
          },
          {
            ip: '127.0.0.1',
            userAgent: 'jest',
          },
          {
            id: 'user-1',
            role: 'none',
            roles: [],
          }
        )
      ).rejects.toThrow('No tienes permisos para firmar esta entrega');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getTokenInfo', () => {
    it('returns token status as expirado when expiration has passed', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            id: 'token-1',
            entrega_id: 'entrega-1',
            trabajador_id: 'trabajador-1',
            expira_en: new Date(Date.now() - 60_000).toISOString(),
            usado_en: null,
            entrega_estado: 'pendiente_firma',
            nombres: 'Ana',
            apellidos: 'Rojas',
            rut: '12.345.678-9',
            firma_id: null,
            firmado_en: null,
          },
        ],
      });

      const tokenInfo = await FirmasService.getTokenInfo('token-raw-value');

      expect(tokenInfo.estado_token).toBe('expirado');
      expect(tokenInfo.entrega_id).toBe('entrega-1');
    });
  });
});
