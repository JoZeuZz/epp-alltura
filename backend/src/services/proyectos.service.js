const ProyectoModel = require('../models/proyecto');

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateDates = (data, current = null) => {
  const fechaInicio = data.fecha_inicio ?? current?.fecha_inicio ?? null;
  const fechaFin = data.fecha_fin ?? current?.fecha_fin ?? null;

  if (fechaInicio && fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (Number.isFinite(inicio.getTime()) && Number.isFinite(fin.getTime()) && fin < inicio) {
      throw buildError('fecha_fin no puede ser anterior a fecha_inicio', 400);
    }
  }
};

class ProyectosService {
  static async list(filters = {}) {
    return ProyectoModel.findAll(filters);
  }

  static async getById(id) {
    const proyecto = await ProyectoModel.findById(id);
    if (!proyecto) throw buildError('Proyecto no encontrado', 404);
    return proyecto;
  }

  static async create(data) {
    validateDates(data);
    return ProyectoModel.create(data);
  }

  static async update(id, data) {
    const current = await ProyectoModel.findById(id);
    if (!current) throw buildError('Proyecto no encontrado', 404);
    validateDates(data, current);
    const updated = await ProyectoModel.update(id, data);
    if (!updated) throw buildError('Proyecto no encontrado', 404);
    return updated;
  }

  static async remove(id) {
    const existing = await ProyectoModel.findById(id);
    if (!existing) throw buildError('Proyecto no encontrado', 404);
    return ProyectoModel.update(id, { estado: 'inactivo' });
  }
}

module.exports = ProyectosService;
