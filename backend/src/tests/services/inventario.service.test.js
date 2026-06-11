jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));
jest.mock('../../lib/googleCloud', () => ({
  resolveImageUrl: jest.fn(async (url) => (url ? `/resolved/${url}` : url)),
}));

const db = require('../../db');
const { resolveImageUrl } = require('../../lib/googleCloud');
const InventarioService = require('../../services/inventario.service');

// Helper: cursor encoding matches the service's encodeOffsetCursor
const encodeCursor = (offset) =>
  Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');

beforeEach(() => jest.clearAllMocks());

describe('InventarioService.getActivosPaged', () => {
  test('sin cursor → primera página con hasMore=true y nextCursor cuando hay más filas', async () => {
    // Default limit = 50; query fetches limit+1 = 51. Return 51 rows → hasMore = true.
    const rows51 = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}`, foto_url: null }));
    db.query.mockResolvedValue({ rows: rows51 });

    const result = await InventarioService.getActivosPaged({});

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(50);
    expect(result.nextCursor).toBeTruthy();
    // nextCursor encodes offset=50 (default offset 0 + limit 50)
    expect(result.nextCursor).toBe(encodeCursor(50));
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('con cursor válido → offset decodificado se pasa como último parámetro a db.query', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'x', foto_url: null }] });
    const cursor = encodeCursor(25);

    const result = await InventarioService.getActivosPaged({ cursor });

    const [, params] = db.query.mock.calls[0];
    // params: [...conditions, limit+1, offset] — offset is always last
    const offsetParam = params[params.length - 1];
    expect(offsetParam).toBe(25);
    expect(result.hasMore).toBe(false); // only 1 row < limit
  });

  test('cursor corrupto → lanza error con statusCode 400 sin ejecutar ninguna query', async () => {
    // base64url-decode of this string gives 'this is not json' → JSON.parse fails
    const corruptCursor = Buffer.from('this is not json', 'utf8').toString('base64url');

    await expect(InventarioService.getActivosPaged({ cursor: corruptCursor }))
      .rejects.toMatchObject({ message: 'Cursor inválido', statusCode: 400 });

    expect(db.query).not.toHaveBeenCalled();
  });

  test('resolveImageUrl llamado una vez por item con foto', async () => {
    db.query.mockResolvedValue({
      rows: [
        { id: '1', foto_url: 'foto1.jpg' },
        { id: '2', foto_url: 'foto2.jpg' },
      ],
    });

    const result = await InventarioService.getActivosPaged({});

    expect(resolveImageUrl).toHaveBeenCalledTimes(2);
    expect(resolveImageUrl).toHaveBeenCalledWith('foto1.jpg');
    expect(resolveImageUrl).toHaveBeenCalledWith('foto2.jpg');
    expect(result.items[0].foto_url).toBe('/resolved/foto1.jpg');
    expect(result.items[1].foto_url).toBe('/resolved/foto2.jpg');
  });
});
