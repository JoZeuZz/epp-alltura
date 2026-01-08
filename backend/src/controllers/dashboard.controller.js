const DashboardService = require('../services/dashboard.service');
const { logger } = require('../lib/logger');

/**
 * DashboardController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Extraer datos del request
 * - Llamar a la capa de servicio
 * - Formatear y enviar respuestas HTTP
 * - Gestionar errores HTTP
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni consultas SQL
 */
class DashboardController {
  /**
   * GET /api/dashboard/summary
   * Obtener resumen completo del dashboard (admin)
   */
  static async getSummary(req, res, _next) {
    try {
      const summary = await DashboardService.getDashboardSummary();

      return res.status(200).json(summary);
    } catch (error) {
      logger.error('Error fetching dashboard summary:', error);
      return res.status(500).json({ 
        error: 'Server Error',
        message: 'Error al obtener el resumen del dashboard' 
      });
    }
  }

  /**
   * GET /api/dashboard/cubic-meters
   * Obtener estadísticas detalladas de metros cúbicos (admin)
   */
  static async getCubicMetersStats(req, res, _next) {
    try {
      const stats = await DashboardService.getCubicMetersDetailedStats();

      return res.status(200).json(stats);
    } catch (error) {
      logger.error('Error fetching cubic meters stats:', error);
      return res.status(500).json({ 
        error: 'Server Error',
        message: 'Error al obtener estadísticas de metros cúbicos' 
      });
    }
  }
}

module.exports = DashboardController;
