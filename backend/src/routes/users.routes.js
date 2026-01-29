const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { imageUpload, validateImageMagic } = require('../middleware/upload');
const UserController = require('../controllers/users.controller');
const { 
  email, 
  password, 
  personName, 
  rut, 
  phoneNumber, 
  userRole,
  id 
} = require('../validation');

/**
 * UserRoutes
 * Capa de Rutas - Definición de Endpoints y Middlewares
 * Responsabilidades:
 * - Definir endpoints (URLs y verbos HTTP)
 * - Aplicar middlewares (autenticación, validación, roles)
 * - Validar schemas de entrada
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */

// ============================================
// UPLOAD DE IMÁGENES (configuración centralizada)
// ============================================

// ============================================
// VALIDACIÓN SCHEMAS (JOI)
// ============================================

/**
 * Schema para actualización de datos propios (self-service)
 * No permite cambiar role ni email
 */
const selfUpdateUserSchema = Joi.object({
  first_name: personName,
  last_name: personName,
  password: password.allow(''),
  rut: rut.allow(''),
  phone_number: phoneNumber.allow(''),
}).min(1); // Requiere al menos un campo

/**
 * Schema para creación de usuario (admin)
 */
const createUserSchema = Joi.object({
  first_name: personName.required().messages({
    'any.required': 'El nombre es obligatorio',
  }),
  last_name: personName.required().messages({
    'any.required': 'El apellido es obligatorio',
  }),
  email: email.required().messages({
    'any.required': 'El email es obligatorio',
  }),
  password: password.required().messages({
    'any.required': 'La contraseña es obligatoria',
  }),
  role: userRole.default('supervisor'),
  client_id: id.allow(null, '').empty('').default(null),
  rut: rut.allow('', null),
  phone_number: phoneNumber.allow('', null),
});

/**
 * Schema para actualización de usuario (admin)
 * Todos los campos son opcionales
 */
const updateUserSchema = Joi.object({
  first_name: personName,
  last_name: personName,
  email: email,
  password: password,
  role: userRole,
  client_id: id.allow(null, '').empty(''),
  rut: rut.allow('', null),
  phone_number: phoneNumber.allow('', null),
});

// ============================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================

/**
 * Middleware para validar body con esquema Joi
 */
const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.validateAsync(req.body, { abortEarly: false });
      req.body = validatedData; // Reemplazar con datos validados
      next();
    } catch (error) {
      if (error.isJoi) {
        const { logger } = require('../lib/logger');
        logger.error('Validation error:', {
          errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          receivedData: req.body
        });
        return res.status(400).json({ 
          error: 'Validation failed',
          message: error.details[0].message,
          errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
        });
      }
      next(error);
    }
  };
};

// ============================================
// SELF-SERVICE ROUTES (Usuario autenticado)
// ============================================

/**
 * GET /api/users/me
 * Obtener datos propios del usuario autenticado
 * - Requiere: token válido
 * - Retorna: datos del usuario sin password
 */
router.get('/me', authMiddleware, UserController.getOwnProfile);

/**
 * PUT /api/users/me
 * Actualizar datos propios del usuario autenticado
 * - Requiere: token válido + datos a actualizar
 * - Prohibido: cambiar role o email
 * - Retorna: usuario actualizado + nuevo token
 */
router.put('/me', authMiddleware, validateBody(selfUpdateUserSchema), UserController.updateOwnProfile);

/**
 * POST /api/users/me/picture
 * Subir foto de perfil
 * - Requiere: token válido + archivo imagen
 * - Upload: Google Cloud Storage
 * - Retorna: usuario actualizado + nuevo token
 */
router.post(
  '/me/picture',
  authMiddleware,
  imageUpload.single('profile_picture'),
  validateImageMagic,
  UserController.uploadProfilePicture
);

// ============================================
// ADMIN ROUTES (Solo administradores)
// ============================================

/**
 * GET /api/users
 * Obtener todos los usuarios (solo admin)
 * - Query params: ?role=admin|supervisor|client
 * - Retorna: lista de usuarios
 */
router.get('/', authMiddleware, isAdmin, UserController.getAllUsers);

/**
 * GET /api/users/by-client/:clientId
 * Obtener usuarios cliente por empresa cliente (solo admin)
 * - Requiere: clientId válido
 * - Retorna: lista de usuarios cliente de esa empresa
 */
router.get('/by-client/:clientId', authMiddleware, isAdmin, UserController.getUsersByClientId);

/**
 * GET /api/users/:id
 * Obtener usuario por ID (solo admin)
 * - Requiere: ID válido
 * - Retorna: datos del usuario
 */
router.get('/:id', authMiddleware, isAdmin, UserController.getUserById);

/**
 * POST /api/users
 * Crear nuevo usuario (solo admin)
 * - Requiere: datos completos del usuario
 * - Valida: email único, contraseña segura, RUT formato chileno
 * - Retorna: usuario creado
 */
router.post('/', authMiddleware, isAdmin, validateBody(createUserSchema), UserController.createUser);

/**
 * PUT /api/users/:id
 * Actualizar usuario por ID (solo admin)
 * - Requiere: ID válido + datos a actualizar
 * - Valida: email único (si se cambia)
 * - Retorna: usuario actualizado
 */
router.put('/:id', authMiddleware, isAdmin, validateBody(updateUserSchema), UserController.updateUser);

/**
 * DELETE /api/users/:id
 * Eliminar usuario por ID (solo admin)
 * - Requiere: ID válido
 * - Retorna: usuario eliminado
 */
router.delete('/:id', authMiddleware, isAdmin, UserController.deleteUser);

module.exports = router;
