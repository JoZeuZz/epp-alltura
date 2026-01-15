const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { isAdminOrSupervisor, isAdmin, isSupervisor, checkProjectAccess, checkScaffoldAccess } = require('../middleware/roles');
const { trackScaffoldChanges } = require('../middleware/scaffoldHistory');
const ScaffoldController = require('../controllers/scaffolds.controller');
const ClientNotesController = require('../controllers/clientNotes.controller');
const { 
  id, 
  shortText, 
  dimension, 
  percentage, 
  longText, 
  address,
  assemblyStatus,
  cardStatus 
} = require('../validation');

/**
 * Rutas de Scaffolds (Andamios)
 * Capa de Rutas - Definición de Endpoints
 * Responsabilidades:
 * - Definir rutas y verbos HTTP
 * - Aplicar middlewares (auth, validación, roles)
 * - Delegar ejecución al controlador
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni manejar req/res directamente
 */

// ============================================
// CONFIGURACIÓN DE MULTER
// ============================================

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// ============================================
// ESQUEMAS DE VALIDACIÓN JOI
// ============================================

const createScaffoldSchema = Joi.object({
  project_id: id.required().messages({
    'any.required': 'El proyecto es obligatorio',
  }),
  scaffold_number: shortText.allow('', null),
  area: shortText.allow('', null),
  tag: shortText.allow('', null),
  height: dimension.required().messages({
    'any.required': 'La altura es obligatoria',
  }),
  width: dimension.required().messages({
    'any.required': 'El ancho es obligatorio',
  }),
  length: dimension.required().messages({
    'any.required': 'El largo es obligatorio',
  }),
  progress_percentage: percentage.required().messages({
    'any.required': 'El porcentaje de avance es obligatorio',
  }),
  assembly_notes: longText.allow('', null),
  location: address.allow('', null),
  observations: longText.allow('', null),
});

const updateScaffoldStatusSchema = Joi.object({
  assembly_status: assemblyStatus.optional(),
  card_status: cardStatus.optional(),
  progress_percentage: percentage.optional(),
})
  .or('assembly_status', 'card_status', 'progress_percentage')
  .custom((value, helpers) => {
    if (value.assembly_status === 'disassembled' && value.card_status === 'green') {
      return helpers.error('custom.disassembledGreen');
    }
    return value;
  }, 'Validación de consistencia de estados')
  .messages({
    'custom.disassembledGreen':
      'Un andamio desarmado no puede tener tarjeta verde. Debe tener tarjeta roja.',
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
      req.body = await schema.validateAsync(req.body, { convert: true });
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
// MIDDLEWARES GLOBALES DE LA RUTA
// ============================================

router.use(authMiddleware);
router.use(trackScaffoldChanges);

// ============================================
// DEFINICIÓN DE RUTAS
// ============================================

/**
 * @route   GET /api/scaffolds
 * @desc    Obtener todos los andamios (filtrado por rol)
 * @access  Private (cualquier rol autenticado)
 */
router.get('/', ScaffoldController.getAllScaffolds);

/**
 * @route   GET /api/scaffolds/project/:projectId
 * @desc    Obtener andamios de un proyecto específico
 * @access  Private (validación de acceso al proyecto)
 */
router.get('/project/:projectId', checkProjectAccess, ScaffoldController.getScaffoldsByProject);

/**
 * @route   GET /api/scaffolds/my-scaffolds
 * @desc    Obtener andamios creados por el supervisor actual
 * @access  Private (Supervisor)
 */
router.get('/my-scaffolds', isSupervisor, ScaffoldController.getMyScaffolds);

/**
 * @route   GET /api/scaffolds/my-history
 * @desc    Obtener historial de cambios del usuario actual
 * @access  Private
 */
router.get('/my-history', ScaffoldController.getMyHistory);

/**
 * @route   GET /api/scaffolds/user-history/:userId
 * @desc    Obtener historial de un usuario específico
 * @access  Private (Admin only)
 */
router.get('/user-history/:userId', isAdmin, ScaffoldController.getUserHistory);

/**
 * @route   GET /api/scaffolds/:id
 * @desc    Obtener un andamio específico por ID
 * @access  Private (validación de acceso al andamio)
 */
router.get('/:id', checkScaffoldAccess, ScaffoldController.getScaffoldById);

/**
 * @route   GET /api/scaffolds/:id/history
 * @desc    Obtener historial de cambios de un andamio
 * @access  Private (validación de acceso al andamio)
 */
router.get('/:id/history', checkScaffoldAccess, ScaffoldController.getScaffoldHistory);

/**
 * @route   POST /api/scaffolds
 * @desc    Crear un nuevo andamio
 * @access  Private (Admin o Supervisor)
 */
router.post(
  '/',
  isAdminOrSupervisor,
  upload.single('assembly_image'),
  validateBody(createScaffoldSchema),
  ScaffoldController.createScaffold
);

/**
 * @route   PUT /api/scaffolds/:id
 * @desc    Actualizar un andamio existente
 * @access  Private (validación de acceso + Admin o Supervisor del proyecto)
 */
router.put(
  '/:id',
  checkScaffoldAccess,
  isAdminOrSupervisor,
  // Middleware de validación dinámica
  async (req, res, next) => {
    try {
      // Determinar si es actualización de estado o completa
      const isStatusUpdate =
        (req.body.assembly_status ||
          req.body.card_status ||
          req.body.progress_percentage !== undefined) &&
        !req.body.project_id &&
        !req.body.height;

      const schema = isStatusUpdate ? updateScaffoldStatusSchema : createScaffoldSchema;
      req.body = await schema.validateAsync(req.body);
      next();
    } catch (err) {
      if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
      }
      next(err);
    }
  },
  ScaffoldController.updateScaffold
);

/**
 * @route   PATCH /api/scaffolds/:id/card-status
 * @desc    Cambiar estado de tarjeta (verde/roja)
 * @access  Private (validación de acceso + Admin o Supervisor del proyecto)
 */
router.patch('/:id/card-status', checkScaffoldAccess, isAdminOrSupervisor, ScaffoldController.updateCardStatus);

/**
 * @route   PATCH /api/scaffolds/:id/assembly-status
 * @desc    Cambiar estado de armado (assembled/disassembled)
 * @access  Private (validación de acceso + Admin o Supervisor del proyecto)
 */
router.patch(
  '/:id/assembly-status',
  checkScaffoldAccess,
  isAdminOrSupervisor,
  upload.single('disassembly_image'),
  ScaffoldController.updateAssemblyStatus
);

/**
 * @route   PUT /api/scaffolds/:id/disassemble
 * @desc    Desarmar andamio con foto y notas de prueba
 * @access  Private (validación de acceso + Admin o Supervisor del proyecto)
 */
router.put(
  '/:id/disassemble',
  checkScaffoldAccess,
  isAdminOrSupervisor,
  upload.single('disassembly_image'),
  ScaffoldController.disassembleScaffold
);

/**
 * @route   DELETE /api/scaffolds/:id
 * @desc    Eliminar un andamio permanentemente
 * @access  Private (validación de acceso + Admin only)
 */
router.delete('/:id', checkScaffoldAccess, isAdmin, ScaffoldController.deleteScaffold);

/**
 * @route   GET /api/scaffolds/:scaffoldId/notes
 * @desc    Obtener notas de un andamio
 * @access  Private (validación de acceso al andamio)
 */
router.get('/:scaffoldId/notes', authMiddleware, checkScaffoldAccess, ClientNotesController.getNotesByScaffold);

module.exports = router;
