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
      req.query = await schema.validateAsync(req.query, {
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

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const exportPdfQuerySchema = Joi.object({
  categoria: Joi.string().valid('epp', 'herramientas', 'equipos').required(),
});

const activosQuerySchema = Joi.object({
  articulo_id: uuid,
  ubicacion_id: uuid,
  estado: Joi.string().trim().max(40),
  search: Joi.string().trim().max(120),
  limit: Joi.number().integer().min(1).max(200),
  cursor: Joi.string().trim().max(300),
  solo_entregados: Joi.boolean(),
  tipo_activo: Joi.string().trim().lowercase().valid('herramientas', 'herramienta', 'epp', 'equipos', 'equipo', 'all'),
});

router.get(
  '/stock',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getStock
);

router.get(
  '/stock-summary',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getStockSummary
);

router.get(
  '/stock-paged',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getStockPaged
);

router.get(
  '/movimientos-stock',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getStockMovements
);

router.get(
  '/movimientos-stock/export',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.exportStockMovementsCsv
);

router.get(
  '/movimientos-activo',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getAssetMovements
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
  '/auditoria',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getAuditoria
);

router.get(
  '/activos/:id/perfil',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getActivoProfile
);

router.get(
  '/activos/:id/pdf',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.exportActivoPdf
);

// ── Gestión de activos (admin) ─────────────────────────────
const cambiarEstadoActivoSchema = Joi.object({
  nuevo_estado: Joi.string()
    .valid('en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido')
    .required(),
  motivo: Joi.string().trim().min(3).max(500).required(),
  bodega_destino_id: uuid.when('nuevo_estado', {
    is: 'en_stock',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null),
  }),
});

const reubicarActivoSchema = Joi.object({
  bodega_destino_id: uuid.required(),
  motivo: Joi.string().trim().max(500).allow('', null),
});

const editarActivoSchema = Joi.object({
  valor: Joi.number().integer().min(0).allow(null),
  fecha_vencimiento: Joi.date().iso().allow(null),
}).min(1);

router.patch(
  '/activos/:id/estado',
  authMiddleware,
  checkRole(['admin']),
  validateBody(cambiarEstadoActivoSchema),
  InventarioController.cambiarEstadoActivo
);

router.patch(
  '/activos/:id/reubicar',
  authMiddleware,
  checkRole(['admin']),
  validateBody(reubicarActivoSchema),
  InventarioController.reubicarActivo
);

router.patch(
  '/activos/:id',
  authMiddleware,
  checkRole(['admin']),
  validateBody(editarActivoSchema),
  InventarioController.editarActivo
);

router.get(
  '/export/pdf',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateQuery(exportPdfQuerySchema),
  InventarioController.exportInventarioPdf
);

module.exports = router;
