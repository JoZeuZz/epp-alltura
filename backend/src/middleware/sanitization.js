/**
 * Input Sanitization Middleware
 * Previene XSS, SQL Injection, NoSQL Injection y otras vulnerabilidades de inyección
 * 
 * Remedia:
 * - CVE-ALLTURA-008: XSS via Reflected Content (CVSS 7.5)
 * - CVE-ALLTURA-009: SQL Injection Risk (CVSS 9.1)
 * - CVE-ALLTURA-010: NoSQL Injection (CVSS 8.2)
 * 
 * Estrategia de defensa en profundidad:
 * 1. Sanitización de entrada (este archivo)
 * 2. Validación de esquema (Joi en rutas)
 * 3. Prepared statements (en modelos)
 * 4. Output encoding (en respuestas)
 * 
 * Referencias:
 * - OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 * - OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */

const createDOMPurify = require('isomorphic-dompurify');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
const { logger } = require('../lib/logger');

// Inicializar DOMPurify para uso en servidor
const DOMPurify = createDOMPurify();

/**
 * Configuración de DOMPurify
 * Política estricta que solo permite tags y atributos seguros
 */
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // Texto y formato básico
    'p', 'br', 'span', 'div',
    'strong', 'em', 'u', 's', 'sup', 'sub',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Listas
    'ul', 'ol', 'li',
    // Enlaces (solo si se habilita explícitamente)
    // 'a',
    // Tablas
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Código
    'code', 'pre',
    // Otros
    'blockquote', 'hr',
  ],
  ALLOWED_ATTR: [
    'class', // Solo atributos de estilo seguros
    'id',
    'title',
    'aria-label',
    'aria-describedby',
    'role',
    'data-*', // Atributos data-* para frameworks
  ],
  ALLOW_DATA_ATTR: true,
  ALLOW_ARIA_ATTR: true,
  RETURN_TRUSTED_TYPE: false,
  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false,
};

/**
 * Configuración para campos que permiten HTML rico (ej: contenido de posts)
 */
const DOMPURIFY_RICH_CONFIG = {
  ...DOMPURIFY_CONFIG,
  ALLOWED_TAGS: [
    ...DOMPURIFY_CONFIG.ALLOWED_TAGS,
    'a', 'img', // Permitir enlaces e imágenes
  ],
  ALLOWED_ATTR: [
    ...DOMPURIFY_CONFIG.ALLOWED_ATTR,
    'href', 'src', 'alt', 'target', 'rel',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
};

/**
 * Sanitiza un valor individual según su tipo
 * @param {*} value - Valor a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {*} Valor sanitizado
 */
const sanitizeValue = (value, options = {}) => {
  const {
    allowHTML = false,
    richHTML = false,
    trim = true,
    maxLength = null,
  } = options;

  // Si es null o undefined, retornar tal cual
  if (value === null || value === undefined) {
    return value;
  }

  // Si es número o booleano, retornar tal cual
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Si es objeto o array, sanitizar recursivamente
  if (typeof value === 'object') {
    return sanitizeObject(value, options);
  }

  // Convertir a string
  let sanitized = String(value);

  // Trim si está habilitado
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Aplicar maxLength si está especificado
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.warn('Input truncated', { originalLength: value.length, maxLength });
  }

  // Sanitizar HTML
  if (allowHTML) {
    const config = richHTML ? DOMPURIFY_RICH_CONFIG : DOMPURIFY_CONFIG;
    sanitized = DOMPurify.sanitize(sanitized, config);
  } else {
    // Si no se permite HTML, escapar caracteres especiales
    sanitized = validator.escape(sanitized);
  }

  return sanitized;
};

/**
 * Sanitiza un objeto recursivamente
 * @param {Object|Array} obj - Objeto o array a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {Object|Array} Objeto sanitizado
 */
