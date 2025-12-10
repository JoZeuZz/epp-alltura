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
  first_name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El nombre es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras',
      'any.required': 'El nombre es obligatorio'
    }),
  last_name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El apellido es obligatorio',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 255 caracteres',
      'string.pattern.base': 'El apellido solo puede contener letras',
      'any.required': 'El apellido es obligatorio'
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
  rut: Joi.string()
    .trim()
    .pattern(/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/)
    .max(50)
    .allow('', null)
    .messages({
      'string.pattern.base': 'El formato del RUT no es válido (ej: 12.345.678-9)',
      'string.max': 'El RUT no puede exceder 50 caracteres'
    })
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
