const AuthService = require('../services/auth.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

/**
 * AuthController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Extraer datos del request (body, headers, params)
 * - Llamar a la capa de servicio
 * - Formatear y enviar respuestas HTTP
 * - Gestionar errores HTTP
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni consultas SQL
 */
class AuthController {
  /**
   * POST /api/auth/register
   * Registrar un nuevo usuario
   */
  static async register(req, res, next) {
    try {
      const {
        email,
        email_login,
        password,
        first_name,
        last_name,
        nombres,
        apellidos,
        role,
        rut,
        phone_number,
        telefono,
      } = req.body;

      const result = await AuthService.registerUser({
        email,
        email_login,
        password,
        first_name,
        last_name,
        nombres,
        apellidos,
        role,
        rut,
        phone_number,
        telefono,
      });

      return sendSuccess(res, {
        status: 201,
        message: 'Usuario registrado exitosamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error en registro de usuario:', error);
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Iniciar sesión
   */
  static async login(req, res, next) {
    try {
      const { email, email_login, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || 'Unknown';

      const result = await AuthService.loginUser(email || email_login, password, ip, userAgent);

      return sendSuccess(res, {
        message: 'Inicio de sesión exitoso',
        data: result,
      });
    } catch (error) {
      logger.error('Error en login:', error);
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Cerrar sesión
   */
  static async logout(req, res, next) {
    try {
      const userId = req.user.id;
      const accessToken = req.headers.authorization?.split(' ')[1];

      await AuthService.logoutUser(userId, accessToken);

      return sendSuccess(res, {
        message: 'Sesión cerrada exitosamente',
        data: {
          user_id: userId,
        },
      });
    } catch (error) {
      logger.error('Error en logout:', error);
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Refrescar access token
   */
  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      const result = await AuthService.refreshAccessToken(refreshToken);

      return sendSuccess(res, {
        message: 'Token renovado exitosamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error en refresh token:', error);
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Cambiar contraseña
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      return sendSuccess(res, {
        message: 'Contraseña actualizada exitosamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error en cambio de contraseña:', error);
      next(error);
    }
  }
}

module.exports = AuthController;
