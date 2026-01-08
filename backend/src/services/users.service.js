const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { uploadFile } = require('../lib/googleCloud');
const { logger } = require('../lib/logger');

/**
 * UserService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Gestión de usuarios (CRUD)
 * - Upload de imágenes de perfil
 * - Generación de tokens JWT
 * - Validaciones de negocio
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class UserService {
  // ============================================
  // OPERACIONES SELF-SERVICE (Usuario autenticado)
  // ============================================

  /**
   * Obtener datos de un usuario por ID
   * @param {number} userId - ID del usuario
   * @returns {Promise<object>} Datos del usuario sin password
   */
  static async getUserById(userId) {
    const user = await User.findById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Omitir password_hash de la respuesta
    // eslint-disable-next-line no-unused-vars
    const { password_hash: _password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Actualizar datos propios del usuario
   * @param {number} userId - ID del usuario
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<object>} Usuario actualizado + nuevo token
   */
  static async updateOwnProfile(userId, updateData) {
    // Usuarios no pueden cambiar su propio role o email por esta vía
    const sanitizedData = { ...updateData };
    delete sanitizedData.role;
    delete sanitizedData.email;

    const updatedUser = await User.update(userId, sanitizedData);

    // Generar nuevo token con información actualizada
    const token = this.generateUserToken(updatedUser);

    // eslint-disable-next-line no-unused-vars
    const { password_hash: _password_hash, ...userWithoutPassword } = updatedUser;
    
    logger.info(`Usuario ${userId} actualizó su perfil`);

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Subir foto de perfil
   * @param {number} userId - ID del usuario
   * @param {object} file - Archivo de imagen (buffer, mimetype, originalname)
   * @returns {Promise<object>} Usuario actualizado + nuevo token
   */
  static async uploadProfilePicture(userId, file) {
    if (!file) {
      const error = new Error('No file provided');
      error.statusCode = 400;
      throw error;
    }

    // Subir imagen a Google Cloud Storage
    const imageUrl = await uploadFile(file);

    // Actualizar usuario con nueva URL de imagen
    const updatedUser = await User.update(userId, { profile_picture_url: imageUrl });

    // Generar nuevo token con URL actualizada
    const token = this.generateUserToken(updatedUser);

    // eslint-disable-next-line no-unused-vars
    const { password_hash: _password_hash, ...userWithoutPassword } = updatedUser;

    logger.info(`Usuario ${userId} actualizó su foto de perfil: ${imageUrl}`);

    return {
      user: userWithoutPassword,
      token,
    };
  }

  // ============================================
  // OPERACIONES ADMIN (Gestión de usuarios)
  // ============================================

  /**
   * Obtener todos los usuarios con filtros opcionales
   * @param {object} filters - Filtros a aplicar (ej: { role: 'admin' })
   * @returns {Promise<Array>} Lista de usuarios
   */
  static async getAllUsers(filters = {}) {
    const users = await User.getAll(filters);
    logger.info(`Se obtuvieron ${users.length} usuarios con filtros:`, filters);
    return users;
  }

  /**
   * Crear un nuevo usuario (solo admin)
   * @param {object} userData - Datos del nuevo usuario
   * @returns {Promise<object>} Usuario creado
   */
  static async createUser(userData) {
    // Verificar si el email ya existe
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Establecer rol por defecto si no se proporciona
    const userDataWithDefaults = {
      ...userData,
      role: userData.role || 'supervisor',
    };

    const newUser = await User.create(userDataWithDefaults);

    logger.info(`Nuevo usuario creado: ${newUser.email} (ID: ${newUser.id})`);

    return newUser;
  }

  /**
   * Actualizar usuario por ID (solo admin)
   * @param {number} userId - ID del usuario a actualizar
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<object>} Usuario actualizado
   */
  static async updateUser(userId, updateData) {
    // Verificar que el usuario existe
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Si se intenta cambiar el email, verificar que no esté en uso
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailInUse = await User.findByEmail(updateData.email);
      if (emailInUse) {
        const error = new Error('Email already in use by another user');
        error.statusCode = 400;
        throw error;
      }
    }

    const updatedUser = await User.update(userId, updateData);

    logger.info(`Usuario ${userId} actualizado por admin`);

    return updatedUser;
  }

  /**
   * Eliminar usuario por ID (solo admin)
   * @param {number} userId - ID del usuario a eliminar
   * @returns {Promise<object>} Usuario eliminado
   */
  static async deleteUser(userId) {
    // Verificar que el usuario existe
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const deletedUser = await User.delete(userId);

    logger.info(`Usuario ${userId} eliminado por admin`);

    return deletedUser;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Generar token JWT para un usuario
   * @param {object} user - Datos del usuario
   * @returns {string} Token JWT
   */
  static generateUserToken(user) {
    const payload = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
      },
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
  }

  /**
   * Validar que un email no esté en uso
   * @param {string} email - Email a verificar
   * @param {number} excludeUserId - ID de usuario a excluir de la búsqueda (para updates)
   * @returns {Promise<boolean>} true si está disponible
   */
  static async isEmailAvailable(email, excludeUserId = null) {
    const user = await User.findByEmail(email);
    
    if (!user) {
      return true; // Email disponible
    }

    // Si encontramos un usuario pero es el mismo que estamos excluyendo
    if (excludeUserId && user.id === excludeUserId) {
      return true;
    }

    return false; // Email en uso
  }
}

module.exports = UserService;
