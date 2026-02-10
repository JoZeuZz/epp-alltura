const express = require('express');
const Joi = require('joi');
const UbicacionesController = require('../controllers/ubicaciones.controller');
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

const ubicacionCreateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150).required(),
  tipo: Joi.string()
    .valid('bodega', 'planta', 'proyecto', 'taller_mantencion')
    .required(),
  cliente: Joi.string().trim().max(150).allow('', null),
  direccion: Joi.string().trim().max(500).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
});

const ubicacionUpdateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(150),
  tipo: Joi.string().valid('bodega', 'planta', 'proyecto', 'taller_mantencion'),
  cliente: Joi.string().trim().max(150).allow('', null),
  direccion: Joi.string().trim().max(500).allow('', null),
  estado: Joi.string().valid('activo', 'inactivo'),
}).min(1);

router.get('/', authMiddleware, UbicacionesController.list);
router.get('/:id', authMiddleware, UbicacionesController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(ubicacionCreateSchema),
  UbicacionesController.create
);
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  validateBody(ubicacionUpdateSchema),
  UbicacionesController.update
);
router.delete('/:id', authMiddleware, checkRole(['admin']), UbicacionesController.remove);

module.exports = router;
