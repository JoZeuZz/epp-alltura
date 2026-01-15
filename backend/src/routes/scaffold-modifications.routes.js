const express = require('express');
const router = express.Router();
const ScaffoldModificationController = require('../controllers/scaffoldModification.controller');
const { isAdmin, isAdminOrSupervisor } = require('../middleware/roles');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createModificationSchema,
  rejectModificationSchema
} = require('../validation/scaffoldModification.schema');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * @route   POST /api/scaffolds/:id/modifications
 * @desc    Crear nueva modificación de andamio
 * @access  Admin, Supervisor (creador o asignado al proyecto)
 */
router.post(
  '/scaffolds/:id/modifications',
  isAdminOrSupervisor,
  validate(createModificationSchema),
  ScaffoldModificationController.create
);

/**
 * @route   GET /api/scaffolds/:id/modifications
 * @desc    Obtener modificaciones de un andamio
 * @access  Autenticado (todos los roles)
 * @query   ?status=pending|approved|rejected
 */
router.get(
  '/scaffolds/:id/modifications',
  ScaffoldModificationController.getByScaffold
);

/**
 * @route   GET /api/scaffold-modifications/pending
 * @desc    Obtener todas las modificaciones pendientes
 * @access  Admin (ve todas), Supervisor (ve solo las suyas)
 */
router.get(
  '/scaffold-modifications/pending',
  isAdminOrSupervisor,
  ScaffoldModificationController.getAllPending
);

/**
 * @route   PATCH /api/scaffold-modifications/:id/approve
 * @desc    Aprobar modificación pendiente
 * @access  Admin only
 */
router.patch(
  '/scaffold-modifications/:id/approve',
  isAdmin,
  ScaffoldModificationController.approve
);

/**
 * @route   PATCH /api/scaffold-modifications/:id/reject
 * @desc    Rechazar modificación pendiente
 * @access  Admin only
 */
router.patch(
  '/scaffold-modifications/:id/reject',
  isAdmin,
  validate(rejectModificationSchema),
  ScaffoldModificationController.reject
);

/**
 * @route   DELETE /api/scaffold-modifications/:id
 * @desc    Eliminar modificación pendiente
 * @access  Admin (cualquiera), Supervisor (solo las propias)
 */
router.delete(
  '/scaffold-modifications/:id',
  isAdminOrSupervisor,
  ScaffoldModificationController.delete
);

module.exports = router;
