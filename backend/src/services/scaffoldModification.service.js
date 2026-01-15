const ScaffoldModification = require('../models/scaffoldModification');
const Scaffold = require('../models/scaffold');
const Project = require('../models/project');
const NotificationService = require('./notification.service');
const { logger } = require('../lib/logger');

class ScaffoldModificationService {
  /**
   * Calcular metros cúbicos de una modificación
   */
  static calculateCubicMeters(height, width, length) {
    return parseFloat(height) * parseFloat(width) * parseFloat(length);
  }

  /**
   * Crear nueva modificación con validaciones
   */
  static async create(scaffoldId, userId, data) {
    try {
      // 1. Validar que el andamio existe
      const scaffold = await Scaffold.getById(scaffoldId);
      if (!scaffold) {
        throw new Error('Andamio no encontrado');
      }

      // 2. Validar que el andamio está en estado "assembled"
      if (scaffold.assembly_status !== 'assembled') {
        throw new Error('Solo se pueden agregar modificaciones a andamios completamente armados');
      }

      // 3. Validar permisos del usuario
      const project = await Project.getById(scaffold.project_id);
      await this.validateUserPermissions(userId, scaffold, project);

      // 4. Validar límite de 5 modificaciones (aprobadas + pendientes)
      const count = await ScaffoldModification.countByScaffoldId(scaffoldId, ['approved', 'pending']);
      if (count >= 5) {
        throw new Error('Este andamio ya tiene el máximo de 5 modificaciones permitidas');
      }

      // 5. Calcular metros cúbicos de la modificación
      const cubicMeters = this.calculateCubicMeters(data.height, data.width, data.length);

      // 6. Determinar si requiere aprobación
      const originalCubicMeters = parseFloat(scaffold.cubic_meters);
      const requiresApproval = cubicMeters > originalCubicMeters;
      const approvalStatus = requiresApproval ? 'pending' : 'approved';

      // 7. Crear la modificación
      const modification = await ScaffoldModification.create({
        scaffoldId,
        createdBy: userId,
        height: data.height,
        width: data.width,
        length: data.length,
        cubicMeters,
        reason: data.reason || null,
        approvalStatus
      });

      // 8. Crear notificaciones
      await this.createNotificationsForNewModification(modification, scaffold, project, requiresApproval);

      logger.info(`Scaffold modification created: ${modification.id} (Status: ${approvalStatus})`);
      return modification;
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.create:', error);
      throw error;
    }
  }

  /**
   * Validar permisos del usuario para agregar modificaciones
   */
  static async validateUserPermissions(_userId, _scaffold, _project) {
    // Admin tiene permisos totales
    // Supervisor puede modificar si:
    // - Es el creador del andamio
    // - Está asignado al proyecto
    // Esta lógica debe coincidir con ScaffoldService.validateUserPermissions

    // Por ahora, asumimos que si llegó aquí pasó el middleware isAdminOrSupervisor
    return true;
  }

  /**
   * Crear notificaciones para nueva modificación
   */
  static async createNotificationsForNewModification(modification, scaffold, project, requiresApproval) {
    try {
      const statusText = requiresApproval ? 'Pendiente de aprobación admin' : 'Aprobado automáticamente';
      const cubicMeters = parseFloat(modification.cubic_meters);

      // Notificar al cliente del proyecto
      if (project.client_id) {
        await NotificationService.createInAppNotification({
          user_id: project.client_id,
          type: 'scaffold_modification_added',
          title: '➕ Metros cúbicos adicionales agregados',
          message: `Se agregaron ${cubicMeters.toFixed(2)} m³ al andamio #${scaffold.scaffold_number} (${parseFloat(modification.height).toFixed(1)}m × ${parseFloat(modification.width).toFixed(1)}m × ${parseFloat(modification.length).toFixed(1)}m). Estado: ${statusText}.`,
          metadata: {
            scaffold_id: scaffold.id,
            modification_id: modification.id,
            cubic_meters: cubicMeters,
            approval_status: modification.approval_status,
            project_id: project.id
          },
          link: `/client/projects/${project.id}`
        });
      }

      // Si requiere aprobación, notificar a todos los admins
      if (requiresApproval) {
        // Obtener todos los admins (esto requeriría un método en User model)
        // Por ahora, creamos la notificación en el approve/reject
        logger.info(`Modification ${modification.id} requires admin approval`);
      }
    } catch (error) {
      logger.error('Error creating notifications for modification:', error);
      // No lanzar error, las notificaciones son secundarias
    }
  }

