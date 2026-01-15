const ClientNote = require('../models/clientNote');
const Notification = require('../models/notification');
const Scaffold = require('../models/scaffold');
const Project = require('../models/project');
const { logger } = require('../lib/logger');

/**
 * Servicio ClientNotes
 * Gestiona la lógica de negocio para notas de clientes
 */
class ClientNotesService {
  /**
   * Crear una nueva nota de cliente
   * @param {Object} noteData - Datos de la nota
   * @param {number} userId - ID del usuario que crea la nota
   * @returns {Promise<Object>} Nota creada
   */
  static async createNote(noteData, userId) {
    try {
      // Validar permisos: solo clientes pueden crear notas
      // Esta validación debe hacerse en el controller con el rol del usuario
      
      // Validar que el recurso existe
      if (noteData.target_type === 'scaffold') {
        const scaffold = await Scaffold.getById(noteData.scaffold_id);
        if (!scaffold) {
          throw new Error('Andamio no encontrado');
        }
        
        // Validar que el cliente tiene acceso al andamio (debe ser del mismo proyecto)
        // Esta validación adicional se puede hacer si es necesario
      } else if (noteData.target_type === 'project') {
        const project = await Project.getById(noteData.project_id);
        if (!project) {
          throw new Error('Proyecto no encontrado');
        }
      }
      
      // Crear la nota
      const note = await ClientNote.create({
        ...noteData,
        user_id: userId
      });
      
      logger.info('Client note created', {
        noteId: note.id,
        userId,
        targetType: noteData.target_type,
        targetId: noteData.scaffold_id || noteData.project_id
      });
      
      // Crear notificaciones para supervisores y admins del proyecto
      await this.notifySupervisorsAndAdmins(note);
      
      return note;
    } catch (error) {
      logger.error('Error creating client note', { error: error.message, userId, noteData });
      throw error;
    }
  }

  /**
   * Obtener notas de un andamio
   * @param {number} scaffoldId - ID del andamio
   * @param {number} userId - ID del usuario solicitante
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Array>} Notas del andamio
   */
  static async getNotesByScaffold(scaffoldId, userId, userRole) {
    try {
      // Validar que el andamio existe
      const scaffold = await Scaffold.getById(scaffoldId);
      if (!scaffold) {
        throw new Error('Andamio no encontrado');
      }
      
      // Validar permisos de acceso
      if (userRole === 'client') {
        // Clientes solo pueden ver sus propias notas
        const allNotes = await ClientNote.getByScaffold(scaffoldId);
        return allNotes.filter(note => note.user_id === userId);
      }
      
      // Supervisores y admins pueden ver todas las notas
      const notes = await ClientNote.getByScaffold(scaffoldId);
      return notes;
    } catch (error) {
      logger.error('Error getting scaffold notes', { error: error.message, scaffoldId, userId });
      throw error;
    }
  }

  /**
   * Obtener notas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {number} userId - ID del usuario solicitante
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Array>} Notas del proyecto
   */
  static async getNotesByProject(projectId, userId, userRole) {
    try {
      // Validar que el proyecto existe
      const project = await Project.getById(projectId);
      if (!project) {
        throw new Error('Proyecto no encontrado');
      }
      
      // Validar permisos de acceso
      if (userRole === 'client') {
        // Clientes solo pueden ver sus propias notas
        const allNotes = await ClientNote.getByProject(projectId);
        return allNotes.filter(note => note.user_id === userId);
      }
      
      // Supervisores y admins pueden ver todas las notas
      const notes = await ClientNote.getByProject(projectId);
      return notes;
    } catch (error) {
      logger.error('Error getting project notes', { error: error.message, projectId, userId });
      throw error;
    }
  }

