const UserService = require('../services/users.service');
const { logger } = require('../lib/logger');

/**
 * UserController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Extraer datos del request (body, params, files)
 * - Llamar a la capa de servicio
 * - Formatear y enviar respuestas HTTP
 * - Gestionar errores HTTP
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni consultas SQL
 */
class UserController {
  // ============================================
  // SELF-SERVICE ENDPOINTS
  // ============================================

  /**
   * GET /api/users/me
   * Obtener datos propios del usuario autenticado
   */
  static async getOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await UserService.getUserById(userId);

      return res.status(200).json(user);
    } catch (error) {
      logger.error('Error al obtener los datos del usuario:', error);
      next(error);
    }
  }

  /**
   * PUT /api/users/me
   * Actualizar datos propios del usuario autenticado
   */
  static async updateOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      const result = await UserService.updateOwnProfile(userId, updateData);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al actualizar los datos del usuario:', error);
      next(error);
    }
  }

  /**
   * POST /api/users/me/picture
   * Subir foto de perfil del usuario autenticado
   */
  static async uploadProfilePicture(req, res, next) {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'No file uploaded.' 
        });
      }

      const result = await UserService.uploadProfilePicture(userId, file);

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al subir la foto de perfil:', error);
      next(error);
    }
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * GET /api/users
   * Obtener todos los usuarios (solo admin)
   */
  static async getAllUsers(req, res, next) {
    try {
      const filters = {};
      
      // Aplicar filtros desde query params
      if (req.query.role) {
        filters.role = req.query.role;
      }

      const users = await UserService.getAllUsers(filters);

      return res.status(200).json(users);
    } catch (error) {
      logger.error('Error al obtener todos los usuarios:', error);
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   * Obtener usuario por ID (solo admin)
   */
  static async getUserById(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          message: 'User ID must be a valid number' 
        });
      }

      const user = await UserService.getUserById(userId);

      return res.status(200).json(user);
    } catch (error) {
      logger.error(`Error al obtener el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * POST /api/users
   * Crear nuevo usuario (solo admin)
   */
  static async createUser(req, res, next) {
    try {
      const userData = req.body;

      const newUser = await UserService.createUser(userData);

      return res.status(201).json(newUser);
    } catch (error) {
      logger.error('Error al crear un nuevo usuario:', error);
      next(error);
    }
  }

  /**
   * PUT /api/users/:id
   * Actualizar usuario por ID (solo admin)
   */
  static async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      const updateData = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          message: 'User ID must be a valid number' 
        });
      }

      const updatedUser = await UserService.updateUser(userId, updateData);

      return res.status(200).json(updatedUser);
    } catch (error) {
      logger.error(`Error al actualizar el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * DELETE /api/users/:id
   * Eliminar usuario por ID (solo admin)
   */
  static async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          message: 'User ID must be a valid number' 
        });
      }

      const deletedUser = await UserService.deleteUser(userId);

      return res.status(200).json(deletedUser);
    } catch (error) {
      logger.error(`Error al eliminar el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }
}

module.exports = UserController;