  /**
   * Aprobar modificación
   */
  static async approve(modificationId, adminId) {
    try {
      // 1. Obtener la modificación
      const modification = await ScaffoldModification.getById(modificationId);
      if (!modification) {
        throw new Error('Modificación no encontrada');
      }

      // 2. Validar que está pendiente
      if (modification.approval_status !== 'pending') {
        throw new Error('Solo se pueden aprobar modificaciones pendientes');
      }

      // 3. Aprobar
      const approved = await ScaffoldModification.approve(modificationId, adminId);

      // 4. Obtener datos para notificaciones
      const scaffold = await Scaffold.getById(modification.scaffold_id);
      const project = await Project.getById(scaffold.project_id);

      // 5. Notificar al supervisor que creó la modificación
      await NotificationService.createInAppNotification({
        userId: modification.created_by,
        type: 'modification_approved',
        title: '✅ Modificación aprobada',
        message: `Tu solicitud de ${parseFloat(modification.cubic_meters).toFixed(2)} m³ adicionales para el andamio #${scaffold.scaffold_number} ha sido aprobada.`,
        metadata: {
          modification_id: modificationId,
          scaffold_id: scaffold.id,
          project_id: project.id
        },
        link: `/supervisor/projects/${project.id}`
      });

      // 6. Notificar al cliente
      if (project.client_id) {
        await NotificationService.createInAppNotification({
          userId: project.client_id,
          type: 'scaffold_modification_added',
          title: '➕ Modificación de andamio aprobada',
          message: `Se aprobaron ${parseFloat(modification.cubic_meters).toFixed(2)} m³ adicionales para el andamio #${scaffold.scaffold_number}.`,
          metadata: {
            modification_id: modificationId,
            scaffold_id: scaffold.id,
            project_id: project.id
          },
          link: `/client/projects/${project.id}`
        });
      }

      logger.info(`Modification ${modificationId} approved by admin ${adminId}`);
      return approved;
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.approve:', error);
      throw error;
    }
  }

  /**
   * Rechazar modificación
   */
  static async reject(modificationId, adminId, rejectionReason) {
    try {
      // 1. Obtener la modificación
      const modification = await ScaffoldModification.getById(modificationId);
      if (!modification) {
        throw new Error('Modificación no encontrada');
      }

      // 2. Validar que está pendiente
      if (modification.approval_status !== 'pending') {
        throw new Error('Solo se pueden rechazar modificaciones pendientes');
      }

      // 3. Rechazar
      const rejected = await ScaffoldModification.reject(modificationId, adminId, rejectionReason);

      // 4. Obtener datos para notificaciones
      const scaffold = await Scaffold.getById(modification.scaffold_id);
      const project = await Project.getById(scaffold.project_id);

      // 5. Notificar al supervisor que creó la modificación
      await NotificationService.createInAppNotification({
        userId: modification.created_by,
        type: 'modification_rejected',
        title: '❌ Modificación rechazada',
        message: `Tu solicitud de ${parseFloat(modification.cubic_meters).toFixed(2)} m³ adicionales para el andamio #${scaffold.scaffold_number} fue rechazada. Motivo: ${rejectionReason || 'No especificado'}`,
        metadata: {
          modification_id: modificationId,
          scaffold_id: scaffold.id,
          project_id: project.id,
          rejection_reason: rejectionReason
        },
        link: `/supervisor/projects/${project.id}`
      });

      logger.info(`Modification ${modificationId} rejected by admin ${adminId}`);
      return rejected;
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.reject:', error);
      throw error;
    }
  }

  /**
   * Obtener modificaciones de un andamio
   */
  static async getByScaffoldId(scaffoldId, filters = {}) {
    try {
      return await ScaffoldModification.getByScaffoldId(scaffoldId, filters);
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.getByScaffoldId:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las modificaciones pendientes
   */
  static async getAllPending() {
    try {
      return await ScaffoldModification.getAllPending();
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.getAllPending:', error);
      throw error;
    }
  }

  /**
   * Eliminar modificación (solo si está pendiente y el usuario es el creador o admin)
   */
  static async delete(modificationId, userId, userRole) {
    try {
      const modification = await ScaffoldModification.getById(modificationId);
      if (!modification) {
        throw new Error('Modificación no encontrada');
      }

      // Solo se pueden eliminar modificaciones pendientes
      if (modification.approval_status !== 'pending') {
        throw new Error('Solo se pueden eliminar modificaciones pendientes');
      }

      // Admin puede eliminar cualquiera, supervisor solo las suyas
      if (userRole !== 'admin' && modification.created_by !== userId) {
        throw new Error('No tienes permisos para eliminar esta modificación');
      }

      const deleted = await ScaffoldModification.delete(modificationId);
      if (!deleted) {
        throw new Error('No se pudo eliminar la modificación');
      }

      logger.info(`Modification ${modificationId} deleted by user ${userId}`);
      return deleted;
    } catch (error) {
      logger.error('Error in ScaffoldModificationService.delete:', error);
      throw error;
    }
  }
}

module.exports = ScaffoldModificationService;
