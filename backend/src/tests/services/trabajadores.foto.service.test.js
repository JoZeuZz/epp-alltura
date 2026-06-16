const TrabajadoresService = require('../../services/trabajadores.service');
const db = require('../../db');

jest.mock('../../db', () => ({
  pool: { connect: jest.fn() },
  query: jest.fn(),
}));
jest.mock('../../lib/googleCloud', () => ({ uploadFile: jest.fn() }));
jest.mock('../../models/persona');

describe('TrabajadoresService.getById incluye foto_url', () => {
  beforeEach(() => jest.clearAllMocks());

  it('selecciona p.foto_url y lo devuelve', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 't1', persona_id: 'p1', nombres: 'Ana', foto_url: 'uploads/x.webp' }],
    });

    const result = await TrabajadoresService.getById('t1');

    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('p.foto_url');
    expect(result.foto_url).toBe('uploads/x.webp');
  });
});
