const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AuthService = require('../../services/auth.service');
const PersonaModel = require('../../models/persona');
const UsuarioModel = require('../../models/usuario');
const RolModel = require('../../models/rol');
const db = require('../../db');
const redisClient = require('../../lib/redis');
const { generateTokenPair, revokeToken } = require('../../middleware/auth');

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../models/persona');
jest.mock('../../models/usuario');
jest.mock('../../models/rol');
jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
}));
jest.mock('../../lib/redis', () => ({
  getFailedLoginCount: jest.fn(),
  incrementFailedLogin: jest.fn(),
  resetFailedLogin: jest.fn(),
  isRefreshTokenValid: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
}));
jest.mock('../../middleware/auth', () => ({
  generateTokenPair: jest.fn(),
  revokeToken: jest.fn(),
}));
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('registers a user on new schema tables and returns tokens', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ id: 'persona-1' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'usuario-1' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };

      RolModel.findByNombre.mockResolvedValue({ id: 'rol-admin', nombre: 'admin' });
      UsuarioModel.findByEmailLogin.mockResolvedValue(null);
      PersonaModel.findByRut.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-password');
      db.pool.connect.mockResolvedValue(mockClient);
      UsuarioModel.findByIdWithRoles.mockResolvedValue({
        id: 'usuario-1',
        email_login: 'admin@alltura.cl',
        nombres: 'Ana',
        apellidos: 'Rojas',
        estado: 'activo',
        roles: ['admin'],
      });
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await AuthService.registerUser({
        email: 'admin@alltura.cl',
        password: 'PasswordSeguro123!',
        first_name: 'Ana',
        last_name: 'Rojas',
        role: 'admin',
        rut: '12.345.678-9',
      });

      expect(RolModel.findByNombre).toHaveBeenCalledWith('admin');
      expect(UsuarioModel.findByEmailLogin).toHaveBeenCalledWith('admin@alltura.cl');
      expect(db.pool.connect).toHaveBeenCalled();
      expect(generateTokenPair).toHaveBeenCalled();
      expect(result).toMatchObject({
        message: 'User created successfully',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'usuario-1',
          email: 'admin@alltura.cl',
          role: 'admin',
        },
      });
    });
  });

  describe('loginUser', () => {
    it('rejects blocked users', async () => {
      redisClient.getFailedLoginCount.mockResolvedValue(0);
      UsuarioModel.findByEmailLoginWithRoles.mockResolvedValue({
        id: 'u-1',
        email_login: 'u@alltura.cl',
        estado: 'bloqueado',
        roles: ['bodega'],
        comparePassword: jest.fn(),
      });

      await expect(
        AuthService.loginUser('u@alltura.cl', 'Password123!', '127.0.0.1', 'jest')
      ).rejects.toThrow('Account is blocked');
    });

    it('increments failed attempts on invalid password', async () => {
      const user = {
        id: 'u-1',
        email_login: 'u@alltura.cl',
        estado: 'activo',
        roles: ['supervisor'],
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      redisClient.getFailedLoginCount.mockResolvedValue(0);
      UsuarioModel.findByEmailLoginWithRoles.mockResolvedValue(user);

      await expect(
        AuthService.loginUser('u@alltura.cl', 'wrong-pass', '127.0.0.1', 'jest')
      ).rejects.toThrow('Invalid credentials.');

      expect(redisClient.incrementFailedLogin).toHaveBeenCalledWith('u@alltura.cl');
      expect(redisClient.incrementFailedLogin).toHaveBeenCalledWith('127.0.0.1');
    });

    it('returns tokens and silently drops unrecognized roles on login', async () => {
      const user = {
        id: 'u-1',
        email_login: 'u@alltura.cl',
        nombres: 'Juan',
        apellidos: 'Perez',
        estado: 'activo',
        roles: ['supervisor', 'unknown_legacy'],
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      redisClient.getFailedLoginCount.mockResolvedValue(0);
      UsuarioModel.findByEmailLoginWithRoles.mockResolvedValue(user);
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      UsuarioModel.updateLastLogin.mockResolvedValue();

      const result = await AuthService.loginUser(
        'u@alltura.cl',
        'Password123!',
        '127.0.0.1',
        'jest'
      );

      expect(UsuarioModel.updateLastLogin).toHaveBeenCalledWith('u-1');
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
          user: {
            id: 'u-1',
            email: 'u@alltura.cl',
            role: 'supervisor',
            roles: ['supervisor'],
            roles_db: ['supervisor'],
          },
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('rotates refresh token and returns a new pair', async () => {
      jwt.verify.mockReturnValue({ type: 'refresh', user: { id: 'u-1' } });
      redisClient.isRefreshTokenValid.mockResolvedValue(true);
      UsuarioModel.findByIdWithRoles.mockResolvedValue({
        id: 'u-1',
        email_login: 'u@alltura.cl',
        nombres: 'User',
        apellidos: 'One',
        estado: 'activo',
        roles: ['admin'],
      });
      generateTokenPair.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await AuthService.refreshAccessToken('refresh-token');

      expect(redisClient.revokeRefreshToken).toHaveBeenCalledWith('u-1', 'refresh-token');
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });
  });

  describe('logoutUser', () => {
    it('revokes access and refresh tokens', async () => {
      redisClient.revokeAllUserRefreshTokens.mockResolvedValue();

      await AuthService.logoutUser('u-1', 'access-token');

      expect(revokeToken).toHaveBeenCalledWith('access-token');
      expect(redisClient.revokeAllUserRefreshTokens).toHaveBeenCalledWith('u-1');
    });
  });

  describe('changePassword', () => {
    it('updates password hash and returns new tokens', async () => {
      const currentUser = {
        id: 'u-1',
        estado: 'activo',
        comparePassword: jest.fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
      };

      UsuarioModel.findById.mockResolvedValue(currentUser);
      bcrypt.hash.mockResolvedValue('new-hash');
      UsuarioModel.updatePasswordHash.mockResolvedValue({ id: 'u-1' });
      redisClient.revokeAllUserRefreshTokens.mockResolvedValue();
      UsuarioModel.findByIdWithRoles.mockResolvedValue({
        id: 'u-1',
        email_login: 'u@alltura.cl',
        nombres: 'User',
        apellidos: 'One',
        estado: 'activo',
        roles: ['supervisor'],
      });
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await AuthService.changePassword(
        'u-1',
        'OldPassword123!',
        'NewPassword456!'
      );

      expect(UsuarioModel.updatePasswordHash).toHaveBeenCalledWith('u-1', 'new-hash');
      expect(redisClient.revokeAllUserRefreshTokens).toHaveBeenCalledWith('u-1');
      expect(result).toMatchObject({
        message: 'Password changed successfully',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });
});
