const db = require('../db');
const { logger } = require('../lib/logger');

/**
 * DashboardService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Consultas SQL para estadísticas del dashboard
 * - Agregaciones y cálculos de métricas
 * - Formateo de datos para visualización
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class DashboardService {
  // ============================================
  // DASHBOARD SUMMARY (Resumen General)
  // ============================================

  /**
   * Obtener resumen completo del dashboard (admin)
   * @returns {Promise<object>} Métricas generales del sistema
   */
  static async getDashboardSummary() {
    try {
      // 1. Estadísticas de metros cúbicos por estado
      const cubicMetersStats = await this.getCubicMetersStats();

      // 2. Estadísticas de andamios por estado
      const scaffoldStats = await this.getScaffoldStats();

      // 3. Proyectos activos
      const activeProjects = await this.getActiveProjectsCount();

      // 4. Clientes activos
      const activeClients = await this.getActiveClientsCount();

      // 5. Andamios creados en las últimas 24 horas
      const recentScaffoldsCount = await this.getRecentScaffoldsCount();

      // 6. Últimos 5 andamios creados
      const recentScaffolds = await this.getRecentScaffolds();

      return {
        // Métricas de proyectos y clientes
        activeProjects,
        activeClients,

        // Métricas de metros cúbicos
        totalCubicMeters: parseFloat(cubicMetersStats.total_cubic_meters) || 0,
        assembledCubicMeters: parseFloat(cubicMetersStats.assembled_cubic_meters) || 0,
        disassembledCubicMeters: parseFloat(cubicMetersStats.disassembled_cubic_meters) || 0,
        inProgressCubicMeters: parseFloat(cubicMetersStats.in_progress_cubic_meters) || 0,

        // Métricas de andamios
        totalScaffolds: parseInt(scaffoldStats.total_scaffolds, 10) || 0,
        assembledScaffolds: parseInt(scaffoldStats.assembled_count, 10) || 0,
        disassembledScaffolds: parseInt(scaffoldStats.disassembled_count, 10) || 0,
        inProgressScaffolds: parseInt(scaffoldStats.in_progress_count, 10) || 0,
        greenCards: parseInt(scaffoldStats.green_cards_count, 10) || 0,
        redCards: parseInt(scaffoldStats.red_cards_count, 10) || 0,

        // Andamios recientes
        recentScaffoldsCount,
        recentScaffolds,
      };
    } catch (error) {
      logger.error('Error obteniendo resumen del dashboard:', error);
      throw error;
    }
  }

  // ============================================
  // MÉTRICAS DE METROS CÚBICOS
  // ============================================

  /**
   * Obtener estadísticas de metros cúbicos por estado
   * @returns {Promise<object>} Estadísticas de m³ agrupadas por estado
   */
  static async getCubicMetersStats() {
    const query = `
      SELECT 
        SUM(CASE WHEN assembly_status = 'assembled' THEN cubic_meters ELSE 0 END) as assembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'disassembled' THEN cubic_meters ELSE 0 END) as disassembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'in_progress' THEN cubic_meters ELSE 0 END) as in_progress_cubic_meters,
        SUM(cubic_meters) as total_cubic_meters
      FROM scaffolds
    `;

    const result = await db.query(query);
    return result.rows[0];
  }

  /**
   * Obtener estadísticas detalladas de metros cúbicos
   * @returns {Promise<object>} Estadísticas completas con conteos
   */
  static async getCubicMetersDetailedStats() {
    const query = `
      SELECT 
        SUM(CASE WHEN assembly_status = 'assembled' THEN cubic_meters ELSE 0 END) as assembled_cubic_meters,
        SUM(CASE WHEN assembly_status = 'disassembled' THEN cubic_meters ELSE 0 END) as disassembled_cubic_meters,
        SUM(cubic_meters) as total_cubic_meters,
        COUNT(*) FILTER (WHERE assembly_status = 'assembled') as assembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'disassembled') as disassembled_count,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE card_status = 'green') as green_cards_count,
        COUNT(*) FILTER (WHERE card_status = 'red') as red_cards_count
      FROM scaffolds
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    return {
      assembled_cubic_meters: parseFloat(stats.assembled_cubic_meters) || 0,
      disassembled_cubic_meters: parseFloat(stats.disassembled_cubic_meters) || 0,
      total_cubic_meters: parseFloat(stats.total_cubic_meters) || 0,
      assembled_count: parseInt(stats.assembled_count, 10) || 0,
      disassembled_count: parseInt(stats.disassembled_count, 10) || 0,
      total_count: parseInt(stats.total_count, 10) || 0,
      green_cards_count: parseInt(stats.green_cards_count, 10) || 0,
      red_cards_count: parseInt(stats.red_cards_count, 10) || 0,
    };
  }

  // ============================================
  // MÉTRICAS DE ANDAMIOS
  // ============================================

  /**
   * Obtener estadísticas de andamios por estado
   * @returns {Promise<object>} Conteos de andamios agrupados
   */
  static async getScaffoldStats() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE assembly_status = 'assembled') as assembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'disassembled') as disassembled_count,
        COUNT(*) FILTER (WHERE assembly_status = 'in_progress') as in_progress_count,
        COUNT(*) as total_scaffolds,
        COUNT(*) FILTER (WHERE card_status = 'green') as green_cards_count,
        COUNT(*) FILTER (WHERE card_status = 'red') as red_cards_count
      FROM scaffolds
    `;

    const result = await db.query(query);
    return result.rows[0];
  }

  // ============================================
  // MÉTRICAS DE PROYECTOS Y CLIENTES
  // ============================================

  /**
   * Obtener cantidad de proyectos activos
   * @returns {Promise<number>} Total de proyectos con status='active'
   */
  static async getActiveProjectsCount() {
    const query = "SELECT COUNT(*) as total FROM projects WHERE status = 'active'";
    const result = await db.query(query);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Obtener cantidad de clientes activos
   * @returns {Promise<number>} Total de clientes con active=true
   */
  static async getActiveClientsCount() {
    const query = 'SELECT COUNT(*) as total FROM clients WHERE active = true';
    const result = await db.query(query);
    return parseInt(result.rows[0].total, 10);
  }

  // ============================================
  // ANDAMIOS RECIENTES
  // ============================================

  /**
   * Obtener cantidad de andamios creados en las últimas 24 horas
   * @returns {Promise<number>} Conteo de andamios recientes
   */
  static async getRecentScaffoldsCount() {
    const query =
      "SELECT COUNT(*) as total FROM scaffolds WHERE assembly_created_at >= NOW() - INTERVAL '24 hours'";
    const result = await db.query(query);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Obtener los últimos 5 andamios creados
   * @returns {Promise<Array>} Lista de andamios recientes con detalles
   */
  static async getRecentScaffolds() {
    const query = `
      SELECT 
        s.id, 
        s.assembly_created_at as created_at, 
        s.project_id, 
        s.assembly_status, 
        s.card_status,
        p.name as project_name,
        TRIM(COALESCE(creator.first_name, '') || ' ' || COALESCE(creator.last_name, '')) as created_by_name
      FROM scaffolds s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN users creator ON s.created_by = creator.id
      ORDER BY s.assembly_created_at DESC
      LIMIT 5
    `;

    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = DashboardService;
