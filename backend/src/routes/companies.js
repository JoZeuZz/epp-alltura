const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Company = require('../models/company');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../lib/asyncHandler');

router.use(authMiddleware);

// Esquema de validación con opciones mejoradas
const companySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre de la empresa es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre de la empresa es obligatorio'
    }),
  contact_person: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .allow('', null)
    .messages({
      'string.min': 'El nombre del contacto debe tener al menos 2 caracteres',
      'string.max': 'El nombre del contacto no puede exceder 255 caracteres'
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
  address: Joi.string()
    .trim()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': 'La dirección no puede exceder 1000 caracteres'
    })
});

/**
 * @route   GET /api/companies
 * @desc    Obtener todas las empresas
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const companies = await Company.getAll();
  res.json(companies);
}));

/**
 * @route   GET /api/companies/search?q=query
 * @desc    Buscar empresas por nombre
 * @access  Private
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  const companies = await Company.search(q);
  res.json(companies);
}));

/**
 * @route   GET /api/companies/:id
 * @desc    Obtener empresa por ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const company = await Company.getById(req.params.id);
  if (!company) {
    return res.status(404).json({ message: 'Empresa no encontrada' });
  }
  res.json(company);
}));

/**
 * @route   POST /api/companies
 * @desc    Crear nueva empresa
 * @access  Private (Admin)
 */
router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await companySchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const company = await Company.create(validatedData);
  res.status(201).json(company);
}));

/**
 * @route   PUT /api/companies/:id
 * @desc    Actualizar empresa
 * @access  Private (Admin)
 */
router.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const validatedData = await companySchema.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  const company = await Company.update(req.params.id, validatedData);
  if (!company) {
    return res.status(404).json({ message: 'Empresa no encontrada' });
  }
  res.json(company);
}));

/**
 * @route   DELETE /api/companies/:id
 * @desc    Eliminar empresa
 * @access  Private (Admin)
 */
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const company = await Company.delete(req.params.id);
  if (!company) {
    return res.status(404).json({ message: 'Empresa no encontrada' });
  }
  res.json({ message: 'Empresa eliminada exitosamente', company });
}));

module.exports = router;
