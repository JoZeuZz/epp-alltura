const Joi = require('joi');
const validator = require('validator');

/**
 * Custom Validators usando Validator.js
 * Extienden Joi con validaciones más específicas y robustas
 * 
 * Referencias:
 * - Validator.js: https://github.com/validatorjs/validator.js
 * - Joi Custom Validators: https://joi.dev/api/?v=17.9.1#anyexternalmethod-description
 */

/**
 * Validador Joi para teléfonos usando validator.js
 * Soporta validación por locale (ej: 'es-CL' para Chile)
 * 
 * @param {string} locale - Locale code (ej: 'es-CL', 'en-US', 'any')
 * @returns {Joi.StringSchema}
 */
const joiPhone = (locale = 'any') => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js para validación robusta
      const isValid = validator.isMobilePhone(value, locale, { strictMode: false });
      
      if (!isValid) {
        const localeMsg = locale !== 'any' ? ` para ${locale}` : '';
        return helpers.error('string.phone', { locale: localeMsg });
      }

      return value;
    }, 'phone validation')
    .messages({
      'string.phone': 'El número de teléfono no es válido{locale}',
    });
};

/**
 * Validador Joi para coordenadas lat/long usando validator.js
 * Valida formato "lat,long" (ej: "-33.4489,-70.6693")
 * 
 * @returns {Joi.StringSchema}
 */
const joiLatLong = () => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isLatLong(value)) {
        return helpers.error('string.latlong');
      }

      return value;
    }, 'lat/long validation')
    .messages({
      'string.latlong': 'Las coordenadas deben estar en formato "lat,long" (ej: "-33.4489,-70.6693")',
    });
};

/**
 * Validador Joi para UUIDs usando validator.js
 * Más estricto que regex, valida estructura completa
 * 
 * @param {number} version - Versión UUID (1, 3, 4, 5) o 'all'
 * @returns {Joi.StringSchema}
 */
const joiUUID = (version = 4) => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isUUID(value, version)) {
        return helpers.error('string.uuid', { version });
      }

      return value;
    }, 'UUID validation')
    .messages({
      'string.uuid': 'El UUID debe ser versión {version} válido',
    });
};

/**
 * Validador Joi para códigos postales usando validator.js
 * Soporta validación por locale (ej: 'CL' para Chile)
 * 
 * @param {string} locale - Locale code (ej: 'CL', 'US', 'any')
 * @returns {Joi.StringSchema}
 */
const joiPostalCode = (locale = 'any') => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isPostalCode(value, locale)) {
        const localeMsg = locale !== 'any' ? ` para ${locale}` : '';
        return helpers.error('string.postalcode', { locale: localeMsg });
      }

      return value;
    }, 'postal code validation')
    .messages({
      'string.postalcode': 'El código postal no es válido{locale}',
    });
};

/**
 * Validador Joi para JSON válido usando validator.js
 * Útil para validar campos que almacenan JSON como string
 * 
 * @returns {Joi.StringSchema}
 */
const joiJSON = () => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isJSON(value)) {
        return helpers.error('string.json');
      }

      return value;
    }, 'JSON validation')
    .messages({
      'string.json': 'El valor debe ser un JSON válido',
    });
};

/**
 * Validador Joi para direcciones IP usando validator.js
 * Soporta IPv4 e IPv6
 * 
 * @param {number} version - Versión IP (4, 6) o 'all'
 * @returns {Joi.StringSchema}
 */
const joiIP = (version = 'all') => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      const isValid = version === 'all' 
        ? validator.isIP(value) 
        : validator.isIP(value, version);
      
      if (!isValid) {
        const versionMsg = version !== 'all' ? ` v${version}` : '';
        return helpers.error('string.ip', { version: versionMsg });
      }

      return value;
    }, 'IP validation')
    .messages({
      'string.ip': 'La dirección IP{version} no es válida',
    });
};

/**
 * Validador Joi para slugs URL-friendly usando validator.js
 * Solo permite lowercase, números y guiones
 * 
 * @returns {Joi.StringSchema}
 */
const joiSlug = () => {
  return Joi.string()
    .trim()
    .lowercase()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isSlug(value)) {
        return helpers.error('string.slug');
      }

      return value;
    }, 'slug validation')
    .messages({
      'string.slug': 'El slug solo puede contener letras minúsculas, números y guiones (ej: "mi-slug-123")',
    });
};

/**
 * Validador Joi para números de tarjeta de crédito usando validator.js
 * Valida formato y algoritmo de Luhn
 * 
 * @returns {Joi.StringSchema}
 */
const joiCreditCard = () => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Remover espacios y guiones
      const sanitized = value.replace(/[\s-]/g, '');

      // Usar validator.js con algoritmo de Luhn
      if (!validator.isCreditCard(sanitized)) {
        return helpers.error('string.creditcard');
      }

      return sanitized;
    }, 'credit card validation')
    .messages({
      'string.creditcard': 'El número de tarjeta de crédito no es válido',
    });
};

/**
 * Validador Joi para códigos hexadecimales de color
 * Valida formatos #RGB, #RRGGBB, #RRGGBBAA
 * 
 * @returns {Joi.StringSchema}
 */
const joiHexColor = () => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isHexColor(value)) {
        return helpers.error('string.hexcolor');
      }

      return value;
    }, 'hex color validation')
    .messages({
      'string.hexcolor': 'El color debe ser hexadecimal válido (ej: #FF5733)',
    });
};

/**
 * Validador Joi para MAC addresses
 * Valida direcciones MAC de hardware
 * 
 * @returns {Joi.StringSchema}
 */
const joiMACAddress = () => {
  return Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isMACAddress(value)) {
        return helpers.error('string.macaddress');
      }

      return value;
    }, 'MAC address validation')
    .messages({
      'string.macaddress': 'La dirección MAC no es válida (ej: 00:1B:44:11:3A:B7)',
    });
};

/**
 * Validador Joi para FQDN (Fully Qualified Domain Name)
 * Valida nombres de dominio completos
 * 
 * @returns {Joi.StringSchema}
 */
const joiFQDN = () => {
  return Joi.string()
    .trim()
    .lowercase()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isFQDN(value)) {
        return helpers.error('string.fqdn');
      }

      return value;
    }, 'FQDN validation')
    .messages({
      'string.fqdn': 'El dominio no es válido (ej: ejemplo.com)',
    });
};

/**
 * Validador Joi para IBAN (International Bank Account Number)
 * Valida números de cuenta bancaria internacional
 * 
 * @returns {Joi.StringSchema}
 */
const joiIBAN = () => {
  return Joi.string()
    .trim()
    .uppercase()
    .custom((value, helpers) => {
      if (!value) {
        return value;
      }

      // Usar validator.js
      if (!validator.isIBAN(value)) {
        return helpers.error('string.iban');
      }

      return value;
    }, 'IBAN validation')
    .messages({
      'string.iban': 'El IBAN no es válido',
    });
};

module.exports = {
  // Validadores de uso común
  joiPhone,
  joiLatLong,
  joiUUID,
  joiPostalCode,
  joiJSON,
  joiIP,
  joiSlug,
  
  // Validadores financieros
  joiCreditCard,
  joiIBAN,
  
  // Validadores de formato
  joiHexColor,
  joiMACAddress,
  joiFQDN,
};
