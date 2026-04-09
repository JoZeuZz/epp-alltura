const buildSuccessResponse = (message, data = null) => ({
  success: true,
  message,
  data,
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
  buildSuccessResponse,
  buildErrorResponse,
  sendSuccess,
};
