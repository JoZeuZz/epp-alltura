const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { isAdminOrSupervisor, isAdmin, isSupervisor } = require('../middleware/roles');
const { trackScaffoldChanges } = require('../middleware/scaffoldHistory');
const ScaffoldController = require('../controllers/scaffolds.controller');

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
  project_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID del proyecto debe ser un número',
      'number.integer': 'El ID del proyecto debe ser un número entero',
      'number.positive': 'El ID del proyecto debe ser un número positivo',
      'any.required': 'El proyecto es obligatorio',
    }),
  scaffold_number: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El número de andamio no puede exceder 255 caracteres',
    }),
  area: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El área no puede exceder 255 caracteres',
    }),
  tag: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El TAG no puede exceder 255 caracteres',
    }),
  height: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'La altura debe ser un número',
      'number.positive': 'La altura debe ser un número positivo',
      'number.max': 'La altura no puede exceder 999.99 metros',
      'any.required': 'La altura es obligatoria',
    }),
  width: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'El ancho debe ser un número',
      'number.positive': 'El ancho debe ser un número positivo',
      'number.max': 'El ancho no puede exceder 999.99 metros',
      'any.required': 'El ancho es obligatorio',
    }),
  length: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'El largo debe ser un número',
      'number.positive': 'El largo debe ser un número positivo',
      'number.max': 'El largo no puede exceder 999.99 metros',
      'any.required': 'El largo es obligatorio',
    }),
  progress_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'El porcentaje de avance debe ser un número',
      'number.integer': 'El porcentaje de avance debe ser un número entero',
      'number.min': 'El porcentaje de avance debe ser al menos 0',
      'number.max': 'El porcentaje de avance no puede exceder 100',
      'any.required': 'El porcentaje de avance es obligatorio',
    }),
  assembly_notes: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Las notas de montaje no pueden exceder 2000 caracteres',
    }),
  location: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'La ubicación no puede exceder 500 caracteres',
    }),
  observations: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Las observaciones no pueden exceder 2000 caracteres',
    }),
});

const updateScaffoldStatusSchema = Joi.object({
  assembly_status: Joi.string()
    .valid('assembled', 'in_progress', 'disassembled')
    .optional()
    .messages({
      'any.only': 'El estado de armado debe ser "assembled", "in_progress" o "disassembled"',
    }),
  card_status: Joi.string()
    .valid('green', 'red')
    .optional()
    .messages({
      'any.only': 'El estado de la tarjeta debe ser "green" o "red"',
    }),
  progress_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'El porcentaje de avance debe ser un número',
      'number.min': 'El porcentaje de avance debe ser al menos 0',
      'number.max': 'El porcentaje de avance no puede ser mayor a 100',
    }),
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
 * @access  Private
 */
router.get('/project/:projectId', ScaffoldController.getScaffoldsByProject);

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
 * @access  Private
 */
router.get('/:id', ScaffoldController.getScaffoldById);

/**
 * @route   GET /api/scaffolds/:id/history
 * @desc    Obtener historial de cambios de un andamio
 * @access  Private
 */
router.get('/:id/history', ScaffoldController.getScaffoldHistory);

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
 * @access  Private (Admin o Supervisor propietario)
 */
router.put(
  '/:id',
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
 * @access  Private (Admin o Supervisor propietario)
 */
router.patch('/:id/card-status', isAdminOrSupervisor, ScaffoldController.updateCardStatus);

/**
 * @route   PATCH /api/scaffolds/:id/assembly-status
 * @desc    Cambiar estado de armado (assembled/disassembled)
 * @access  Private (Admin o Supervisor propietario)
 */
router.patch(
  '/:id/assembly-status',
  isAdminOrSupervisor,
  upload.single('disassembly_image'),
  ScaffoldController.updateAssemblyStatus
);

/**
 * @route   PUT /api/scaffolds/:id/disassemble
 * @desc    Desarmar andamio con foto y notas de prueba
 * @access  Private (Admin o Supervisor propietario)
 */
router.put(
  '/:id/disassemble',
  isAdminOrSupervisor,
  upload.single('disassembly_image'),
  ScaffoldController.disassembleScaffold
);

/**
 * @route   DELETE /api/scaffolds/:id
 * @desc    Eliminar un andamio permanentemente
 * @access  Private (Admin only)
 */
router.delete('/:id', isAdmin, ScaffoldController.deleteScaffold);

module.exports = router;
