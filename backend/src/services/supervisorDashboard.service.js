const db = require('../db');
const { logger } = require('../lib/logger');

/**
 * SupervisorDashboardService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Consultas SQL filtradas por supervisor
 * - Métricas personalizadas por usuario
 * - Estadísticas de proyectos asignados
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class SupervisorDashboardService {
  /**
   * Obtener resumen del dashboard para un supervisor específico
   * @param {number} userId - ID del supervisor
   * @returns {Promise<object>} Métricas del supervisor
   */
  static async getSupervisorSummary(userId) {
    try {
      // Total de reportes del supervisor
      const totalReports = await this.getTotalReportsByUser(userId);

      // Reportes creados este mes
      const monthReports = await this.getMonthReportsByUser(userId);

      // Total de metros cúbicos gestionados
      const totalCubicMeters = await this.getTotalCubicMetersByUser(userId);

      // Proyectos activos asignados
      const activeProjects = await this.getActiveProjectsByUser(userId);

      return {
        totalReports,
        monthReports,
        totalCubicMeters,
        activeProjects,
      };
    } catch (error) {
      logger.error(`Error obteniendo resumen para supervisor ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener total de reportes (andamios) creados por un supervisor
   * @param {number} userId - ID del supervisor
   * @returns {Promise<number>} Total de reportes
   */
  static async getTotalReportsByUser(userId) {
    const query = 'SELECT COUNT(*) as total FROM scaffolds WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Obtener reportes creados este mes por un supervisor
   * @param {number} userId - ID del supervisor
   * @returns {Promise<number>} Reportes del mes actual
   */
  static async getMonthReportsByUser(userId) {
    const query = `
      SELECT COUNT(*) as total 
      FROM scaffolds 
      WHERE user_id = $1 
        AND assembly_created_at >= date_trunc('month', NOW())
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Obtener total de metros cúbicos gestionados por un supervisor
   * @param {number} userId - ID del supervisor
   * @returns {Promise<number>} Total de m³
   */
  static async getTotalCubicMetersByUser(userId) {
    const query = 'SELECT SUM(cubic_meters) as total FROM scaffolds WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return parseFloat(result.rows[0].total) || 0;
  }

  /**
   * Obtener cantidad de proyectos activos asignados a un supervisor
   * @param {number} userId - ID del supervisor
   * @returns {Promise<number>} Proyectos activos asignados
   */
  static async getActiveProjectsByUser(userId) {
    const query = `
      SELECT COUNT(DISTINCT p.id) as total 
      FROM projects p 
      JOIN project_users pu ON p.id = pu.project_id 
      WHERE pu.user_id = $1 AND p.status = 'active'
    `;
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].total, 10);
  }
}

module.exports = SupervisorDashboardService;
