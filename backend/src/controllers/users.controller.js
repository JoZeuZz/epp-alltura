const UserService = require('../services/users.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

class UserController {
  static async getOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await UserService.getUserById(userId);

      return sendSuccess(res, {
        message: 'Perfil obtenido correctamente',
        data: user,
      });
    } catch (error) {
      logger.error('Error al obtener los datos del usuario:', error);
      next(error);
    }
  }

  static async updateOwnProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      const result = await UserService.updateOwnProfile(userId, updateData);

      return sendSuccess(res, {
        message: 'Perfil actualizado correctamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error al actualizar los datos del usuario:', error);
      next(error);
    }
  }

  static async uploadProfilePicture(req, res, next) {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        const error = new Error('No file uploaded');
        error.statusCode = 400;
        throw error;
      }

      const result = await UserService.uploadProfilePicture(userId, file);

      return sendSuccess(res, {
        message: 'Foto de perfil actualizada correctamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error al subir la foto de perfil:', error);
      next(error);
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const filters = {};

      if (req.query.role) {
        filters.role = req.query.role;
      }

      if (req.query.search) {
        filters.search = req.query.search;
      }

      const users = await UserService.getAllUsers(filters);

      return sendSuccess(res, {
        message: 'Usuarios obtenidos correctamente',
        data: users,
      });
    } catch (error) {
      logger.error('Error al obtener todos los usuarios:', error);
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);

      return sendSuccess(res, {
        message: 'Usuario obtenido correctamente',
        data: user,
      });
    } catch (error) {
      logger.error(`Error al obtener el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }

  static async getUsersByClientId(req, res, next) {
    try {
      const users = await UserService.getUsersByClientId(req.params.clientId);

      return sendSuccess(res, {
        message: 'Usuarios obtenidos correctamente',
        data: users,
      });
    } catch (error) {
      logger.error(`Error al obtener usuarios legacy por cliente ${req.params.clientId}:`, error);
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const userData = req.body;
      const newUser = await UserService.createUser(userData);

      return sendSuccess(res, {
        status: 201,
        message: 'Usuario creado correctamente',
        data: newUser,
      });
    } catch (error) {
      logger.error('Error al crear un nuevo usuario:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
      });
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const updateData = req.body;

      const updatedUser = await UserService.updateUser(userId, updateData);

      return sendSuccess(res, {
        message: 'Usuario actualizado correctamente',
        data: updatedUser,
      });
    } catch (error) {
      logger.error(`Error al actualizar el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.id;
      const deletedUser = await UserService.deleteUser(userId);

      return sendSuccess(res, {
        message: 'Usuario desactivado correctamente',
        data: deletedUser,
      });
    } catch (error) {
      logger.error(`Error al eliminar el usuario con ID ${req.params.id}:`, error);
      next(error);
    }
  }
}

module.exports = UserController;
