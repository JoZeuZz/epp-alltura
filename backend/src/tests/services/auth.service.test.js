const AuthService = require('../../services/auth.service');
const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const redisClient = require('../../lib/redis');
const { generateTokenPair, revokeToken } = require('../../middleware/auth');

jest.mock('../../models/user');
jest.mock('jsonwebtoken');
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
    const validUserData = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan@example.com',
      password: 'Password123',
      role: 'supervisor',
      rut: '12.345.678-9',
      phone_number: '+56912345678',
    };

    it('debe registrar un nuevo usuario exitosamente', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 1,
        ...validUserData,
      });
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await AuthService.registerUser(validUserData);

      expect(User.findByEmail).toHaveBeenCalledWith('juan@example.com');
      expect(User.create).toHaveBeenCalledWith(validUserData);
      expect(generateTokenPair).toHaveBeenCalled();
      expect(result).toMatchObject({
        message: 'User created successfully',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('debe lanzar error si el email ya existe', async () => {
      User.findByEmail.mockResolvedValue({ id: 1, email: 'juan@example.com' });

      await expect(AuthService.registerUser(validUserData)).rejects.toThrow(
        'User with this email already exists.'
      );
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const loginData = {
      email: 'juan@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 1,
      email: 'juan@example.com',
      role: 'supervisor',
      first_name: 'Juan',
      last_name: 'Pérez',
      profile_picture_url: null,
      must_change_password: false,
      comparePassword: jest.fn(),
    };

    it('debe autenticar usuario con credenciales válidas', async () => {
      redisClient.getFailedLoginCount.mockResolvedValue(0);
      User.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      User.updateLastLogin.mockResolvedValue();

      const result = await AuthService.loginUser(
        loginData.email,
        loginData.password,
        '127.0.0.1',
        'jest'
      );

      expect(redisClient.getFailedLoginCount).toHaveBeenCalledWith('juan@example.com');
      expect(User.findByEmail).toHaveBeenCalledWith('juan@example.com');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Password123');
      expect(redisClient.resetFailedLogin).toHaveBeenCalled();
      expect(User.updateLastLogin).toHaveBeenCalledWith(1, '127.0.0.1', 'jest');
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 1,
          email: 'juan@example.com',
          role: 'supervisor',
        },
      });
    });

    it('debe bloquear si hay demasiados intentos fallidos', async () => {
      redisClient.getFailedLoginCount.mockResolvedValue(5);

      await expect(
        AuthService.loginUser(loginData.email, loginData.password, '127.0.0.1', 'jest')
      ).rejects.toThrow(/Cuenta bloqueada temporalmente/i);
    });

    it('debe rechazar credenciales inválidas', async () => {
      redisClient.getFailedLoginCount.mockResolvedValue(0);
      User.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(
        AuthService.loginUser(loginData.email, loginData.password, '127.0.0.1', 'jest')
      ).rejects.toThrow(/Invalid credentials/);
      expect(redisClient.incrementFailedLogin).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    const refreshToken = 'refresh-token';

    it('debe refrescar tokens con refresh token válido', async () => {
      jwt.verify.mockReturnValue({ type: 'refresh', user: { id: 1 } });
      redisClient.isRefreshTokenValid.mockResolvedValue(true);
      User.findById.mockResolvedValue({ id: 1 });
      generateTokenPair.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await AuthService.refreshAccessToken(refreshToken);

      expect(jwt.verify).toHaveBeenCalled();
      expect(redisClient.isRefreshTokenValid).toHaveBeenCalledWith(1, refreshToken);
      expect(redisClient.revokeRefreshToken).toHaveBeenCalledWith(1, refreshToken);
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('debe lanzar error si falta refresh token', async () => {
      await expect(AuthService.refreshAccessToken()).rejects.toThrow('Refresh token is required');
    });
  });

  describe('logoutUser', () => {
    it('debe revocar tokens del usuario', async () => {
      redisClient.revokeAllUserRefreshTokens.mockResolvedValue();

      await AuthService.logoutUser(1, 'access-token');

      expect(revokeToken).toHaveBeenCalledWith('access-token');
      expect(redisClient.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
    });
  });

  describe('changePassword', () => {
    it('debe cambiar contraseña y revocar tokens', async () => {
      const user = {
        id: 1,
        must_change_password: true,
        comparePassword: jest.fn(),
      };
      user.comparePassword
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      User.findById.mockResolvedValue(user);
      User.updatePassword.mockResolvedValue();
      User.clearPasswordChangeFlag.mockResolvedValue();
      redisClient.revokeAllUserRefreshTokens.mockResolvedValue();
      generateTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await AuthService.changePassword(1, 'old-pass', 'new-pass');

      expect(User.updatePassword).toHaveBeenCalledWith(1, 'new-pass');
      expect(User.clearPasswordChangeFlag).toHaveBeenCalledWith(1);
      expect(redisClient.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        message: 'Password changed successfully',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });
});
