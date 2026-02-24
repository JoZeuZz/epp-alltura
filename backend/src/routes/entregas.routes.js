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

const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });

const entregaDetalleSchema = Joi.object({
  articulo_id: uuid.required(),
  activo_id: uuid.allow(null),
  lote_id: uuid.allow(null),
  cantidad: Joi.number().positive().required(),
  condicion_salida: Joi.string().valid('ok', 'usado', 'danado').default('ok'),
  notas: Joi.string().trim().max(1000).allow('', null),
});

const createEntregaSchema = Joi.object({
  trabajador_id: uuid.required(),
  ubicacion_origen_id: uuid.required(),
  ubicacion_destino_id: uuid.required(),
  tipo: Joi.string().valid('entrega', 'prestamo', 'traslado').required(),
  nota_destino: Joi.string().trim().max(1000).allow('', null),
  detalles: Joi.array().items(entregaDetalleSchema).min(1).required(),
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
  '/:id/anular',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  EntregasController.anular
);

module.exports = router;
