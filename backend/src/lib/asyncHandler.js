/**
 * Async Handler Wrapper
 * 
 * Envuelve funciones async de Express para capturar errores automáticamente
 * y pasarlos al middleware de manejo de errores global.
 * 
 * Esto elimina la necesidad de try-catch en cada ruta.
 * 
 * @param {Function} fn - Función async del route handler
 * @returns {Function} - Middleware de Express
 * 
 * @example
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await Model.getAll();
 *   res.json(data);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
