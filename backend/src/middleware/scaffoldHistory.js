const ScaffoldHistory = require('../models/scaffoldHistory');
const { logger } = require('../lib/logger');

/**
 * Middleware para registrar automáticamente cambios en el historial de andamios
 * Se ejecuta después de actualizar un andamio
 */
const trackScaffoldChanges = async (req, res, next) => {
  // Guardar el método JSON original
  const originalJson = res.json.bind(res);

  // Sobrescribir res.json para interceptar la respuesta
  res.json = async function(data) {
    // Solo registrar en métodos PUT, PATCH, DELETE
    if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      try {
        // Si hay datos anteriores guardados en req (se deben guardar en el controlador)
        if (req.previousScaffoldData && req.scaffoldId) {
          await ScaffoldHistory.createFromChanges(
            req.scaffoldId,
            req.user.id,
            req.previousScaffoldData,
            data // Los nuevos datos que se están enviando
          );
        }
      } catch (err) {
        logger.error(`Error al registrar historial de andamio: ${err.message}`, err);
        // No fallar la petición si falla el historial
      }
    }

    // Llamar al método original
    return originalJson(data);
  };

  next();
};

/**
 * Helper para guardar el estado anterior de un andamio antes de actualizarlo
 * Debe llamarse en el controlador antes de hacer la actualización
 */
const saveScaffoldState = (req, scaffoldId, previousData) => {
  req.scaffoldId = scaffoldId;
  req.previousScaffoldData = previousData;
};

module.exports = {
  trackScaffoldChanges,
  saveScaffoldState,
};
