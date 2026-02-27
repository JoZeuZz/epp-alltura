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

const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });

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
  valor: Joi.number().min(0).allow(null),
  fecha_vencimiento: Joi.date().iso().allow(null),
});

const loteSchema = Joi.object({
  codigo_lote: Joi.string().trim().max(100).allow('', null),
  fecha_fabricacion: Joi.date().iso().allow(null),
  fecha_vencimiento: Joi.date().iso().allow(null),
});

const ingresoDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  ubicacion_id: uuid.required(),
  cantidad: Joi.number().positive().required(),
  costo_unitario: Joi.number().min(0).default(0),
  notas: Joi.string().trim().max(1000).allow('', null),
  lote_id: uuid.allow(null),
  lote: loteSchema,
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
  tipo_motivo: Joi.string().valid('salida', 'baja', 'consumo', 'ajuste').required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(
    Joi.object({
      articulo_id: uuid.required(),
      ubicacion_id: uuid.required(),
      cantidad: Joi.number().positive().required(),
      lote_id: uuid.allow(null),
      notas: Joi.string().trim().max(1000).allow('', null),
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
  '/auditoria',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getAuditoria
);

router.get(
  '/lotes',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getLotes
);

module.exports = router;
