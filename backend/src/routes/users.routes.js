const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const UserController = require('../controllers/users.controller');

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
// CONFIGURACIÓN MULTER (Upload de imágenes)
// ============================================

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// ============================================
// VALIDACIÓN SCHEMAS (JOI)
// ============================================

/**
 * Schema para actualización de datos propios (self-service)
 * No permite cambiar role ni email
 */
const selfUpdateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100),
  last_name: Joi.string().trim().min(2).max(100),
  password: Joi.string().min(8).allow(''),
  rut: Joi.string().trim().allow(''),
  phone_number: Joi.string().trim().allow(''),
}).min(1); // Requiere al menos un campo

/**
 * Schema para creación de usuario (admin)
 */
const createUserSchema = Joi.object({
  first_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El nombre es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras',
      'any.required': 'El nombre es obligatorio',
    }),
  last_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El apellido es obligatorio',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 100 caracteres',
      'string.pattern.base': 'El apellido solo puede contener letras',
      'any.required': 'El apellido es obligatorio',
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty': 'El email es obligatorio',
      'string.email': 'Debe proporcionar un email válido',
      'any.required': 'El email es obligatorio',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .messages({
      'string.empty': 'La contraseña es obligatoria',
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 128 caracteres',
      'string.pattern.base':
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      'any.required': 'La contraseña es obligatoria',
    }),
  role: Joi.string()
    .valid('admin', 'supervisor', 'client')
    .default('supervisor')
    .messages({
      'any.only': 'El rol debe ser admin, supervisor o client',
    }),
  rut: Joi.string()
    .trim()
    .pattern(/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del RUT no es válido (ej: 12.345.678-9)',
    }),
  phone_number: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del teléfono no es válido',
    }),
});

/**
 * Schema para actualización de usuario (admin)
 * Todos los campos son opcionales
 */
const updateUserSchema = Joi.object({
  first_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras',
    }),
  last_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 100 caracteres',
      'string.pattern.base': 'El apellido solo puede contener letras',
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .messages({
      'string.email': 'Debe proporcionar un email válido',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 128 caracteres',
      'string.pattern.base':
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    }),
  role: Joi.string()
    .valid('admin', 'supervisor', 'client')
    .messages({
      'any.only': 'El rol debe ser admin, supervisor o client',
    }),
  rut: Joi.string()
    .trim()
    .pattern(/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del RUT no es válido (ej: 12.345.678-9)',
    }),
  phone_number: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del teléfono no es válido',
    }),
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
      const validatedData = await schema.validateAsync(req.body);
      req.body = validatedData; // Reemplazar con datos validados
      next();
    } catch (error) {
      if (error.isJoi) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: error.details[0].message 
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
router.post('/me/picture', authMiddleware, upload.single('profile_picture'), UserController.uploadProfilePicture);

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
