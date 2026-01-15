const db = require('../db');
const { logger } = require('../lib/logger');

class ScaffoldModification {
  /**
   * Crear nueva modificación de andamio
   */
  static async create({ scaffoldId, createdBy, height, width, length, cubicMeters, reason, approvalStatus = 'pending' }) {
    try {
      const result = await db.query(
        `INSERT INTO scaffold_modifications (scaffold_id, created_by, height, width, length, cubic_meters, reason, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [scaffoldId, createdBy, height, width, length, cubicMeters, reason, approvalStatus]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating scaffold modification:', error);
      throw error;
    }
  }

  /**
   * Obtener modificación por ID
   */
  static async getById(id) {
    try {
      const result = await db.query(
        `SELECT sm.*, 
                CONCAT(u1.first_name, ' ', u1.last_name) as created_by_username,
                CONCAT(u2.first_name, ' ', u2.last_name) as approved_by_username
         FROM scaffold_modifications sm
         LEFT JOIN users u1 ON sm.created_by = u1.id
         LEFT JOIN users u2 ON sm.approved_by = u2.id
         WHERE sm.id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching scaffold modification:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las modificaciones de un andamio
   */
  static async getByScaffoldId(scaffoldId, filters = {}) {
    try {
      let query = `
        SELECT sm.*, 
               CONCAT(u1.first_name, ' ', u1.last_name) as created_by_username,
               CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
               CONCAT(u2.first_name, ' ', u2.last_name) as approved_by_username,
               CONCAT(u2.first_name, ' ', u2.last_name) as approved_by_name
        FROM scaffold_modifications sm
        LEFT JOIN users u1 ON sm.created_by = u1.id
        LEFT JOIN users u2 ON sm.approved_by = u2.id
        WHERE sm.scaffold_id = $1
      `;

      const params = [scaffoldId];
      
      if (filters.approvalStatus) {
        params.push(filters.approvalStatus);
        query += ` AND sm.approval_status = $${params.length}`;
      }

      query += ' ORDER BY sm.created_at DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching scaffold modifications:', error);
      throw error;
    }
  }

  /**
   * Contar modificaciones de un andamio (aprobadas + pendientes)
   */
  static async countByScaffoldId(scaffoldId, statuses = ['approved', 'pending']) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM scaffold_modifications
         WHERE scaffold_id = $1 AND approval_status = ANY($2)`,
        [scaffoldId, statuses]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error counting scaffold modifications:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las modificaciones pendientes
   */
  static async getAllPending() {
    try {
      const result = await db.query(
        `SELECT sm.*, 
                s.scaffold_number,
                s.project_id,
                p.name as project_name,
                u1.username as created_by_username,
                u1.full_name as created_by_name
         FROM scaffold_modifications sm
         JOIN scaffolds s ON sm.scaffold_id = s.id
         JOIN projects p ON s.project_id = p.id
         LEFT JOIN users u1 ON sm.created_by = u1.id
         WHERE sm.approval_status = 'pending'
         ORDER BY sm.created_at ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending modifications:', error);
      throw error;
    }
  }

  /**
   * Obtener modificaciones pendientes por supervisor
   */
  static async getPendingByUser(userId) {
    try {
      const result = await db.query(
        `SELECT sm.*, 
                s.scaffold_number,
                s.project_id,
                p.name as project_name
         FROM scaffold_modifications sm
         JOIN scaffolds s ON sm.scaffold_id = s.id
         JOIN projects p ON s.project_id = p.id
         WHERE sm.approval_status = 'pending' AND sm.created_by = $1
         ORDER BY sm.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user pending modifications:', error);
      throw error;
    }
  }

  /**
   * Aprobar modificación
   */
  static async approve(id, approvedBy) {
    try {
      const result = await db.query(
        `UPDATE scaffold_modifications
         SET approval_status = 'approved',
             approved_by = $2,
             approved_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, approvedBy]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error approving modification:', error);
      throw error;
    }
  }

  /**
   * Rechazar modificación
   */
  static async reject(id, approvedBy, rejectionReason) {
    try {
      const result = await db.query(
        `UPDATE scaffold_modifications
         SET approval_status = 'rejected',
             approved_by = $2,
             approved_at = NOW(),
             rejection_reason = $3
         WHERE id = $1
         RETURNING *`,
        [id, approvedBy, rejectionReason]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error rejecting modification:', error);
      throw error;
    }
  }

  /**
   * Eliminar modificación (solo si está pendiente)
   */
  static async delete(id) {
    try {
      const result = await db.query(
        `DELETE FROM scaffold_modifications
         WHERE id = $1 AND approval_status = 'pending'
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting modification:', error);
      throw error;
    }
  }

  /**
   * Calcular total de metros cúbicos adicionales aprobados de un andamio
   */
  static async getTotalApprovedCubicMeters(scaffoldId) {
    try {
      const result = await db.query(
        `SELECT COALESCE(SUM(cubic_meters), 0) as total
         FROM scaffold_modifications
         WHERE scaffold_id = $1 AND approval_status = 'approved'`,
        [scaffoldId]
      );
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Error calculating total approved cubic meters:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de modificaciones de un proyecto
   */
  static async getProjectStats(projectId) {
    try {
      const result = await db.query(
        `SELECT 
           COUNT(*) FILTER (WHERE sm.approval_status = 'pending') as pending_count,
           COUNT(*) FILTER (WHERE sm.approval_status = 'approved') as approved_count,
           COUNT(*) FILTER (WHERE sm.approval_status = 'rejected') as rejected_count,
           COALESCE(SUM(sm.cubic_meters) FILTER (WHERE sm.approval_status = 'approved'), 0) as total_approved_cubic_meters
         FROM scaffold_modifications sm
         JOIN scaffolds s ON sm.scaffold_id = s.id
         WHERE s.project_id = $1`,
        [projectId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching project modification stats:', error);
      throw error;
    }
  }
}

module.exports = ScaffoldModification;