const sanitizeObject = (obj, options = {}) => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeValue(item, options));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Prevenir NoSQL injection: remover/reemplazar operadores $ y .
      let sanitizedKey = String(key);
      if (sanitizedKey.startsWith('$') || sanitizedKey.includes('.')) {
        sanitizedKey = sanitizedKey.replace(/\$/g, '_').replace(/\./g, '_');
        logger.warn('NoSQL injection attempt detected', {
          originalKey: key,
          sanitizedKey,
        });
      }
      
      // Escapar HTML en la clave
      sanitizedKey = validator.escape(sanitizedKey);
      sanitized[sanitizedKey] = sanitizeValue(value, options);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware principal de sanitización
 * Sanitiza req.body, req.query y req.params
 */
const sanitizeInput = (options = {}) => {
  return (req, res, next) => {
    try {
      // Sanitizar body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, options);
      }

      // Sanitizar query params
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, options);
      }

      // Sanitizar route params
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params, options);
      }

      next();
    } catch (error) {
      logger.error('Sanitization error', {
        error: error.message,
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

/**
 * Middleware de sanitización ligera (solo NoSQL injection)
 * Útil para endpoints que no procesan entrada del usuario directamente
 */
const sanitizeMongoOnly = mongoSanitize({
  replaceWith: '_', // Reemplazar $ y . con _
  onSanitize: ({ req, key }) => {
    logger.warn('NoSQL injection attempt detected', {
      key,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  },
});

/**
 * Middleware para sanitización de HTML rico
 * Para endpoints que permiten contenido HTML (ej: posts, comentarios)
 */
const sanitizeRichHTML = sanitizeInput({
  allowHTML: true,
  richHTML: true,
  trim: true,
  maxLength: 50000, // 50KB de HTML
});

/**
 * Middleware para sanitización estricta (sin HTML)
 * Para endpoints con texto plano (ej: nombres, direcciones)
 */
const sanitizeStrict = sanitizeInput({
  allowHTML: false,
  trim: true,
  maxLength: 10000, // 10KB
});

/**
 * Valida y sanitiza emails
 * @param {string} email - Email a validar
 * @returns {string|null} Email normalizado o null si es inválido
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Trim y lowercase
  email = email.trim().toLowerCase();

  // Validar formato
  if (!validator.isEmail(email)) {
    return null;
  }

  // Normalizar (ej: gmail+alias@gmail.com → gmail@gmail.com)
  return validator.normalizeEmail(email, {
    gmail_remove_dots: false, // Mantener dots en Gmail
    gmail_remove_subaddress: true, // Remover +alias
    outlookdotcom_remove_subaddress: true,
    yahoo_remove_subaddress: true,
    icloud_remove_subaddress: true,
  });
};

/**
 * Valida y sanitiza URLs
 * @param {string} url - URL a validar
 * @param {Object} options - Opciones de validación
 * @returns {string|null} URL sanitizada o null si es inválida
 */
const sanitizeURL = (url, options = {}) => {
  const {
    protocols = ['http', 'https'],
    require_protocol = true,
    require_valid_protocol = true,
  } = options;

  if (!url || typeof url !== 'string') {
    return null;
  }

  url = url.trim();

  // Validar formato
  if (!validator.isURL(url, {
    protocols,
    require_protocol,
    require_valid_protocol,
    require_host: true,
    require_tld: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false,
  })) {
    return null;
  }

  // Prevenir javascript: protocol y otros peligrosos
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      logger.warn('Dangerous URL protocol blocked', { url, protocol });
      return null;
    }
  }

  return url;
};

/**
 * Sanitiza números (previene NaN, Infinity, etc.)
 * @param {*} value - Valor a convertir a número
 * @param {Object} options - Opciones de validación
 * @returns {number|null} Número sanitizado o null si es inválido
 */
const sanitizeNumber = (value, options = {}) => {
  const {
    min = null,
    max = null,
    integer = false,
  } = options;

  // Convertir a número
  const num = Number(value);

  // Validar que sea un número válido
  if (!Number.isFinite(num)) {
    return null;
  }

  // Validar rango
  if (min !== null && num < min) {
    return null;
  }
  if (max !== null && num > max) {
    return null;
  }

  // Validar que sea entero si se requiere
  if (integer && !Number.isInteger(num)) {
    return null;
  }

  return num;
};

/**
 * Sanitiza IDs de base de datos
 * Previene SQL injection en cláusulas WHERE
 */
const sanitizeID = (id) => {
  // Validar que sea un número entero positivo
  const sanitized = sanitizeNumber(id, {
    min: 1,
    integer: true,
  });

  if (sanitized === null) {
    logger.warn('Invalid ID format', { id });
    return null;
  }

  return sanitized;
};

/**
 * Sanitiza fechas
 * @param {*} value - Valor a convertir a fecha
 * @returns {Date|null} Fecha sanitizada o null si es inválida
 */
const sanitizeDate = (value) => {
  if (!value) {
    return null;
  }

  // Si ya es una fecha válida
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  // Intentar parsear string ISO 8601
  if (typeof value === 'string' && validator.isISO8601(value)) {
    const date = new Date(value);
    if (!isNaN(date)) {
      return date;
    }
  }

  return null;
};

/**
 * Sanitiza y valida números de teléfono
 * @param {string} phone - Teléfono a validar
 * @param {string} locale - Locale para validación (ej: 'es-CL', 'any')
 * @returns {string|null} Teléfono sanitizado o null si es inválido
 */
const sanitizePhone = (phone, locale = 'any') => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  phone = phone.trim();

  // Validar formato con validator.js
  if (!validator.isMobilePhone(phone, locale, { strictMode: false })) {
    logger.warn('Invalid phone number', { phone, locale });
    return null;
  }

  return phone;
};

/**
 * Sanitiza y valida coordenadas geográficas
 * @param {string} latLong - Coordenadas en formato "lat,long"
 * @returns {string|null} Coordenadas sanitizadas o null si son inválidas
 */
const sanitizeLatLong = (latLong) => {
  if (!latLong || typeof latLong !== 'string') {
    return null;
  }

  latLong = latLong.trim();

  // Validar formato con validator.js
  if (!validator.isLatLong(latLong)) {
    logger.warn('Invalid lat/long format', { latLong });
    return null;
  }

  return latLong;
};

/**
 * Sanitiza y valida UUIDs
 * @param {string} uuid - UUID a validar
 * @param {number|string} version - Versión UUID (1, 3, 4, 5) o 'all'
 * @returns {string|null} UUID sanitizado o null si es inválido
 */
const sanitizeUUID = (uuid, version = 4) => {
  if (!uuid || typeof uuid !== 'string') {
    return null;
  }

  uuid = uuid.trim().toLowerCase();

  // Validar con validator.js
  if (!validator.isUUID(uuid, version)) {
    logger.warn('Invalid UUID format', { uuid, version });
    return null;
  }

  return uuid;
};

/**
 * Sanitiza y valida strings JSON
 * @param {string} jsonString - String JSON a validar
 * @returns {string|null} JSON sanitizado o null si es inválido
 */
const sanitizeJSON = (jsonString) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  jsonString = jsonString.trim();

  // Validar con validator.js
  if (!validator.isJSON(jsonString)) {
    logger.warn('Invalid JSON format');
    return null;
  }

  return jsonString;
};

/**
 * Sanitiza y valida direcciones IP
 * @param {string} ip - Dirección IP a validar
 * @param {number|string} version - Versión IP (4, 6) o 'all'
 * @returns {string|null} IP sanitizada o null si es inválida
 */
const sanitizeIP = (ip, version = 'all') => {
  if (!ip || typeof ip !== 'string') {
    return null;
  }

  ip = ip.trim();

  // Validar con validator.js
  const isValid = version === 'all' 
    ? validator.isIP(ip) 
    : validator.isIP(ip, version);

  if (!isValid) {
    logger.warn('Invalid IP address', { ip, version });
    return null;
  }

  return ip;
};

/**
 * Sanitiza y valida slugs URL-friendly
 * @param {string} slug - Slug a validar
 * @returns {string|null} Slug sanitizado o null si es inválido
 */
const sanitizeSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  slug = slug.trim().toLowerCase();

  // Validar con validator.js
  if (!validator.isSlug(slug)) {
    logger.warn('Invalid slug format', { slug });
    return null;
  }

  return slug;
};

