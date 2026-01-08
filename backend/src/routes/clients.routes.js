const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const ClientController = require('../controllers/clients.controller');

/**
 * Rutas de Clients (Clientes)
 * Capa de Rutas - Definición de Endpoints
 * Responsabilidades:
 * - Definir rutas y verbos HTTP
 * - Aplicar middlewares (auth, validación, roles)
 * - Delegar ejecución al controlador
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni manejar req/res directamente
 */

// ============================================
// ESQUEMAS DE VALIDACIÓN JOI
// ============================================

const clientSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre del cliente es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del cliente es obligatorio',
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.max': 'El email no puede exceder 255 caracteres',
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .max(50)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'El formato del teléfono no es válido',
      'string.max': 'El teléfono no puede exceder 50 caracteres',
    }),
  address: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La dirección no puede exceder 500 caracteres',
    }),
  specialty: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La especialidad no puede exceder 255 caracteres',
    }),
});

// ============================================
// MIDDLEWARE DE VALIDACIÓN JOI
// ============================================

/**
 * Middleware para validar el body con un esquema Joi
 */
const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.validateAsync(req.body);
      next();
    } catch (err) {
      if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
      }
      next(err);
    }
  };
};

// ============================================
// MIDDLEWARES GLOBALES (Solo Admin)
// ============================================

// Aplicar autenticación y autorización a todas las rutas de clients
router.use(authMiddleware, isAdmin);

// ============================================
// DEFINICIÓN DE RUTAS
// ============================================

/**
 * @route   GET /api/clients
 * @desc    Obtener todos los clientes (incluyendo inactivos)
 * @access  Private (Admin only)
 */
router.get('/', ClientController.getAllClients);

/**
 * @route   GET /api/clients/:id
 * @desc    Obtener un cliente específico por ID
 * @access  Private (Admin only)
 */
router.get('/:id', ClientController.getClientById);

/**
 * @route   POST /api/clients
 * @desc    Crear un nuevo cliente
 * @access  Private (Admin only)
 */
router.post('/', validateBody(clientSchema), ClientController.createClient);

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualizar un cliente existente
 * @access  Private (Admin only)
 */
router.put('/:id', validateBody(clientSchema), ClientController.updateClient);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Eliminar o desactivar un cliente
 * @access  Private (Admin only)
 */
router.delete('/:id', ClientController.deleteClient);

/**
 * @route   POST /api/clients/:id/reactivate
 * @desc    Reactivar un cliente desactivado
 * @access  Private (Admin only)
 */
router.post('/:id/reactivate', ClientController.reactivateClient);

module.exports = router;
