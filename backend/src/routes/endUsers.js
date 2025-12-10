const express = require('express');
const router = express.Router();
const Joi = require('joi');
const EndUser = require('../models/endUser');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../lib/asyncHandler');

router.use(authMiddleware);

// Esquema de validación con opciones mejoradas
const endUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre del usuario final es obligatorio',
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del usuario final es obligatorio'
    }),
  company_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID de la empresa debe ser un número',
      'number.integer': 'El ID de la empresa debe ser un número entero',
      'number.positive': 'El ID de la empresa debe ser un número positivo'
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(255)
    .allow('', null)
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.max': 'El email no puede exceder 255 caracteres'
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .max(50)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del teléfono no es válido',
      'string.max': 'El teléfono no puede exceder 50 caracteres'
    }),
  department: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El departamento no puede exceder 255 caracteres'
    })
});

/**
 * @route   GET /api/end-users
 * @desc    Obtener todos los usuarios finales
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const endUsers = await EndUser.getAll();
  res.json(endUsers);
}));

/**
 * @route   GET /api/end-users/search?q=query
 * @desc    Buscar usuarios finales por nombre
 * @access  Private
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  const endUsers = await EndUser.search(q);
  res.json(endUsers);
}));

/**
 * @route   GET /api/end-users/by-company/:companyId
 * @desc    Obtener usuarios finales por empresa
 * @access  Private
 */
router.get('/by-company/:companyId', asyncHandler(async (req, res) => {
  const endUsers = await EndUser.getByCompany(req.params.companyId);
  res.json(endUsers);
}));

/**
 * @route   GET /api/end-users/:id
 * @desc    Obtener usuario final por ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const endUser = await EndUser.getById(req.params.id);
  if (!endUser) {
    return res.status(404).json({ message: 'Usuario final no encontrado' });
  }
  res.json(endUser);
}));

/**
 * @route   POST /api/end-users
 * @desc    Crear nuevo usuario final
 * @access  Private (Admin)
 */
router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await endUserSchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const endUser = await EndUser.create(validatedData);
  res.status(201).json(endUser);
}));

/**
 * @route   PUT /api/end-users/:id
 * @desc    Actualizar usuario final
 * @access  Private (Admin)
 */
router.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await endUserSchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const endUser = await EndUser.update(req.params.id, validatedData);
  if (!endUser) {
    return res.status(404).json({ message: 'Usuario final no encontrado' });
  }
  res.json(endUser);
}));

/**
 * @route   DELETE /api/end-users/:id
 * @desc    Eliminar usuario final
 * @access  Private (Admin)
 */
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const endUser = await EndUser.delete(req.params.id);
  if (!endUser) {
    return res.status(404).json({ message: 'Usuario final no encontrado' });
  }
  res.json({ message: 'Usuario final eliminado exitosamente', endUser });
}));

module.exports = router;
