const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin, checkProjectAccess } = require('../middleware/roles');
const { createRedisRateLimiter, getRateLimitConfig } = require('../middleware/rateLimit');
const ProjectController = require('../controllers/projects.controller');
const ClientNotesController = require('../controllers/clientNotes.controller');
const { id, entityName, projectStatus, idArray } = require('../validation');

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
  client_id: id.required().messages({
    'any.required': 'El cliente es obligatorio',
  }),
  name: entityName.required().messages({
    'any.required': 'El nombre del proyecto es obligatorio',
  }),
  status: projectStatus.default('active'),
  assigned_client_id: id.allow(null),
  assigned_supervisor_id: id.allow(null),
});

const assignUsersSchema = Joi.object({
  userIds: idArray.required(),
});

// ============================================
// RATE LIMITING (Reportes)
// ============================================

const { windowMs: reportWindowMs, max: reportMax } = getRateLimitConfig('REPORT', {
  windowMs: 5 * 60 * 1000,
  max: 10,
});

const reportLimiter = createRedisRateLimiter({
  keyPrefix: 'project-report',
  windowMs: reportWindowMs,
  max: reportMax,
  getKey: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: 'Demasiadas solicitudes de reportes. Intenta nuevamente más tarde.',
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
 * @access  Private (validación de acceso al proyecto)
 */
router.get('/:id', authMiddleware, checkProjectAccess, ProjectController.getProjectById);

/**
 * @route   GET /api/projects/:id/report/pdf
 * @desc    Generar reporte PDF de un proyecto
 * @access  Private (validación de acceso al proyecto)
 */
router.get('/:id/report/pdf', authMiddleware, reportLimiter, checkProjectAccess, ProjectController.generatePDFReport);

/**
 * @route   GET /api/projects/:id/report/excel
 * @desc    Generar reporte Excel de un proyecto
 * @access  Private (validación de acceso al proyecto)
 */
router.get('/:id/report/excel', authMiddleware, reportLimiter, checkProjectAccess, ProjectController.generateExcelReport);

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

/**
 * @route   GET /api/projects/:projectId/notes
 * @desc    Obtener notas de un proyecto
 * @access  Private (Client: sus notas, Supervisor/Admin: todas)
 */
router.get('/:projectId/notes', authMiddleware, ClientNotesController.getNotesByProject);

/**
 * @route   GET /api/projects/:projectId/notes/unresolved
 * @desc    Obtener notas no resueltas de un proyecto
 * @access  Private (Supervisor/Admin)
 */
router.get('/:projectId/notes/unresolved', authMiddleware, ClientNotesController.getUnresolvedNotes);

/**
 * @route   GET /api/projects/:projectId/notes/stats
 * @desc    Obtener estadísticas de notas del proyecto
 * @access  Private (Supervisor/Admin)
 */
router.get('/:projectId/notes/stats', authMiddleware, ClientNotesController.getStats);

module.exports = router;
