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
  name: Joi.string().trim().required().max(255),
  contact_person: Joi.string().trim().allow('').max(255),
  email: Joi.string().email().allow('').max(255),
  phone: Joi.string().trim().allow('').max(50),
  address: Joi.string().trim().allow('').max(1000)
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