/**
 * Sanitiza y valida códigos postales
 * @param {string} postalCode - Código postal a validar
 * @param {string} locale - Locale para validación (ej: 'CL', 'US')
 * @returns {string|null} Código postal sanitizado o null si es inválido
 */
const sanitizePostalCode = (postalCode, locale = 'any') => {
  if (!postalCode || typeof postalCode !== 'string') {
    return null;
  }

  postalCode = postalCode.trim();

  // Validar con validator.js
  if (!validator.isPostalCode(postalCode, locale)) {
    logger.warn('Invalid postal code', { postalCode, locale });
    return null;
  }

  return postalCode;
};

/**
 * Middleware para validar y sanitizar rutas con IDs
 * Previene SQL injection via route params
 */
const validateIDParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const sanitized = sanitizeID(id);

    if (sanitized === null) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format. Must be a positive integer.`,
      });
    }

    // Reemplazar con valor sanitizado
    req.params[paramName] = sanitized;
    next();
  };
};

/**
 * Crea un sanitizador personalizado para campos específicos
 * @param {Object} fieldConfig - Configuración por campo
 * @returns {Function} Middleware de sanitización
 */
const createFieldSanitizer = (fieldConfig) => {
  return (req, res, next) => {
    try {
      for (const [field, config] of Object.entries(fieldConfig)) {
        let value = req.body[field];
        
        if (value === undefined || value === null) {
          continue;
        }

        // Aplicar sanitización según tipo
        switch (config.type) {
          case 'email':
            value = sanitizeEmail(value);
            break;
          case 'url':
            value = sanitizeURL(value, config.options);
            break;
          case 'number':
            value = sanitizeNumber(value, config.options);
            break;
          case 'date':
            value = sanitizeDate(value);
            break;
          case 'id':
            value = sanitizeID(value);
            break;
          case 'phone':
            value = sanitizePhone(value, config.locale || 'any');
            break;
          case 'latlong':
            value = sanitizeLatLong(value);
            break;
          case 'uuid':
            value = sanitizeUUID(value, config.version || 4);
            break;
          case 'json':
            value = sanitizeJSON(value);
            break;
          case 'ip':
            value = sanitizeIP(value, config.version || 'all');
            break;
          case 'slug':
            value = sanitizeSlug(value);
            break;
          case 'postalcode':
            value = sanitizePostalCode(value, config.locale || 'any');
            break;
          case 'html':
            value = sanitizeValue(value, { allowHTML: true, richHTML: config.rich || false });
            break;
          case 'text':
          default:
            value = sanitizeValue(value, { allowHTML: false, maxLength: config.maxLength });
            break;
        }

        // Si la sanitización falla y el campo es requerido, retornar error
        if (value === null && config.required) {
          return res.status(400).json({
            success: false,
            error: `Invalid ${field}: ${config.error || 'validation failed'}`,
          });
        }

        // Actualizar valor en el body
        req.body[field] = value;
      }

      next();
    } catch (error) {
      logger.error('Field sanitization error', {
        error: error.message,
        fields: Object.keys(fieldConfig),
      });
      next(error);
    }
  };
};

module.exports = {
  // Middlewares principales
  sanitizeInput,
  sanitizeStrict,
  sanitizeRichHTML,
  sanitizeMongoOnly,
  validateIDParam,
  
  // Funciones de sanitización individuales
  sanitizeValue,
  sanitizeObject,
  sanitizeEmail,
  sanitizeURL,
  sanitizeNumber,
  sanitizeID,
  sanitizeDate,
  sanitizePhone,
  sanitizeLatLong,
  sanitizeUUID,
  sanitizeJSON,
  sanitizeIP,
  sanitizeSlug,
  sanitizePostalCode,
  
  // Utilidades
  createFieldSanitizer,
  
  // Constantes
  DOMPURIFY_CONFIG,
  DOMPURIFY_RICH_CONFIG,
};
