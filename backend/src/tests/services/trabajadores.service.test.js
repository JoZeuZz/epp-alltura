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

    await TrabajadoresService.create({
      rut: '12.345.678-5',
      nombres: 'Ana',
      apellidos: 'Rojas',
      cargo: 'Maestra',
      usuario_id: 'usuario-legacy',
    });

    const trabajadorInsertSql = mockClient.query.mock.calls[2][0];
    const trabajadorInsertParams = mockClient.query.mock.calls[2][1];

    expect(trabajadorInsertSql).not.toContain('usuario_id');
    expect(trabajadorInsertParams).not.toContain('usuario-legacy');
    expect(getByIdSpy).toHaveBeenCalledWith('trabajador-1');
  });
});
