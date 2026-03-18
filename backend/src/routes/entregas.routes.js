const express = require('express');
const Joi = require('joi');
const EntregasController = require('../controllers/entregas.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const router = express.Router();

const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, { abortEarly: false });
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

const entregaDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  activo_ids: Joi.array().items(uuid).min(1).optional(),
  lote_id: uuid.allow(null),
  cantidad: Joi.number().positive().optional(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').default('ok'),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const createEntregaSchema = Joi.object({
  trabajador_id: uuid.required(),
  transportista_trabajador_id: uuid.allow(null),
  receptor_trabajador_id: uuid.allow(null),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega', 'prestamo', 'traslado').optional(),
  es_traslado: Joi.boolean().optional(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(entregaDetalleSchema).min(1).required(),
})
  .or('tipo', 'es_traslado')
  .custom((value, helpers) => {
    if (typeof value.es_traslado === 'boolean' && value.tipo) {
      if (value.es_traslado && value.tipo !== 'traslado') {
        return helpers.error('any.custom', {
          message: 'Si es_traslado=true, tipo debe ser "traslado"',
        });
      }

      if (!value.es_traslado && !['entrega', 'prestamo'].includes(value.tipo)) {
        return helpers.error('any.custom', {
          message: 'El payload combina tipo y es_traslado de forma inconsistente',
        });
      }
    }
    return value;
  }, 'consistencia tipo/es_traslado')
  .messages({
    'object.missing': 'Debe enviar tipo o es_traslado',
    'any.custom': '{{#message}}',
  });

const anularEntregaSchema = Joi.object({
  motivo: Joi.string().trim().min(5).max(1000).required(),
});

const deshacerEntregaSchema = Joi.object({
  motivo: Joi.string().trim().min(5).max(1000).required(),
});

const recibirTrasladoSchema = Joi.object({
  receptor_trabajador_id: uuid.allow(null),
});

router.get('/', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), EntregasController.list);
router.get('/:id', authMiddleware, checkRole(['admin', 'supervisor', 'bodega']), EntregasController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(createEntregaSchema),
  EntregasController.create
);
router.post(
  '/:id/confirm',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  EntregasController.confirm
);

router.post(
  '/:id/recibir',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(recibirTrasladoSchema),
  EntregasController.recibirTraslado
);

router.post(
  '/:id/anular',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(anularEntregaSchema),
  EntregasController.anular
);

router.post(
  '/:id/deshacer',
  authMiddleware,
  checkRole(['admin']),
  validateBody(deshacerEntregaSchema),
  EntregasController.deshacer
);

module.exports = router;
