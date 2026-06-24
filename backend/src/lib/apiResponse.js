const validator = require('validator');

const normalizeLegacyHtmlEntities = (value) => {
  if (typeof value === 'string') return validator.unescape(value);
  if (Array.isArray(value)) return value.map(normalizeLegacyHtmlEntities);
  if (value && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeLegacyHtmlEntities(entry)])
    );
  }
  return value;
};

const buildSuccessResponse = (message, data = null) => ({
  success: true,
  message,
  data: normalizeLegacyHtmlEntities(data),
  errors: [],
});

const sendSuccess = (res, {
  status = 200,
  message = 'Operacion completada exitosamente',
  data = null,
}) => res.status(status).json(buildSuccessResponse(message, data));

const buildErrorResponse = (message, errors = []) => ({
  success: false,
  message,
  data: null,
  errors,
});

module.exports = {
  buildErrorResponse,
  sendSuccess,
};
