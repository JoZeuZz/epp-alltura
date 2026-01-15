const ClientNotesService = require('../services/clientNotes.service');
const { logger } = require('../lib/logger');

/**
 * Controlador de Notas de Clientes
 * Capa de Controlador - Manejo de Requests/Responses HTTP
 */
class ClientNotesController {
  /**
   * Crear una nueva nota de cliente
   * POST /api/client-notes
   */
  static async createNote(req, res, next) {
    try {
      const { target_type, scaffold_id, project_id, note_text } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Validar que solo clientes pueden crear notas
      if (userRole !== 'client') {
        return res.status(403).json({
          error: 'Solo los clientes pueden crear notas'
        });
      }

      const note = await ClientNotesService.createNote(
        { target_type, scaffold_id, project_id, note_text },
        userId
      );

      res.status(201).json({
        message: 'Nota creada exitosamente',
        data: note
      });
    } catch (error) {
      logger.error('Error in createNote controller', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Obtener notas de un andamio
   * GET /api/scaffolds/:scaffoldId/notes
   */
  static async getNotesByScaffold(req, res, next) {
    try {
      const { scaffoldId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const notes = await ClientNotesService.getNotesByScaffold(
        parseInt(scaffoldId, 10),
        userId,
        userRole
      );

      res.json({
        data: notes
      });
    } catch (error) {
      logger.error('Error in getNotesByScaffold controller', {
        error: error.message,
        scaffoldId: req.params.scaffoldId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Obtener notas de un proyecto
   * GET /api/projects/:projectId/notes
   */
  static async getNotesByProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const notes = await ClientNotesService.getNotesByProject(
        parseInt(projectId, 10),
        userId,
        userRole
      );

      res.json({
        data: notes
      });
    } catch (error) {
      logger.error('Error in getNotesByProject controller', {
        error: error.message,
        projectId: req.params.projectId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Obtener notas del usuario autenticado
   * GET /api/client-notes/my-notes
   */
  static async getMyNotes(req, res, next) {
    try {
      const userId = req.user.id;
      const { unresolved_only } = req.query;

      const options = {
        unresolvedOnly: unresolved_only === 'true'
      };

      const notes = await ClientNotesService.getNotesByUser(userId, options);

      res.json({
        data: notes
      });
    } catch (error) {
      logger.error('Error in getMyNotes controller', {
        error: error.message,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Obtener notas no resueltas de un proyecto
   * GET /api/projects/:projectId/notes/unresolved
   */
  static async getUnresolvedNotes(req, res, next) {
    try {
      const { projectId } = req.params;
      const userRole = req.user.role;

      // Solo supervisores y admins pueden ver notas no resueltas de un proyecto
      if (userRole !== 'supervisor' && userRole !== 'admin') {
        return res.status(403).json({
          error: 'No tiene permisos para ver notas no resueltas'
        });
      }

      const notes = await ClientNotesService.getUnresolvedByProject(
        parseInt(projectId, 10)
      );

      res.json({
        data: notes
      });
    } catch (error) {
      logger.error('Error in getUnresolvedNotes controller', {
        error: error.message,
        projectId: req.params.projectId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Actualizar una nota
   * PUT /api/client-notes/:noteId
   */
  static async updateNote(req, res, next) {
    try {
      const { noteId } = req.params;
      const { note_text } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const updatedNote = await ClientNotesService.updateNote(
        parseInt(noteId, 10),
        note_text,
        userId,
        userRole
      );

      res.json({
        message: 'Nota actualizada exitosamente',
        data: updatedNote
      });
    } catch (error) {
      logger.error('Error in updateNote controller', {
        error: error.message,
        noteId: req.params.noteId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Resolver una nota
   * PUT /api/client-notes/:noteId/resolve
   */
  static async resolveNote(req, res, next) {
    try {
      const { noteId } = req.params;
      const { resolution_notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const resolvedNote = await ClientNotesService.resolveNote(
        parseInt(noteId, 10),
        userId,
        userRole,
        resolution_notes
      );

      res.json({
        message: 'Nota marcada como resuelta',
        data: resolvedNote
      });
    } catch (error) {
      logger.error('Error in resolveNote controller', {
        error: error.message,
        noteId: req.params.noteId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Reabrir una nota
   * PUT /api/client-notes/:noteId/reopen
   */
  static async reopenNote(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const reopenedNote = await ClientNotesService.reopenNote(
        parseInt(noteId, 10),
        userId,
        userRole
      );

      res.json({
        message: 'Nota reabierta exitosamente',
        data: reopenedNote
      });
    } catch (error) {
      logger.error('Error in reopenNote controller', {
        error: error.message,
        noteId: req.params.noteId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Eliminar una nota (solo admin)
   * DELETE /api/client-notes/:noteId
   */
  static async deleteNote(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const deleted = await ClientNotesService.deleteNote(
        parseInt(noteId, 10),
        userId,
        userRole
      );

      if (!deleted) {
        return res.status(404).json({
          error: 'Nota no encontrada'
        });
      }

      res.json({
        message: 'Nota eliminada exitosamente'
      });
    } catch (error) {
      logger.error('Error in deleteNote controller', {
        error: error.message,
        noteId: req.params.noteId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Obtener estadísticas de notas de un proyecto
   * GET /api/projects/:projectId/notes/stats
   */
  static async getStats(req, res, next) {
    try {
      const { projectId } = req.params;
      const userRole = req.user.role;

      // Solo supervisores y admins pueden ver estadísticas
      if (userRole !== 'supervisor' && userRole !== 'admin') {
        return res.status(403).json({
          error: 'No tiene permisos para ver estadísticas'
        });
      }

      const stats = await ClientNotesService.getStatsByProject(
        parseInt(projectId, 10)
      );

      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Error in getStats controller', {
        error: error.message,
        projectId: req.params.projectId,
        userId: req.user?.id
      });
      next(error);
    }
  }
}

module.exports = ClientNotesController;
