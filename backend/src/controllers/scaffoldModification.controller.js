const ScaffoldModificationService = require('../services/scaffoldModification.service');
const { logger } = require('../lib/logger');

class ScaffoldModificationController {
  /**
   * Crear nueva modificación
   * POST /api/scaffolds/:id/modifications
   */
  static async create(req, res) {
    try {
      const scaffoldId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const data = req.body;

      const modification = await ScaffoldModificationService.create(scaffoldId, userId, data);

      res.status(201).json({
        success: true,
        message: modification.approval_status === 'approved' 
          ? 'Modificación agregada y aprobada automáticamente'
          : 'Modificación creada, pendiente de aprobación admin',
        data: modification
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.create:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al crear modificación'
      });
    }
  }

  /**
   * Obtener modificaciones de un andamio
   * GET /api/scaffolds/:id/modifications
   */
  static async getByScaffold(req, res) {
    try {
      const scaffoldId = parseInt(req.params.id, 10);
      const { status } = req.query;

      const filters = {};
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filters.approvalStatus = status;
      }

      const modifications = await ScaffoldModificationService.getByScaffoldId(scaffoldId, filters);

      res.json({
        success: true,
        data: modifications
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.getByScaffold:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener modificaciones'
      });
    }
  }

  /**
   * Obtener todas las modificaciones pendientes
   * GET /api/scaffold-modifications/pending
   */
  static async getAllPending(req, res) {
    try {
      const modifications = await ScaffoldModificationService.getAllPending();

      res.json({
        success: true,
        data: modifications
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.getAllPending:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener modificaciones pendientes'
      });
    }
  }

  /**
   * Aprobar modificación
   * PATCH /api/scaffold-modifications/:id/approve
   */
  static async approve(req, res) {
    try {
      const modificationId = parseInt(req.params.id, 10);
      const adminId = req.user.id;

      const modification = await ScaffoldModificationService.approve(modificationId, adminId);

      res.json({
        success: true,
        message: 'Modificación aprobada exitosamente',
        data: modification
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.approve:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al aprobar modificación'
      });
    }
  }

  /**
   * Rechazar modificación
   * PATCH /api/scaffold-modifications/:id/reject
   */
  static async reject(req, res) {
    try {
      const modificationId = parseInt(req.params.id, 10);
      const adminId = req.user.id;
      const { rejection_reason } = req.body;

      const modification = await ScaffoldModificationService.reject(modificationId, adminId, rejection_reason);

      res.json({
        success: true,
        message: 'Modificación rechazada',
        data: modification
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.reject:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al rechazar modificación'
      });
    }
  }

  /**
   * Eliminar modificación pendiente
   * DELETE /api/scaffold-modifications/:id
   */
  static async delete(req, res) {
    try {
      const modificationId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const userRole = req.user.role;

      const deleted = await ScaffoldModificationService.delete(modificationId, userId, userRole);

      res.json({
        success: true,
        message: 'Modificación eliminada',
        data: deleted
      });
    } catch (error) {
      logger.error('Error in ScaffoldModificationController.delete:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error al eliminar modificación'
      });
    }
  }
}

module.exports = ScaffoldModificationController;
