const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const ClientController = require('../controllers/clients.controller');
const { entityName, email, phoneNumber, address, shortText } = require('../validation');

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
  name: entityName.required().messages({
    'any.required': 'El nombre del cliente es obligatorio',
  }),
  email: email.allow('', null).optional(),
  phone: phoneNumber.allow('', null).optional(),
  address: address.allow('', null).optional(),
  specialty: shortText.allow('', null).optional(),
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
