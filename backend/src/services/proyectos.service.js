const ProyectoModel = require('../models/proyecto');

const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { logger } = require('../lib/logger');
const db = require('../db');

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
    const result = await ProyectoModel.create(data);
    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: result.id,
      accion: 'crear',
      usuarioId: null,
      diff: { nombre: result.nombre },
    }).catch((err) => logger.warn('Audit proyecto crear failed', { id: result.id, error: err.message }));
    return result;
  }

  static async update(id, data) {
    const current = await ProyectoModel.findById(id);
    if (!current) throw buildError('Proyecto no encontrado', 404);
    validateDates(data, current);
    const updated = await ProyectoModel.update(id, data);
    if (!updated) throw buildError('Proyecto no encontrado', 404);
    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: id,
      accion: 'actualizar',
      usuarioId: null,
      diff: data,
    }).catch((err) => logger.warn('Audit proyecto actualizar failed', { id, error: err.message }));
    return updated;
  }

  static async remove(id) {
    const existing = await ProyectoModel.findById(id);
    if (!existing) throw buildError('Proyecto no encontrado', 404);
    const result = await ProyectoModel.update(id, { estado: 'inactivo' });
    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: id,
      accion: 'eliminar',
      usuarioId: null,
      diff: { estado: 'inactivo' },
    }).catch((err) => logger.warn('Audit proyecto eliminar failed', { id, error: err.message }));
    return result;
  }
}

module.exports = ProyectosService;
