const buildError = (message, statusCode = 400, code = null, data = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  if (data != null) error.data = data;
  return error;
};

module.exports = { buildError };
