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
  name: Joi.string().trim().required().max(255),
  company_id: Joi.number().integer().positive().allow(null),
  email: Joi.string().email().allow('').max(255),
  phone: Joi.string().trim().allow('').max(50),
  department: Joi.string().trim().allow('').max(255)
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
