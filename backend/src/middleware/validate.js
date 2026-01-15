/**
 * Middleware de validación Joi genérico
 * Valida request body, query params o params según lo especificado
 */

/**
 * Middleware para validar requests con esquemas Joi
 * @param {Object} schema - Esquema Joi para validación
 * @param {string} source - Fuente de datos a validar: 'body', 'query', 'params'
 * @returns {Function} Middleware de Express
 */
const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      
      const validatedData = await schema.validateAsync(dataToValidate, {
        abortEarly: false, // Retornar todos los errores, no solo el primero
        convert: true,     // Convertir tipos automáticamente
        stripUnknown: true // Eliminar propiedades no definidas en el schema
      });
      
      // Reemplazar los datos originales con los validados y convertidos
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error.isJoi) {
        // Error de validación Joi
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Los datos proporcionados no son válidos',
          details: errorMessages
        });
      }
      
      // Error inesperado
      next(error);
    }
  };
};

module.exports = {
  validateRequest,
  validate: validateRequest // Alias para retrocompatibilidad
};
