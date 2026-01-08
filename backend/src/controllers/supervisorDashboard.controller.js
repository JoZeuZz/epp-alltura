const SupervisorDashboardService = require('../services/supervisorDashboard.service');
const { logger } = require('../lib/logger');

/**
 * SupervisorDashboardController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Extraer userId del request
 * - Llamar a la capa de servicio
 * - Formatear respuestas HTTP
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni consultas SQL
 */
class SupervisorDashboardController {
  /**
   * GET /api/supervisor-dashboard/summary
   * Obtener resumen del dashboard para el supervisor autenticado
   */
  static async getSummary(req, res, _next) {
    try {
      const userId = req.user.id;

      const summary = await SupervisorDashboardService.getSupervisorSummary(userId);

      return res.status(200).json(summary);
    } catch (error) {
      logger.error('Error fetching supervisor dashboard summary:', error);
      return res.status(500).json({ 
        error: 'Server Error',
        message: 'Error al obtener resumen del supervisor' 
      });
    }
  }
}

module.exports = SupervisorDashboardController;
