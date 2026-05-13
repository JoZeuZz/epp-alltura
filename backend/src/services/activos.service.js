const EntregasService = require('./entregas.service');
const DevolucionesService = require('./devoluciones.service');

const extractActivoIds = (detalles) => {
  if (!Array.isArray(detalles)) {
    return [];
  }

  return detalles.flatMap((detalle) => {
    if (!detalle || !Array.isArray(detalle.activo_ids)) {
      return [];
    }

    return detalle.activo_ids
      .filter((activoId) => activoId !== null && activoId !== undefined && activoId !== '')
      .map((activoId) => String(activoId));
  });
};

class ActivosService {
  static async entregar(activoId, payload, userId, imageFile = null) {
    const targetActivoId = String(activoId);
    const allActivoIds = extractActivoIds(payload?.detalles);
    if (!allActivoIds.includes(targetActivoId)) {
      const err = new Error('El activo de la URL debe estar incluido en los detalles');
      err.statusCode = 400;
      err.code = 'ASSET_NOT_IN_DETAILS';
      throw err;
    }
    return EntregasService.create(payload, userId, imageFile);
  }

  static async devolver(activoId, payload, userId, imageFile = null) {
    const targetActivoId = String(activoId);
    const allActivoIds = extractActivoIds(payload?.detalles);
    if (!allActivoIds.includes(targetActivoId)) {
      const err = new Error('El activo de la URL debe estar incluido en los detalles');
      err.statusCode = 400;
      err.code = 'ASSET_NOT_IN_DETAILS';
      throw err;
    }
    return DevolucionesService.create(payload, userId, imageFile);
  }
}

module.exports = ActivosService;