  /**
   * Obtener notas de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Notas del usuario
   */
  static async getNotesByUser(userId, options = {}) {
    try {
      const notes = await ClientNote.getByUser(userId, options);
      return notes;
    } catch (error) {
      logger.error('Error getting user notes', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Actualizar una nota
   * @param {number} noteId - ID de la nota
   * @param {string} noteText - Nuevo texto
   * @param {number} userId - ID del usuario solicitante
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Object>} Nota actualizada
   */
  static async updateNote(noteId, noteText, userId, userRole) {
    try {
      const note = await ClientNote.getById(noteId);
      if (!note) {
        throw new Error('Nota no encontrada');
      }
      
      // Solo el autor puede editar la nota (y solo si es cliente)
      if (userRole !== 'client' || note.user_id !== userId) {
        throw new Error('No tiene permisos para editar esta nota');
      }
      
      // No se pueden editar notas resueltas
      if (note.is_resolved) {
        throw new Error('No se pueden editar notas resueltas');
      }
      
      const updatedNote = await ClientNote.update(noteId, noteText);
      
      logger.info('Client note updated', { noteId, userId });
      
      return updatedNote;
    } catch (error) {
      logger.error('Error updating client note', { error: error.message, noteId, userId });
      throw error;
    }
  }

  /**
   * Resolver una nota
   * @param {number} noteId - ID de la nota
   * @param {number} userId - ID del usuario que resuelve
   * @param {string} userRole - Rol del usuario
   * @param {string} resolutionNotes - Notas de resolución
   * @returns {Promise<Object>} Nota resuelta
   */
  static async resolveNote(noteId, userId, userRole, resolutionNotes = null) {
    try {
      const note = await ClientNote.getById(noteId);
      if (!note) {
        throw new Error('Nota no encontrada');
      }
      
      // Solo supervisores y admins pueden resolver notas
      if (userRole !== 'supervisor' && userRole !== 'admin') {
        throw new Error('No tiene permisos para resolver notas');
      }
      
      // No resolver notas ya resueltas
      if (note.is_resolved) {
        throw new Error('La nota ya está resuelta');
      }
      
      const resolvedNote = await ClientNote.markAsResolved(noteId, userId, resolutionNotes);
      
      logger.info('Client note resolved', { noteId, resolvedBy: userId, userRole });
      
      // Notificar al cliente que creó la nota
      await this.notifyNoteResolution(resolvedNote);
      
      return resolvedNote;
    } catch (error) {
      logger.error('Error resolving client note', { error: error.message, noteId, userId });
      throw error;
    }
  }

  /**
   * Reabrir una nota
   * @param {number} noteId - ID de la nota
   * @param {number} userId - ID del usuario
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Object>} Nota reabierta
   */
  static async reopenNote(noteId, userId, userRole) {
    try {
      const note = await ClientNote.getById(noteId);
      if (!note) {
        throw new Error('Nota no encontrada');
      }
      
      // Solo el autor (cliente) puede reabrir su nota
      if (userRole !== 'client' || note.user_id !== userId) {
        throw new Error('No tiene permisos para reabrir esta nota');
      }
      
      if (!note.is_resolved) {
        throw new Error('La nota no está resuelta');
      }
      
      const reopenedNote = await ClientNote.reopen(noteId);
      
      logger.info('Client note reopened', { noteId, userId });
      
      // Notificar nuevamente a supervisores/admins
      await this.notifySupervisorsAndAdmins(reopenedNote);
      
      return reopenedNote;
    } catch (error) {
      logger.error('Error reopening client note', { error: error.message, noteId, userId });
      throw error;
    }
  }

  /**
   * Eliminar una nota (solo admin)
   * @param {number} noteId - ID de la nota
   * @param {number} userId - ID del usuario
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<boolean>} true si se eliminó
   */
  static async deleteNote(noteId, userId, userRole) {
    try {
      // Solo admins pueden eliminar notas
      if (userRole !== 'admin') {
        throw new Error('No tiene permisos para eliminar notas');
      }
      
      const deleted = await ClientNote.delete(noteId);
      
      if (deleted) {
        logger.info('Client note deleted', { noteId, deletedBy: userId });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting client note', { error: error.message, noteId, userId });
      throw error;
    }
  }

  /**
   * Obtener notas no resueltas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} Notas no resueltas
   */
  static async getUnresolvedByProject(projectId) {
    try {
      const notes = await ClientNote.getUnresolvedByProject(projectId);
      return notes;
    } catch (error) {
      logger.error('Error getting unresolved notes', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Object>} Estadísticas
   */
  static async getStatsByProject(projectId) {
    try {
      const stats = await ClientNote.getStatsByProject(projectId);
      return stats;
    } catch (error) {
      logger.error('Error getting note stats', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Notificar a supervisores y admins sobre una nueva nota
   * @param {Object} note - Nota creada
   * @private
   */
  static async notifySupervisorsAndAdmins(note) {
    try {
      // Obtener el proyecto asociado
      let projectId;
      let resourceName;
      
      if (note.target_type === 'scaffold') {
        const scaffold = await Scaffold.getById(note.scaffold_id);
        projectId = scaffold.project_id;
        resourceName = `Andamio #${scaffold.scaffold_number}`;
      } else {
        projectId = note.project_id;
        const project = await Project.getById(note.project_id);
        resourceName = project.name;
      }
      
      // Obtener supervisores y admins del proyecto
      // Por ahora, simplificamos obteniendo todos los supervisores/admins
      // En producción, deberías filtrar por proyecto
      const db = require('../db');
      const result = await db.query(
        `SELECT id FROM users WHERE role IN ('supervisor', 'admin') AND id != $1`,
        [note.user_id]
      );
      
      const supervisorIds = result.rows.map(row => row.id);
      
      // Crear notificaciones en batch
      const notifications = supervisorIds.map(supervisorId => ({
        user_id: supervisorId,
        type: 'new_client_note',
        title: 'Nueva nota de cliente',
        message: `Nueva nota en ${resourceName}`,
        metadata: {
          note_id: note.id,
          target_type: note.target_type,
          scaffold_id: note.scaffold_id,
          project_id: projectId,
          created_by: note.user_id
        },
        link: note.target_type === 'scaffold' 
          ? `/scaffolds/${note.scaffold_id}`
          : `/projects/${projectId}`
      }));
      
      if (notifications.length > 0) {
        await Notification.createBatch(notifications);
        logger.info('Supervisors and admins notified about new client note', {
          noteId: note.id,
          notifiedCount: notifications.length
        });
      }
    } catch (error) {
      // No fallar si falla la notificación, solo loguear
      logger.error('Error notifying supervisors about client note', {
        error: error.message,
        noteId: note.id
      });
    }
  }

  /**
   * Notificar al cliente sobre la resolución de su nota
   * @param {Object} note - Nota resuelta
   * @private
   */
  static async notifyNoteResolution(note) {
    try {
      let resourceName;
      let projectId = note.project_id;
      
      if (note.target_type === 'scaffold') {
        const scaffold = await Scaffold.getById(note.scaffold_id);
        resourceName = `Andamio #${scaffold.scaffold_number}`;
        // Obtener el project_id del scaffold si no está en la nota
        projectId = scaffold.project_id;
      } else {
        const project = await Project.getById(note.project_id);
        resourceName = project.name;
      }
      
      await Notification.create({
        user_id: note.user_id,
        type: 'note_resolved',
        title: 'Nota resuelta',
        message: `Tu nota en ${resourceName} ha sido marcada como resuelta`,
        metadata: {
          note_id: note.id,
          target_type: note.target_type,
          scaffold_id: note.scaffold_id,
          project_id: projectId,
          resolved_by: note.resolved_by
        },
        link: note.target_type === 'scaffold' 
          ? `/scaffolds/${note.scaffold_id}`
          : `/projects/${projectId}`
      });
      
      logger.info('Client notified about note resolution', {
        noteId: note.id,
        clientId: note.user_id
      });
    } catch (error) {
      // No fallar si falla la notificación, solo loguear
      logger.error('Error notifying client about note resolution', {
        error: error.message,
        noteId: note.id
      });
    }
  }
}

module.exports = ClientNotesService;
