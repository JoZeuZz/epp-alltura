const EntregasService = require('./entregas.service');
const DevolucionesService = require('./devoluciones.service');

class ActivosService {
  static async entregar(activoId, payload, userId) {
    const allActivoIds = (payload.detalles || []).flatMap((d) => d.activo_ids || []);
    if (!allActivoIds.includes(activoId)) {
      const err = new Error('El activo de la URL debe estar incluido en los detalles');
      err.statusCode = 400;
      err.code = 'ASSET_NOT_IN_DETAILS';
      throw err;
    }
    return EntregasService.create(payload, userId);
  }

  static async devolver(activoId, payload, userId) {
    const allActivoIds = (payload.detalles || []).flatMap((d) => d.activo_ids || []);
    if (!allActivoIds.includes(activoId)) {
      const err = new Error('El activo de la URL debe estar incluido en los detalles');
      err.statusCode = 400;
      err.code = 'ASSET_NOT_IN_DETAILS';
      throw err;
    }
    return DevolucionesService.create(payload, userId);
  }
}

module.exports = ActivosService;
