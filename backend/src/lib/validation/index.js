const Joi = require('joi');
const validator = require('validator');
const { validateRutChileno, normalizeRut } = require('../rut');

const PATTERNS = {
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
  PHONE_INTL: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
};

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(255);
const password = Joi.string().min(12).max(128);
const personName = Joi.string().trim().min(2).max(100).pattern(PATTERNS.NAME);

/**
 * Validator Joi de RUT chileno:
 * - Valida el dígito verificador matemáticamente
 * - Normaliza a formato DASH sin puntos: "12345678-9"
 */
const rut = Joi.string().trim().custom((value, helpers) => {
  if (!validateRutChileno(value)) {
    return helpers.error('rut.invalid');
  }
  return normalizeRut(value);
}, 'Chilean RUT validation').messages({
  'rut.invalid': 'RUT inválido — verifique el número y el dígito verificador',
});

const userRole = Joi.string().valid('admin', 'supervisor', 'bodega', 'trabajador', 'worker');

const joiPhone = (locale = 'any') =>
  Joi.string().trim().custom((value, helpers) => {
    if (!value) return value;
    if (!validator.isMobilePhone(value, locale, { strictMode: false })) {
      return helpers.error('string.phone');
    }
    return value;
  }, 'phone validation').messages({
    'string.phone': 'El numero de telefono no es valido',
  });

const phoneNumber = joiPhone('any');

const pushSubscription = Joi.object({
  endpoint: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048).required(),
  expirationTime: Joi.any().allow(null),
  keys: Joi.object({
    p256dh: Joi.string().required(),
    auth: Joi.string().required(),
  }).required(),
});

module.exports = {
  PATTERNS,
  email,
  password,
  personName,
  rut,
  phoneNumber,
  userRole,
  pushSubscription,
  validateRutChileno,
  normalizeRut,
};
