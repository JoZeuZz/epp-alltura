const ProyectoModel = require('../models/proyecto');

const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { logger } = require('../lib/logger');
const db = require('../db');
const NotificationService = require('./notification.service');

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

  static async create(data, userId = null) {
    validateDates(data);
    const result = await ProyectoModel.create(data);
    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: result.id,
      accion: 'crear',
      usuarioId: userId,
      diff: { nombre: result.nombre },
    }).catch((err) => logger.warn('Audit proyecto crear failed', { id: result.id, error: err.message }));
    return result;
  }

  static async _getAdminSupervisorIds() {
    const { rows } = await db.query(`
      SELECT DISTINCT u.id
      FROM usuario u
      JOIN usuario_rol ur ON ur.usuario_id = u.id
      JOIN rol r ON r.id = ur.rol_id
      WHERE r.nombre IN ('admin', 'supervisor')
        AND u.estado = 'activo'
    `);
    return rows.map((r) => r.id);
  }

  static async update(id, data, userId = null) {
    const current = await ProyectoModel.findById(id);
    if (!current) throw buildError('Proyecto no encontrado', 404);
    validateDates(data, current);
    const updated = await ProyectoModel.update(id, data);
    if (!updated) throw buildError('Proyecto no encontrado', 404);

    const warnings = [];

    if (data.estado === 'finalizado' && current.estado !== 'finalizado') {
      const { rows: [{ count }] } = await db.query(
        'SELECT COUNT(*)::int AS count FROM articulo WHERE proyecto_actual_id = $1',
        [id]
      );
      const pendingCount = Number(count);
      if (pendingCount > 0) {
        warnings.push({ code: 'articulos_pendientes', count: pendingCount });
        const userIds = await ProyectosService._getAdminSupervisorIds();
        if (userIds.length > 0) {
          await NotificationService.createBatchInAppNotifications(
            userIds.map((userId) => ({
              user_id: userId,
              type: 'proyecto_finalizado_con_articulos',
              title: `Proyecto "${updated.nombre}" finalizado con artículos pendientes`,
              message: `${pendingCount} artículo(s) asignados sin devolver.`,
              metadata: {
                proyecto_id: id,
                proyecto_nombre: updated.nombre,
                articulos_pendientes: pendingCount,
              },
              link: `/ubicacion/proyectos/${id}`,
            }))
          ).catch((err) => logger.warn('Notif proyecto finalizado failed', { id, error: err.message }));
        }
      }
    }

    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: id,
      accion: 'actualizar',
      usuarioId: userId,
      diff: data,
    }).catch((err) => logger.warn('Audit proyecto actualizar failed', { id, error: err.message }));

    return { data: updated, warnings };
  }

  static async remove(id, userId = null) {
    const existing = await ProyectoModel.findById(id);
    if (!existing) throw buildError('Proyecto no encontrado', 404);

    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*)::int AS count FROM articulo WHERE proyecto_actual_id = $1',
      [id]
    );
    if (Number(count) > 0) {
      throw buildError(
        `El proyecto tiene ${count} artículo(s) asignados. Devuélvelos o trasládalos antes de desactivar.`,
        409,
        'PROYECTO_HAS_ARTICULOS'
      );
    }

    const result = await ProyectoModel.update(id, { estado: 'inactivo' });
    await writeAuditEvent({
      entidadTipo: 'proyecto',
      entidadId: id,
      accion: 'eliminar',
      usuarioId: userId,
      diff: { estado: 'inactivo' },
    }).catch((err) => logger.warn('Audit proyecto eliminar failed', { id, error: err.message }));
    return result;
  }
}

module.exports = ProyectosService;
