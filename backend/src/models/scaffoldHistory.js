const db = require('../db');

/**
 * Modelo de Historial de Modificaciones de Andamios
 * Registra todos los cambios realizados en los andamios
 */
const ScaffoldHistory = {
  /**
   * Crear una nueva entrada de historial
   * @param {Object} historyData - Datos del historial
   * @returns {Promise<Object>} - Entrada de historial creada
   */
  async create(historyData) {
    const {
      scaffold_id,
      user_id,
      change_type,
      previous_data,
      new_data,
      description,
    } = historyData;

    const query = `
      INSERT INTO scaffold_history 
        (scaffold_id, user_id, change_type, previous_data, new_data, description)
      VALUES 
        ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      scaffold_id,
      user_id,
      change_type,
      JSON.stringify(previous_data || {}),
      JSON.stringify(new_data || {}),
      description,
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Obtener todo el historial de un andamio
   * @param {number} scaffoldId - ID del andamio
   * @returns {Promise<Array>} - Lista de entradas de historial
   */
  async getByScaffold(scaffoldId) {
    const query = `
      SELECT 
        sh.*,
        u.first_name || ' ' || u.last_name as modified_by_name,
        u.email as modified_by_email
      FROM scaffold_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE sh.scaffold_id = $1
      ORDER BY sh.created_at DESC
    `;

    const { rows } = await db.query(query, [scaffoldId]);
    
    // Parsear JSON de previous_data y new_data
    return rows.map(row => ({
      ...row,
      previous_data: typeof row.previous_data === 'string' 
        ? JSON.parse(row.previous_data) 
        : row.previous_data,
      new_data: typeof row.new_data === 'string' 
        ? JSON.parse(row.new_data) 
        : row.new_data,
    }));
  },

  /**
   * Eliminar una entrada de historial (solo admin)
   * @param {number} id - ID de la entrada de historial
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async delete(id) {
    const query = 'DELETE FROM scaffold_history WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },

  /**
   * Crear entrada de historial automáticamente al detectar cambios
   * @param {number} scaffoldId - ID del andamio
   * @param {number} userId - ID del usuario que hace el cambio
   * @param {Object} previousData - Datos anteriores del andamio
   * @param {Object} newData - Datos nuevos del andamio
   * @returns {Promise<Object>} - Entrada de historial creada
   */
  async createFromChanges(scaffoldId, userId, previousData, newData) {
    const changes = [];
    const changeType = [];

    // Detectar qué cambió
    if (previousData.card_status !== newData.card_status) {
      changes.push(`Tarjeta: ${previousData.card_status} → ${newData.card_status}`);
      changeType.push('card_status');
    }

    if (previousData.assembly_status !== newData.assembly_status) {
      changes.push(`Estado: ${previousData.assembly_status} → ${newData.assembly_status}`);
      changeType.push('assembly_status');
    }

    if (previousData.progress_percentage !== newData.progress_percentage) {
      changes.push(`Progreso: ${previousData.progress_percentage}% → ${newData.progress_percentage}%`);
      changeType.push('progress');
    }

    if (previousData.height !== newData.height || 
        previousData.width !== newData.width || 
        previousData.depth !== newData.depth) {
      changes.push('Dimensiones actualizadas');
      changeType.push('dimensions');
    }

    // Si no hay cambios detectados, asumir actualización general
    if (changes.length === 0) {
      changes.push('Actualización de datos del andamio');
      changeType.push('update');
    }

    const description = changes.join(', ');
    const type = changeType.join(',');

    return this.create({
      scaffold_id: scaffoldId,
      user_id: userId,
      change_type: type,
      previous_data: previousData,
      new_data: newData,
      description,
    });
  },

  /**
   * Obtener historial de cambios de un usuario específico
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} - Lista de entradas de historial
   */
  async getByUser(userId) {
    const query = `
      SELECT 
        sh.*,
        s.scaffold_number,
        s.area,
        s.tag,
        p.name as project_name
      FROM scaffold_history sh
      LEFT JOIN scaffolds s ON sh.scaffold_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE sh.user_id = $1
      ORDER BY sh.created_at DESC
    `;

    const { rows } = await db.query(query, [userId]);
    
    return rows.map(row => ({
      ...row,
      previous_data: typeof row.previous_data === 'string' 
        ? JSON.parse(row.previous_data) 
        : row.previous_data,
      new_data: typeof row.new_data === 'string' 
        ? JSON.parse(row.new_data) 
        : row.new_data,
    }));
  },
};

module.exports = ScaffoldHistory;
