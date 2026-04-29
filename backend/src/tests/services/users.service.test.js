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

describe('UserService.deleteUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza auto eliminación del admin', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-admin',
          persona_id: 'persona-admin',
          trabajador_id: null,
          creado_por_admin_id: null,
          roles: ['admin'],
        },
      ],
    });

    await expect(
      UserService.deleteUser('user-admin', {
        id: 'user-admin',
        role_db: 'admin',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'USER_SELF_DELETE_FORBIDDEN',
    });
  });

  it('desactiva usuario cuando tiene asignaciones activas', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-supervisor',
          persona_id: 'persona-supervisor',
          creado_por_admin_id: null,
          roles: ['supervisor'],
        },
      ],
    });

    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ entregas: 1, devoluciones: 0, compras: 0 }] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(mockClient);

    const result = await UserService.deleteUser('user-supervisor', {
      id: 'admin-1',
      role_db: 'admin',
    });

    expect(result).toMatchObject({
      id: 'user-supervisor',
      action: 'deactivated',
      reason: 'has_assignments',
      estado: 'inactivo',
    });
    expect(mockClient.query.mock.calls.some(([sql]) => String(sql).includes('trabajador'))).toBe(false);
  });

  it('elimina físicamente cuando no tiene asignaciones', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-supervisor',
          persona_id: 'persona-supervisor',
          trabajador_id: null,
          creado_por_admin_id: null,
          roles: ['supervisor'],
        },
      ],
    });

    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ entregas: 0, devoluciones: 0, compras: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ has_user_ref: false, has_worker_ref: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(mockClient);

    const result = await UserService.deleteUser('user-supervisor', {
      id: 'admin-1',
      role_db: 'admin',
    });

    expect(result).toMatchObject({
      id: 'user-supervisor',
      action: 'deleted',
      reason: 'no_assignments',
      estado: 'eliminado',
      persona_deleted: true,
    });
    expect(mockClient.query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM trabajador'))).toBe(false);
  });
});
