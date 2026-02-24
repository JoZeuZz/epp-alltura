const InventarioService = require('../../services/inventario.service');
const db = require('../../db');

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

describe('InventarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('getStock', () => {
    it('maintains legacy behavior without pagination params', async () => {
      await InventarioService.getStock({ search: 'casco' });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [query, values] = db.query.mock.calls[0];

      expect(query).not.toContain('LIMIT');
      expect(query).not.toContain('OFFSET');
      expect(values).toEqual(['%casco%']);
    });

    it('adds bounded limit and offset when both are provided', async () => {
      await InventarioService.getStock({ limit: '9999', offset: '-10' });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [query, values] = db.query.mock.calls[0];

      expect(query).toContain('LIMIT $1');
      expect(query).toContain('OFFSET $2');
      expect(values).toEqual([500, 0]);
    });

    it('supports offset without limit using LIMIT ALL', async () => {
      await InventarioService.getStock({ offset: '25' });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [query, values] = db.query.mock.calls[0];

      expect(query).toContain('LIMIT ALL');
      expect(query).toContain('OFFSET $1');
      expect(values).toEqual([25]);
    });
  });
});
