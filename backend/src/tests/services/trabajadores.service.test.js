const TrabajadoresService = require('../../services/trabajadores.service');
const PersonaModel = require('../../models/persona');
const db = require('../../db');

jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

jest.mock('../../models/persona');

describe('TrabajadoresService without login linkage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates trabajadores as domain records without usuario_id linkage', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'trabajador-1' }] })
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(mockClient);
    PersonaModel.findByRut.mockResolvedValue(null);

    const getByIdSpy = jest
      .spyOn(TrabajadoresService, 'getById')
      .mockResolvedValue({ id: 'trabajador-1', persona_id: 'persona-1' });

    await TrabajadoresService.create(
      {
        rut: '12.345.678-5',
        nombres: 'Ana',
        apellidos: 'Rojas',
        cargo: 'Maestra',
        usuario_id: 'usuario-legacy',
      },
      null,
      'usuario-actor-1'
    );

    const trabajadorInsertSql = mockClient.query.mock.calls[2][0];
    const trabajadorInsertParams = mockClient.query.mock.calls[2][1];

    expect(trabajadorInsertSql).not.toContain('usuario_id');
    expect(trabajadorInsertParams).not.toContain('usuario-legacy');
    expect(getByIdSpy).toHaveBeenCalledWith('trabajador-1');

    // Audit debe registrarse contra usuario autenticado (auditoria.usuario_id NOT NULL)
    const auditInsertSql = mockClient.query.mock.calls[3][0];
    const auditInsertParams = mockClient.query.mock.calls[3][1];
    expect(auditInsertSql).toContain('INSERT INTO auditoria');
    expect(auditInsertParams).toContain('usuario-actor-1');
  });

  it('rejects (no silent rollback) when audit insert fails inside the transaction', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] }) // INSERT persona
        .mockResolvedValueOnce({ rows: [{ id: 'trabajador-1' }] }) // INSERT trabajador
        .mockRejectedValueOnce(new Error('null value in column "usuario_id"')) // INSERT auditoria
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(mockClient);
    PersonaModel.findByRut.mockResolvedValue(null);

    await expect(
      TrabajadoresService.create(
        { rut: '12.345.678-5', nombres: 'Ana', apellidos: 'Rojas' },
        null,
        'usuario-actor-1'
      )
    ).rejects.toThrow();

    const calls = mockClient.query.mock.calls.map((c) => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
  });
});

describe('TrabajadoresService.getActas', () => {
  const TRABAJADOR_ID = 'aaaaaa00-0000-4000-8000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries db with trabajador id and returns rows', async () => {
    const mockRows = [
      {
        entrega_id: 'ee000000-0000-4000-8000-000000000001',
        entrega_fecha: '2024-01-15T12:00:00Z',
        articulo_codigo: 'EPP-001',
        articulo_nombre: 'Casco MSA',
        articulo_tipo: 'epp',
        es_activo: true,
        devolucion_id: null,
        devolucion_fecha: null,
      },
    ];
    db.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await TrabajadoresService.getActas(TRABAJADOR_ID);

    expect(result).toEqual(mockRows);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM entrega'),
      [TRABAJADOR_ID]
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('ca.articulo_id = ed.articulo_id'),
      [TRABAJADOR_ID]
    );
  });

  it('returns empty array when trabajador has no signed actas', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const result = await TrabajadoresService.getActas(TRABAJADOR_ID);
    expect(result).toEqual([]);
  });

  it('includes devolucion data when present', async () => {
    const mockRows = [
      {
        entrega_id: 'ee000000-0000-4000-8000-000000000001',
        entrega_fecha: '2024-01-15T12:00:00Z',
        articulo_codigo: 'EPP-001',
        articulo_nombre: 'Casco MSA',
        articulo_tipo: 'epp',
        es_activo: false,
        devolucion_id: 'dd000000-0000-4000-8000-000000000001',
        devolucion_fecha: '2024-02-01T10:00:00Z',
      },
    ];
    db.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await TrabajadoresService.getActas(TRABAJADOR_ID);

    expect(result[0].devolucion_id).toBe('dd000000-0000-4000-8000-000000000001');
    expect(result[0].es_activo).toBe(false);
  });
});
