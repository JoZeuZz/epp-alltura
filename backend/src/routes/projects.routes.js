const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const ProjectController = require('../controllers/projects.controller');

/**
 * Rutas de Projects (Proyectos)
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

const projectSchema = Joi.object({
  client_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID del cliente debe ser un número',
      'number.integer': 'El ID del cliente debe ser un número entero',
      'number.positive': 'El ID del cliente debe ser un número positivo',
      'any.required': 'El cliente es obligatorio',
    }),
  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre del proyecto es obligatorio',
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del proyecto es obligatorio',
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'completed')
    .default('active')
    .messages({
      'any.only': 'El estado debe ser active, inactive o completed',
    }),
  assigned_client_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del cliente asignado debe ser un número',
      'number.integer': 'El ID del cliente asignado debe ser un número entero',
      'number.positive': 'El ID del cliente asignado debe ser un número positivo',
    }),
  assigned_supervisor_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del supervisor asignado debe ser un número',
      'number.integer': 'El ID del supervisor asignado debe ser un número entero',
      'number.positive': 'El ID del supervisor asignado debe ser un número positivo',
    }),
});

const assignUsersSchema = Joi.object({
  userIds: Joi.array().items(Joi.number().integer().positive()).required(),
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
// RUTAS PÚBLICAS (con autenticación básica)
// ============================================

/**
 * @route   GET /api/projects
 * @desc    Obtener todos los proyectos (filtrado por rol)
 * @access  Private (cualquier rol autenticado)
 */
router.get('/', authMiddleware, ProjectController.getAllProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Obtener un proyecto específico por ID
 * @access  Private
 */
router.get('/:id', authMiddleware, ProjectController.getProjectById);

/**
 * @route   GET /api/projects/:id/report/pdf
 * @desc    Generar reporte PDF de un proyecto
 * @access  Private (Admin y Cliente del proyecto)
 */
router.get('/:id/report/pdf', authMiddleware, ProjectController.generatePDFReport);

/**
 * @route   GET /api/projects/:id/report/excel
 * @desc    Generar reporte Excel de un proyecto
 * @access  Private (Admin y Cliente del proyecto)
 */
router.get('/:id/report/excel', authMiddleware, ProjectController.generateExcelReport);

// ============================================
// RUTAS ADMINISTRATIVAS (solo admin)
// ============================================

// Aplicar middlewares de autenticación y autorización a todas las rutas siguientes
router.use(authMiddleware, isAdmin);

/**
 * @route   GET /api/projects/:id/users
 * @desc    Obtener usuarios asignados a un proyecto (sistema legacy)
 * @access  Private (Admin)
 */
router.get('/:id/users', ProjectController.getAssignedUsers);

/**
 * @route   GET /api/projects/:id/scaffolds/count
 * @desc    Obtener conteo de andamios asociados a un proyecto
 * @access  Private (Admin)
 */
router.get('/:id/scaffolds/count', ProjectController.getScaffoldCount);

/**
 * @route   POST /api/projects
 * @desc    Crear un nuevo proyecto
 * @access  Private (Admin)
 */
router.post('/', validateBody(projectSchema), ProjectController.createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Actualizar un proyecto existente
 * @access  Private (Admin)
 */
router.put('/:id', validateBody(projectSchema), ProjectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Eliminar o desactivar un proyecto
 * @access  Private (Admin)
 */
router.delete('/:id', ProjectController.deleteProject);

/**
 * @route   PATCH /api/projects/:id/reactivate
 * @desc    Reactivar un proyecto desactivado
 * @access  Private (Admin)
 */
router.patch('/:id/reactivate', ProjectController.reactivateProject);

/**
 * @route   POST /api/projects/:id/users
 * @desc    Asignar usuarios a un proyecto (sistema legacy)
 * @access  Private (Admin)
 */
router.post('/:id/users', validateBody(assignUsersSchema), ProjectController.assignUsers);

/**
 * @route   PATCH /api/projects/:id/assign-client
 * @desc    Asignar un cliente (usuario tipo client) a un proyecto
 * @access  Private (Admin)
 */
router.patch('/:id/assign-client', ProjectController.assignClient);

/**
 * @route   PATCH /api/projects/:id/assign-supervisor
 * @desc    Asignar un supervisor a un proyecto
 * @access  Private (Admin)
 */
router.patch('/:id/assign-supervisor', ProjectController.assignSupervisor);

module.exports = router;
