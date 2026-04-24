const express = require('express');
const Joi = require('joi');
const InventarioController = require('../controllers/inventario.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { documentUpload, validateDocumentMagic } = require('../middleware/upload');

const router = express.Router();

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

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

const uuid = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid GUID' });

const documentoCompraSchema = Joi.object({
  proveedor_id: uuid.required(),
  tipo: Joi.string().valid('factura', 'boleta', 'guia').required(),
  numero: Joi.string().trim().max(80).required(),
  fecha: Joi.date().iso().required(),
  archivo_url: Joi.string().trim().uri({ scheme: ['http', 'https'] }).allow('', null),
});

const serialAssetSchema = Joi.object({
  codigo: Joi.string().trim().max(120).required(),
  nro_serie: Joi.string().trim().max(120).allow('', null),
  valor: Joi.number().integer().min(0).allow(null),
  fecha_vencimiento: Joi.date().iso().allow(null),
});

const ingresoDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  ubicacion_id: uuid.required(),
  cantidad: Joi.number().integer().positive().required(),
  costo_unitario: Joi.number().integer().min(0).default(0),
  notas: Joi.string().trim().max(1000).allow('', null),
  activos: Joi.array().items(serialAssetSchema),
});

const createIngresoSchema = Joi.object({
  fecha_ingreso: Joi.date().iso().allow(null),
  fecha_compra: Joi.date().iso().allow(null),
  notas: Joi.string().trim().max(1000).allow('', null),
  documento_compra_id: uuid.allow(null),
  documento_compra: documentoCompraSchema,
  detalles: Joi.array().items(ingresoDetalleSchema).min(1).required(),
}).custom((value, helpers) => {
  if (value.documento_compra_id && value.documento_compra) {
    return helpers.error('any.custom', {
      message: 'No puede enviar documento_compra_id y documento_compra al mismo tiempo',
    });
  }

  return value;
}, 'inventory ingreso document validation').messages({
  'any.custom': '{{#message}}',
});

const optionalDocumentUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return documentUpload.single('documento_archivo')(req, res, next);
  }
  return next();
};

const parseIngresoPayload = (req, _res, next) => {
  try {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('multipart/form-data')) {
      req.body = req.body || {};
      return next();
    }

    const rawPayload = req.body?.payload_json;
    if (!rawPayload || typeof rawPayload !== 'string') {
      return next(
        buildError(
          'Debe enviar payload_json con el contenido del ingreso cuando usa multipart/form-data.',
          400,
          'PAYLOAD_JSON_REQUIRED'
        )
      );
    }

    const parsedPayload = JSON.parse(rawPayload);
    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
      return next(
        buildError(
          'payload_json debe ser un objeto JSON válido.',
          400,
          'PAYLOAD_JSON_INVALID'
        )
      );
    }

    req.body = parsedPayload;
    return next();
  } catch (error) {
    if (error.name === 'SyntaxError') {
      return next(buildError('payload_json no tiene formato JSON válido.', 400, 'INVALID_PAYLOAD_JSON'));
    }
    return next(error);
  }
};

const ensureIngresoDocumentRules = (req, _res, next) => {
  const hasUploadedDocument = Boolean(req.file);
  const hasDocumentObject = Boolean(req.body?.documento_compra);
  const hasDocumentId = Boolean(req.body?.documento_compra_id);

  if (hasUploadedDocument && !hasDocumentObject) {
    return next(
      buildError(
        'Si adjunta documento_archivo debe enviar documento_compra con tipo, número, fecha y proveedor.',
        400,
        'DOCUMENT_METADATA_REQUIRED'
      )
    );
  }

  if (hasUploadedDocument && hasDocumentId) {
    return next(
      buildError(
        'No puede adjuntar documento_archivo junto a documento_compra_id.',
        400,
        'DOCUMENT_ID_WITH_FILE_NOT_ALLOWED'
      )
    );
  }

  return next();
};

router.get(
  '/ingresos',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.listIngresos
);

router.post(
  '/ingresos',
  authMiddleware,
  checkRole(['admin']),
  optionalDocumentUpload,
  validateDocumentMagic,
  parseIngresoPayload,
  validateBody(createIngresoSchema),
  ensureIngresoDocumentRules,
  InventarioController.createIngreso
);

router.delete(
  '/ingresos/:id',
  authMiddleware,
  checkRole(['admin']),
  InventarioController.deleteIngreso
);

// ── Egresos ────────────────────────────────────────────────
const createEgresoSchema = Joi.object({
  tipo_motivo: Joi.string().valid('salida', 'baja', 'ajuste').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(
    Joi.object({
      articulo_id: uuid.required(),
      ubicacion_id: uuid.required(),
      cantidad: Joi.number().integer().positive().optional(),
      activo_ids: Joi.array().items(uuid).min(1).optional(),
      notas: Joi.string().trim().max(1000).allow('', null),
    }).custom((value, helpers) => {
      if ((!value.activo_ids || value.activo_ids.length === 0) && (value.cantidad === undefined || value.cantidad === null)) {
        return helpers.error('any.custom', {
          message: 'Cada detalle debe incluir cantidad o activo_ids',
        });
      }

      if (value.activo_ids && value.cantidad !== undefined && value.cantidad !== null) {
        return helpers.error('any.custom', {
          message: 'No debe combinar cantidad con activo_ids en el mismo detalle',
        });
      }

      return value;
    }, 'egreso detail validation').messages({
      'any.custom': '{{#message}}',
    })
  ).min(1).required(),
});

router.get(
  '/egresos',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.listEgresos
);

router.get(
  '/egresos/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getEgresoById
);

router.post(
  '/egresos',
  authMiddleware,
  checkRole(['admin']),
  validateBody(createEgresoSchema),
  InventarioController.createEgreso
);

router.delete(
  '/egresos/:id',
  authMiddleware,
  checkRole(['admin']),
  InventarioController.deleteEgreso
);

router.get(
  '/stock',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStock
);

router.get(
  '/stock-summary',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStockSummary
);

router.get(
  '/stock-paged',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStockPaged
);

router.get(
  '/movimientos-stock',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStockMovements
);

router.get(
  '/movimientos-stock/export',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.exportStockMovementsCsv
);

router.get(
  '/movimientos-activo',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getAssetMovements
);

router.get(
  '/activos',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getActivos
);

router.get(
  '/activos-paged',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getActivosPaged
);

router.get(
  '/activos-disponibles',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
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
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getActivoProfile
);

// ── Gestión de activos (admin) ─────────────────────────────
const cambiarEstadoActivoSchema = Joi.object({
  nuevo_estado: Joi.string()
    .valid('en_stock', 'asignado', 'mantencion', 'dado_de_baja', 'perdido')
    .required(),
  motivo: Joi.string().trim().min(3).max(500).required(),
  ubicacion_destino_id: uuid.when('nuevo_estado', {
    is: 'en_stock',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null),
  }),
});

const reubicarActivoSchema = Joi.object({
  ubicacion_destino_id: uuid.required(),
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

module.exports = router;
