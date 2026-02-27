const Joi = require('joi');
const validator = require('validator');

const PATTERNS = {
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
  PHONE_INTL: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
};

// ─── Validador de RUT chileno (algoritmo módulo 11) ───────────────────────────

/**
 * Valida un RUT chileno verificando el dígito verificador con el algoritmo módulo 11.
 * Acepta formatos: "12345678-9", "12.345.678-9", "12345678-K" (mayúscula o minúscula).
 * @param {string} rut
 * @returns {boolean}
 */
function validateRutChileno(rut) {
  if (!rut || typeof rut !== 'string') return false;
  const clean = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(clean)) return false;

  const dv = clean.slice(-1);
  const digits = clean.slice(0, -1);

  let sum = 0;
  let mul = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expectedDv;
}

/**
 * Normaliza un RUT al formato XXXXXXXX-X (sin puntos, guion, DV en mayúscula).
 * @param {string} rut
 * @returns {string}
 */
function normalizeRut(rut) {
  if (!rut || typeof rut !== 'string') return rut;
  const clean = rut.replace(/\./g, '').toUpperCase().trim();
  // Si ya tiene guion, dejarlo; si no, insertar guion antes del último carácter
  if (clean.includes('-')) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

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
