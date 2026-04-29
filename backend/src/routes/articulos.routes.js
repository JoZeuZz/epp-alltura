const express = require('express');
const Joi = require('joi');
const ArticulosController = require('../controllers/articulos.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const {
  SUBCLASIFICACIONES_POR_GRUPO,
  normalizeGrupoPrincipal,
  normalizeSubclasificacion,
} = require('../lib/articuloValidation');

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

const validateGrupoSubclasificacionCreate = (value, helpers) => {
  const grupoPrincipal = normalizeGrupoPrincipal(value.grupo_principal);
  const subclasificacion = normalizeSubclasificacion(value.subclasificacion);
  const subclasificacionesPermitidas = SUBCLASIFICACIONES_POR_GRUPO[grupoPrincipal];

  if (!subclasificacionesPermitidas || !subclasificacionesPermitidas.has(subclasificacion)) {
    return helpers.error('any.custom', {
      message: `La subclasificación "${subclasificacion}" no es válida para grupo_principal "${grupoPrincipal}"`,
    });
  }

  return {
    ...value,
    grupo_principal: grupoPrincipal,
    subclasificacion,
  };
};

const validateGrupoSubclasificacionUpdate = (value, helpers) => {
  const hasGrupo = Object.prototype.hasOwnProperty.call(value, 'grupo_principal');
  const hasSubclasificacion = Object.prototype.hasOwnProperty.call(value, 'subclasificacion');

  if (hasGrupo && !hasSubclasificacion) {
    return helpers.error('any.custom', {
      message: 'Si actualiza grupo_principal debe enviar subclasificacion compatible',
    });
  }

  const grupoPrincipal = hasGrupo ? normalizeGrupoPrincipal(value.grupo_principal) : undefined;
  const subclasificacion = hasSubclasificacion
    ? normalizeSubclasificacion(value.subclasificacion)
    : undefined;

  if (hasGrupo && hasSubclasificacion) {
    const subclasificacionesPermitidas = SUBCLASIFICACIONES_POR_GRUPO[grupoPrincipal];
    if (!subclasificacionesPermitidas || !subclasificacionesPermitidas.has(subclasificacion)) {
      return helpers.error('any.custom', {
        message: `La subclasificación "${subclasificacion}" no es válida para grupo_principal "${grupoPrincipal}"`,
      });
    }
  }

  return {
    ...value,
    grupo_principal: hasGrupo ? grupoPrincipal : value.grupo_principal,
    subclasificacion: hasSubclasificacion ? subclasificacion : value.subclasificacion,
  };
};

const especialidadSchema = Joi.string()
  .trim()
  .lowercase()
  .valid('oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida');

const articuloCreateSchema = Joi.object({
  grupo_principal: Joi.string().trim().lowercase().valid('equipo', 'herramienta').required(),
  subclasificacion: Joi.string()
    .trim()
    .lowercase()
    .valid('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria')
    .required(),
  especialidades: Joi.array().items(especialidadSchema).unique().default([]),
  nombre: Joi.string().trim().min(2).max(150).required(),
  marca: Joi.string().trim().min(1).max(120).required(),
  modelo: Joi.string().trim().min(1).max(120).required(),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope').required(),
  requiere_vencimiento: Joi.boolean().default(false),
  unidad_medida: Joi.string().trim().max(50).required(),
  estado: Joi.string().valid('activo', 'inactivo').default('activo'),
  tipo: Joi.any().forbidden().messages({ 'any.unknown': 'Use grupo_principal en lugar de tipo' }),
  tracking_mode: Joi.any().forbidden().messages({
    'any.unknown': 'tracking_mode ya no se recibe en el payload de artículo',
  }),
  retorno_mode: Joi.any().forbidden().messages({
    'any.unknown': 'retorno_mode ya no se recibe en el payload de artículo',
  }),
  categoria: Joi.any().forbidden().messages({
    'any.unknown': 'Use subclasificacion en lugar de categoria',
  }),
})
  .custom(validateGrupoSubclasificacionCreate, 'group-subclassification validation')
  .messages({
    'any.custom': '{{#message}}',
  });

const articuloUpdateSchema = Joi.object({
  grupo_principal: Joi.string().trim().lowercase().valid('equipo', 'herramienta'),
  subclasificacion: Joi.string()
    .trim()
    .lowercase()
    .valid('epp', 'medicion_ensayos', 'manual', 'electrica_cable', 'inalambrica_bateria'),
  especialidades: Joi.array().items(especialidadSchema).unique(),
  nombre: Joi.string().trim().min(2).max(150),
  marca: Joi.string().trim().min(1).max(120),
  modelo: Joi.string().trim().min(1).max(120),
  nivel_control: Joi.string().valid('alto', 'medio', 'bajo', 'fuera_scope'),
  requiere_vencimiento: Joi.boolean(),
  unidad_medida: Joi.string().trim().max(50),
  estado: Joi.string().valid('activo', 'inactivo'),
  tipo: Joi.any().forbidden().messages({ 'any.unknown': 'Use grupo_principal en lugar de tipo' }),
  tracking_mode: Joi.any().forbidden().messages({
    'any.unknown': 'tracking_mode ya no se recibe en el payload de artículo',
  }),
  retorno_mode: Joi.any().forbidden().messages({
    'any.unknown': 'retorno_mode ya no se recibe en el payload de artículo',
  }),
  categoria: Joi.any().forbidden().messages({
    'any.unknown': 'Use subclasificacion en lugar de categoria',
  }),
})
  .min(1)
  .custom(validateGrupoSubclasificacionUpdate, 'group-subclassification validation')
  .messages({
    'any.custom': '{{#message}}',
  });

router.get('/', authMiddleware, ArticulosController.list);
router.get('/:id', authMiddleware, ArticulosController.getById);
router.post(
  '/',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(articuloCreateSchema),
  ArticulosController.create
);
router.put(
  '/:id',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  validateBody(articuloUpdateSchema),
  ArticulosController.update
);
router.delete('/:id', authMiddleware, checkRole(['admin']), ArticulosController.remove);
router.delete(
  '/:id/permanent',
  authMiddleware,
  checkRole(['admin']),
  ArticulosController.removePermanent
);

module.exports = router;
