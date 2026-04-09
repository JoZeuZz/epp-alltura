const express = require('express');
const Joi = require('joi');
const ComprasController = require('../controllers/compras.controller');
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

const loteSchema = Joi.object({
  codigo_lote: Joi.string().trim().max(100).allow('', null),
  fecha_fabricacion: Joi.date().iso().allow(null),
  fecha_vencimiento: Joi.date().iso().allow(null),
});

const compraDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  ubicacion_id: uuid.required(),
  cantidad: Joi.number().integer().positive().required(),
  costo_unitario: Joi.number().integer().min(0).required(),
  notas: Joi.string().trim().max(1000).allow('', null),
  lote_id: uuid.allow(null),
  lote: loteSchema,
  activos: Joi.array().items(serialAssetSchema),
});

const createCompraSchema = Joi.object({
  documento_compra_id: uuid.allow(null),
  documento_compra: documentoCompraSchema,
  fecha_compra: Joi.date().iso().allow(null),
  notas: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(compraDetalleSchema).min(1).required(),
}).custom((value, helpers) => {
  if (!value.documento_compra_id && !value.documento_compra) {
    return helpers.error('any.custom', {
      message: 'Debe enviar documento_compra_id o documento_compra',
    });
  }

  if (value.documento_compra_id && value.documento_compra) {
    return helpers.error('any.custom', {
      message: 'No puede enviar documento_compra_id y documento_compra al mismo tiempo',
    });
  }

  return value;
}, 'purchase document validation').messages({
  'any.custom': '{{#message}}',
});

router.get('/', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), ComprasController.list);
router.get('/:id', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), ComprasController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createCompraSchema),
  ComprasController.create
);
router.delete('/:id', authMiddleware, checkRole(['admin']), ComprasController.deleteIngreso);

module.exports = router;
