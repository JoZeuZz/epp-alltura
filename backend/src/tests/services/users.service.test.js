const bcrypt = require('bcrypt');
const UserService = require('../../services/users.service');
const PersonaModel = require('../../models/persona');
const UsuarioModel = require('../../models/usuario');
const RolModel = require('../../models/rol');
const db = require('../../db');

jest.mock('bcrypt');
jest.mock('../../models/persona');
jest.mock('../../models/usuario');
jest.mock('../../models/rol');
jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
}));
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UserService.createUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('genera un RUT temporal <= 20 caracteres cuando el RUT viene vacío', async () => {
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'usuario-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(mockClient);
    UsuarioModel.findByEmailLogin.mockResolvedValue(null);
    PersonaModel.findByRut.mockResolvedValue(null);
    RolModel.findByNombre.mockResolvedValue({ id: 'rol-supervisor', nombre: 'supervisor' });
    bcrypt.hash.mockResolvedValue('hashed-password');

    const getUserByIdSpy = jest
      .spyOn(UserService, 'getUserById')
      .mockResolvedValue({ id: 'usuario-1', role: 'supervisor' });

    const result = await UserService.createUser({
      first_name: 'Jose',
      last_name: 'Rodriguez',
      email: 'tech@alltura.cl',
      password: 'PasswordSegura123!',
      role: 'supervisor',
      rut: '',
      phone_number: '',
    });

    const personaInsertParams = mockClient.query.mock.calls[1][1];
    const insertedRut = personaInsertParams[0];

    expect(insertedRut).toMatch(/^TMP-/);
    expect(insertedRut.length).toBeLessThanOrEqual(20);
    expect(getUserByIdSpy).toHaveBeenCalledWith('usuario-1');
    expect(result).toMatchObject({ id: 'usuario-1', role: 'supervisor' });
  });

  it('retorna error 400 cuando el RUT excede 20 caracteres', async () => {
    await expect(
      UserService.createUser({
        first_name: 'Jose',
        last_name: 'Rodriguez',
        email: 'tech2@alltura.cl',
        password: 'PasswordSegura123!',
        role: 'supervisor',
        rut: '123456789012345678901',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'RUT_TOO_LONG',
    });
  });
});
