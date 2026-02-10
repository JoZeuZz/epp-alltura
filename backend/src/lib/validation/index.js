const Joi = require('joi');
const validator = require('validator');

const PATTERNS = {
  RUT: /^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$|^\d{7,8}-[\dkK]$/,
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
  PHONE_INTL: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
};

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(255);
const password = Joi.string().min(12).max(128);
const personName = Joi.string().trim().min(2).max(100).pattern(PATTERNS.NAME);
const rut = Joi.string().trim().pattern(PATTERNS.RUT);
const url = Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048);
const id = Joi.number().integer().positive();

const userRole = Joi.string().valid('admin', 'supervisor', 'bodega', 'trabajador', 'worker');
const projectStatus = Joi.string().valid('active', 'completed', 'inactive');
const assemblyStatus = Joi.string().valid('assembled', 'disassembled', 'in_progress');
const cardStatus = Joi.string().valid('green', 'red');

const dimension = Joi.number().positive().max(999.99).precision(2);
const longText = Joi.string().trim().max(2000).allow('', null);

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
  endpoint: url.required(),
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
  joiPhone,
  url,
  id,
  userRole,
  projectStatus,
  assemblyStatus,
  cardStatus,
  dimension,
  longText,
  pushSubscription,
};
