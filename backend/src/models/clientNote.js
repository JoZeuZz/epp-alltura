const db = require('../db');

/**
 * Modelo ClientNote
 * Gestiona las notas/comentarios de clientes en andamios y proyectos
 */
class ClientNote {
  /**
   * Crear una nueva nota de cliente
   * @param {Object} noteData - Datos de la nota
   * @param {number} noteData.user_id - ID del usuario cliente
   * @param {string} noteData.target_type - 'scaffold' o 'project'
   * @param {number} [noteData.scaffold_id] - ID del andamio (si target_type='scaffold')
   * @param {number} [noteData.project_id] - ID del proyecto (si target_type='project')
   * @param {string} noteData.note_text - Texto de la nota
   * @returns {Promise<Object>} Nota creada
   */
  static async create(noteData) {
    const query = `
      INSERT INTO client_notes (
        user_id,
        target_type,
        scaffold_id,
        project_id,
        note_text
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      noteData.user_id,
      noteData.target_type,
      noteData.scaffold_id || null,
      noteData.project_id || null,
      noteData.note_text
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Obtener todas las notas de un andamio
   * @param {number} scaffoldId - ID del andamio
   * @returns {Promise<Array>} Array de notas
   */
  static async getByScaffold(scaffoldId) {
    const query = `
      SELECT 
        cn.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.profile_picture_url,
        resolver.first_name as resolver_first_name,
        resolver.last_name as resolver_last_name
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      LEFT JOIN users resolver ON cn.resolved_by = resolver.id
      WHERE cn.scaffold_id = $1
      ORDER BY cn.is_resolved ASC, cn.created_at DESC
    `;
    
    const result = await db.query(query, [scaffoldId]);
    return result.rows;
  }

  /**
   * Obtener todas las notas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} Array de notas
   */
  static async getByProject(projectId) {
    const query = `
      SELECT 
        cn.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.profile_picture_url,
        resolver.first_name as resolver_first_name,
        resolver.last_name as resolver_last_name
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      LEFT JOIN users resolver ON cn.resolved_by = resolver.id
      WHERE cn.project_id = $1
      ORDER BY cn.is_resolved ASC, cn.created_at DESC
    `;
    
    const result = await db.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Obtener nota por ID
   * @param {number} id - ID de la nota
   * @returns {Promise<Object|null>} Nota o null si no existe
   */
  static async getById(id) {
    const query = `
      SELECT 
        cn.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        resolver.first_name as resolver_first_name,
        resolver.last_name as resolver_last_name
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      LEFT JOIN users resolver ON cn.resolved_by = resolver.id
      WHERE cn.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Obtener todas las notas de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado
   * @param {boolean} [options.unresolvedOnly] - Solo notas no resueltas
   * @returns {Promise<Array>} Array de notas
   */
  static async getByUser(userId, options = {}) {
    let query = `
      SELECT 
        cn.*,
        u.first_name,
        u.last_name,
        u.email,
        CASE 
          WHEN cn.scaffold_id IS NOT NULL THEN s.scaffold_number
          ELSE NULL
        END as scaffold_number,
        CASE 
          WHEN cn.project_id IS NOT NULL THEN p.name
          WHEN cn.scaffold_id IS NOT NULL THEN sp.name
          ELSE NULL
        END as project_name,
        resolver.first_name as resolver_first_name,
        resolver.last_name as resolver_last_name
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      LEFT JOIN scaffolds s ON cn.scaffold_id = s.id
      LEFT JOIN projects p ON cn.project_id = p.id
      LEFT JOIN projects sp ON s.project_id = sp.id
      LEFT JOIN users resolver ON cn.resolved_by = resolver.id
      WHERE cn.user_id = $1
    `;
    
    const values = [userId];
    
    if (options.unresolvedOnly) {
      query += ' AND cn.is_resolved = false';
    }
    
    query += ' ORDER BY cn.is_resolved ASC, cn.created_at DESC';
    
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Obtener notas no resueltas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} Array de notas no resueltas
   */
  static async getUnresolvedByProject(projectId) {
    const query = `
      SELECT 
        cn.*,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_picture_url,
        CASE 
          WHEN cn.scaffold_id IS NOT NULL THEN s.scaffold_number
          ELSE NULL
        END as scaffold_number
      FROM client_notes cn
      JOIN users u ON cn.user_id = u.id
      LEFT JOIN scaffolds s ON cn.scaffold_id = s.id
      WHERE (cn.project_id = $1 OR s.project_id = $1)
        AND cn.is_resolved = false
      ORDER BY cn.created_at DESC
    `;
    
    const result = await db.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Actualizar texto de una nota
   * @param {number} id - ID de la nota
   * @param {string} noteText - Nuevo texto
   * @returns {Promise<Object>} Nota actualizada
   */
  static async update(id, noteText) {
    const query = `
      UPDATE client_notes
      SET note_text = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [noteText, id]);
    return result.rows[0];
  }

  /**
   * Marcar nota como resuelta
   * @param {number} id - ID de la nota
   * @param {number} resolvedBy - ID del usuario que resuelve
   * @param {string} [resolutionNotes] - Notas de resolución opcionales
   * @returns {Promise<Object>} Nota actualizada
   */
  static async markAsResolved(id, resolvedBy, resolutionNotes = null) {
    const query = `
      UPDATE client_notes
      SET is_resolved = true,
          resolved_at = NOW(),
          resolved_by = $1,
          resolution_notes = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [resolvedBy, resolutionNotes, id]);
    return result.rows[0];
  }

  /**
   * Reabrir una nota (marcar como no resuelta)
   * @param {number} id - ID de la nota
   * @returns {Promise<Object>} Nota actualizada
   */
  static async reopen(id) {
    const query = `
      UPDATE client_notes
      SET is_resolved = false,
          resolved_at = NULL,
          resolved_by = NULL,
          resolution_notes = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Eliminar una nota (soft delete - solo admin)
   * @param {number} id - ID de la nota
   * @returns {Promise<boolean>} true si se eliminó
   */
  static async delete(id) {
    const query = 'DELETE FROM client_notes WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Contar notas no resueltas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<number>} Cantidad de notas no resueltas
   */
  static async countUnresolvedByProject(projectId) {
    const query = `
      SELECT COUNT(*) as count
      FROM client_notes cn
      LEFT JOIN scaffolds s ON cn.scaffold_id = s.id
      WHERE (cn.project_id = $1 OR s.project_id = $1)
        AND cn.is_resolved = false
    `;
    
    const result = await db.query(query, [projectId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Obtener estadísticas de notas de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Object>} Estadísticas
   */
  static async getStatsByProject(projectId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_resolved THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN NOT is_resolved THEN 1 ELSE 0 END) as unresolved,
        SUM(CASE WHEN target_type = 'scaffold' THEN 1 ELSE 0 END) as on_scaffolds,
        SUM(CASE WHEN target_type = 'project' THEN 1 ELSE 0 END) as on_project
      FROM client_notes cn
      LEFT JOIN scaffolds s ON cn.scaffold_id = s.id
      WHERE cn.project_id = $1 OR s.project_id = $1
    `;
    
    const result = await db.query(query, [projectId]);
    const row = result.rows[0];
    
    return {
      total: parseInt(row.total, 10),
      resolved: parseInt(row.resolved, 10),
      unresolved: parseInt(row.unresolved, 10),
      on_scaffolds: parseInt(row.on_scaffolds, 10),
      on_project: parseInt(row.on_project, 10)
    };
  }
}

module.exports = ClientNote;
