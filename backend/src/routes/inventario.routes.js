const express = require('express');
const Joi = require('joi');
const InventarioController = require('../controllers/inventario.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const router = express.Router();

const validateBody = (schema) => {
  return async (req, _res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const validateQuery = (schema) => {
  return async (req, _res, next) => {
    try {
      const validated = await schema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      Object.defineProperty(req, 'query', { value: validated, writable: true, configurable: true });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const exportPdfQuerySchema = Joi.object({
  categoria: Joi.string().valid('epp', 'herramientas', 'equipos').required(),
});

const activosQuerySchema = Joi.object({
  tipo: Joi.string().trim().lowercase().valid('epp', 'herramienta', 'equipo'),
  estado: Joi.string().trim().max(40),
  bodega_id: uuid,
  proyecto_id: uuid,
  search: Joi.string().trim().max(120),
  limit: Joi.number().integer().min(1).max(200),
  cursor: Joi.string().trim().max(300),
  offset: Joi.number().integer().min(0),
});

const movimientosQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500),
  offset: Joi.number().integer().min(0),
});

const reubicarActivoSchema = Joi.object({
  bodega_destino_id: uuid.required(),
  notas: Joi.string().trim().max(500).allow('', null),
});

const dashboardQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200),
});

// ── Read routes ────────────────────────────────────────────────

router.get(
  '/stock',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(dashboardQuerySchema),
  InventarioController.getStock
);

router.get(
  '/movimientos-activo',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(dashboardQuerySchema),
  InventarioController.getMovimientosActivo
);

router.get(
  '/activos',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(activosQuerySchema),
  InventarioController.getActivos
);

router.get(
  '/activos-paged',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(activosQuerySchema),
  InventarioController.getActivosPaged
);

router.get(
  '/activos-disponibles',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getActivosDisponibles
);

router.get(
  '/activos/:id/perfil',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getActivoProfile
);

router.get(
  '/activos/:id/movimientos',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(movimientosQuerySchema),
  InventarioController.getAssetMovements
);

router.get(
  '/activos/:id/pdf',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.exportActivoPdf
);

router.get(
  '/auditoria',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getAuditoria
);

router.get(
  '/export/pdf',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(exportPdfQuerySchema),
  InventarioController.exportInventarioPdf
);

// ── Write routes ───────────────────────────────────────────────

router.patch(
  '/activos/:id/reubicar',
  authMiddleware,
  checkRole(['admin']),
  validateBody(reubicarActivoSchema),
  InventarioController.reubicarActivo
);

module.exports = router;
