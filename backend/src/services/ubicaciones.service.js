const UbicacionModel = require('../models/ubicacion');

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

class UbicacionesService {
  static async validateBusinessRules(data, current = null) {
    const effectiveTipo = data.tipo ?? current?.tipo;
    const effectiveSubtipo = data.ubicacion_subtipo ?? current?.ubicacion_subtipo ?? null;
    const effectivePlantaPadreId =
      data.planta_padre_id === undefined ? current?.planta_padre_id ?? null : data.planta_padre_id;
    const effectiveFechaInicio =
      data.fecha_inicio_operacion ?? current?.fecha_inicio_operacion ?? null;
    const effectiveFechaCierre =
      data.fecha_cierre_operacion ?? current?.fecha_cierre_operacion ?? null;

    if (effectiveTipo === 'bodega' && !effectiveSubtipo) {
      throw buildError('Las ubicaciones de tipo bodega requieren ubicacion_subtipo', 400);
    }

    if (effectiveTipo !== 'bodega' && effectiveSubtipo) {
      throw buildError('Solo las ubicaciones de tipo bodega pueden tener ubicacion_subtipo', 400);
    }

    if (effectivePlantaPadreId) {
      if (effectiveTipo !== 'bodega') {
        throw buildError('Solo las bodegas pueden vincularse a una planta padre', 400);
      }

      const plantaPadre = await UbicacionModel.findById(effectivePlantaPadreId);
      if (!plantaPadre) {
        throw buildError('La planta padre indicada no existe', 400);
      }

      if (plantaPadre.tipo !== 'planta') {
        throw buildError('planta_padre_id debe apuntar a una ubicación de tipo planta', 400);
      }

      if (plantaPadre.estado !== 'activo') {
        throw buildError('La planta padre debe estar activa', 400);
      }

      if (current?.id && plantaPadre.id === current.id) {
        throw buildError('Una ubicación no puede referenciarse a sí misma como planta padre', 400);
      }
    }

    if (effectiveFechaInicio && effectiveFechaCierre) {
      const inicio = new Date(effectiveFechaInicio);
      const cierre = new Date(effectiveFechaCierre);

      if (Number.isFinite(inicio.getTime()) && Number.isFinite(cierre.getTime()) && cierre < inicio) {
        throw buildError('fecha_cierre_operacion no puede ser anterior a fecha_inicio_operacion', 400);
      }
    }
  }

  static async list(filters = {}) {
    return UbicacionModel.findAll(filters);
  }

  static async getById(id) {
    const ubicacion = await UbicacionModel.findById(id);
    if (!ubicacion) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }
    return ubicacion;
  }

  static async create(data) {
    await this.validateBusinessRules(data);
    return UbicacionModel.create(data);
  }

  static async update(id, data) {
    const current = await UbicacionModel.findById(id);
    if (!current) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }

    await this.validateBusinessRules(data, current);

    const updated = await UbicacionModel.update(id, data);
    if (!updated) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }
    return updated;
  }

  static async remove(id) {
    const existing = await UbicacionModel.findById(id);
    if (!existing) {
      const error = new Error('Ubicacion not found');
      error.statusCode = 404;
      throw error;
    }

    return UbicacionModel.update(id, { estado: 'inactivo' });
  }
}

module.exports = UbicacionesService;
