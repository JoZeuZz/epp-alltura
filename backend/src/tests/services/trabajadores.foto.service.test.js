const TrabajadoresService = require('../../services/trabajadores.service');
const db = require('../../db');
const { uploadFile } = require('../../lib/googleCloud');
const PersonaModel = require('../../models/persona');

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

describe('TrabajadoresService.create con foto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sube el archivo a trabajadores/fotos y setea foto_url en el INSERT de persona', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)                          // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] })    // INSERT persona
        .mockResolvedValueOnce({ rows: [{ id: 'trabajador-1' }] }) // INSERT trabajador
        .mockResolvedValueOnce(undefined)                          // audit
        .mockResolvedValueOnce(undefined),                         // COMMIT
      release: jest.fn(),
    };
    db.pool.connect.mockResolvedValue(mockClient);
    PersonaModel.findByRut.mockResolvedValue(null);
    uploadFile.mockResolvedValue({ url: 'uploads/trabajadores/fotos/ana.webp' });
    jest.spyOn(TrabajadoresService, 'getById').mockResolvedValue({ id: 'trabajador-1' });

    const file = { path: '/tmp/ana.jpg', mimetype: 'image/jpeg' };
    await TrabajadoresService.create(
      { rut: '12.345.678-5', nombres: 'Ana', apellidos: 'Rojas' },
      file
    );

    expect(uploadFile).toHaveBeenCalledWith(file, { folder: 'trabajadores/fotos' });
    const personaInsertSql = mockClient.query.mock.calls[1][0];
    const personaInsertParams = mockClient.query.mock.calls[1][1];
    expect(personaInsertSql).toContain('foto_url');
    expect(personaInsertParams).toContain('uploads/trabajadores/fotos/ana.webp');
  });

  it('sin archivo no llama uploadFile', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'trabajador-1' }] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };
    db.pool.connect.mockResolvedValue(mockClient);
    PersonaModel.findByRut.mockResolvedValue(null);
    jest.spyOn(TrabajadoresService, 'getById').mockResolvedValue({ id: 'trabajador-1' });

    await TrabajadoresService.create({ rut: '12.345.678-5', nombres: 'Ana', apellidos: 'Rojas' });

    expect(uploadFile).not.toHaveBeenCalled();
  });
});
