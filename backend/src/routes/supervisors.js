const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Supervisor = require('../models/supervisor');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../lib/asyncHandler');

router.use(authMiddleware);

// Esquema de validación con opciones mejoradas
const supervisorSchema = Joi.object({
  first_name: Joi.string().trim().required().max(255),
  last_name: Joi.string().trim().required().max(255),
  email: Joi.string().email().allow('').max(255),
  phone: Joi.string().trim().allow('').max(50),
  rut: Joi.string().trim().allow('').max(50)
});

/**
 * @route   GET /api/supervisors
 * @desc    Obtener todos los supervisores
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const supervisors = await Supervisor.getAll();
  res.json(supervisors);
}));

/**
 * @route   GET /api/supervisors/search?q=query
 * @desc    Buscar supervisores por nombre
 * @access  Private
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  const supervisors = await Supervisor.search(q);
  res.json(supervisors);
}));

/**
 * @route   GET /api/supervisors/:id
 * @desc    Obtener supervisor por ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const supervisor = await Supervisor.getById(req.params.id);
  if (!supervisor) {
    return res.status(404).json({ message: 'Supervisor no encontrado' });
  }
  res.json(supervisor);
}));

/**
 * @route   POST /api/supervisors
 * @desc    Crear nuevo supervisor
 * @access  Private (Admin)
 */
router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await supervisorSchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const supervisor = await Supervisor.create(validatedData);
  res.status(201).json(supervisor);
}));

/**
 * @route   PUT /api/supervisors/:id
 * @desc    Actualizar supervisor
 * @access  Private (Admin)
 */
router.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await supervisorSchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const supervisor = await Supervisor.update(req.params.id, validatedData);
  if (!supervisor) {
    return res.status(404).json({ message: 'Supervisor no encontrado' });
  }
  res.json(supervisor);
}));

/**
 * @route   DELETE /api/supervisors/:id
 * @desc    Eliminar supervisor
 * @access  Private (Admin)
 */
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const supervisor = await Supervisor.delete(req.params.id);
  if (!supervisor) {
    return res.status(404).json({ message: 'Supervisor no encontrado' });
  }
  res.json({ message: 'Supervisor eliminado exitosamente', supervisor });
}));

module.exports = router;
