const db = require('../db');

/**
 * Modelo de Andamio (Scaffold)
 * Representa un andamio persistente en el sistema
 * Cambio de paradigma: de "reporte" a "andamio persistente"
 */
const Scaffold = {
  /**
   * Crear un nuevo andamio
   * @param {Object} scaffoldData - Datos del andamio
   * @returns {Promise<Object>} - Andamio creado
   */
  async create(scaffoldData) {
    const {
      project_id,
      user_id,
      scaffold_number,
      area,
      tag,
      height,
      width,
      length,
      cubic_meters,
      progress_percentage,
      assembly_notes,
      assembly_image_url,
      card_status = 'red', // Por defecto: tarjeta roja
      assembly_status = 'disassembled', // Por defecto: desarmado
      location,
      observations,
    } = scaffoldData;

    const query = `
      INSERT INTO scaffolds 
        (project_id, user_id, scaffold_number, area, tag, 
         height, width, length, cubic_meters, progress_percentage, assembly_notes, 
         assembly_image_url, card_status, assembly_status, created_by, location, observations)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      project_id,
      user_id,
      scaffold_number,
      area,
      tag,
      height,
      width,
      length,
      cubic_meters,
      progress_percentage,
      assembly_notes,
      assembly_image_url,
      card_status,
      assembly_status,
      user_id, // created_by es el usuario que lo crea
      location,
      observations,
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Obtener un andamio por ID
   * @param {number} id - ID del andamio
   * @returns {Promise<Object|null>} - Andamio encontrado o null
   */
  async getById(id) {
    const query = `
      SELECT 
        s.*, 
        u.first_name || ' ' || u.last_name as user_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        p.name as project_name
      FROM scaffolds s 
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.id = $1
    `;
    
    const { rows } = await db.query(query, [id]);
    return rows.length ? rows[0] : null;
  },

  /**
   * Obtener todos los andamios de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} - Lista de andamios
   */
  async getByProject(projectId) {
    const query = `
      SELECT 
        s.*, 
        u.first_name || ' ' || u.last_name as user_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        creator.role as creator_role,
        p.name as project_name,
        c.name as company_name,
        supervisor.first_name || ' ' || supervisor.last_name as supervisor_name,
        client_user.first_name || ' ' || client_user.last_name as client_user_name,
        (
          SELECT sh.created_at 
          FROM scaffold_history sh 
          WHERE sh.scaffold_id = s.id 
            AND sh.change_type = 'assembly_status'
            AND sh.new_data->>'assembly_status' = 'assembled'
          ORDER BY sh.created_at ASC
          LIMIT 1
        ) as assembly_date
      FROM scaffolds s 
      JOIN users u ON s.user_id = u.id 
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users supervisor ON p.assigned_supervisor_id = supervisor.id
      LEFT JOIN users client_user ON p.assigned_client_id = client_user.id
      WHERE s.project_id = $1 
      ORDER BY s.assembly_created_at DESC
    `;
    
    const { rows } = await db.query(query, [projectId]);
    return rows;
  },

  /**
   * Obtener andamios creados por un supervisor específico
   * @param {number} userId - ID del usuario supervisor
   * @returns {Promise<Array>} - Lista de andamios
   */
  async getByCreator(userId) {
    const query = `
      SELECT 
        s.*, 
        u.first_name || ' ' || u.last_name as user_name,
        p.name as project_name
      FROM scaffolds s 
      JOIN users u ON s.user_id = u.id 
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.created_by = $1 
      ORDER BY s.assembly_created_at DESC
    `;
    
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  /**
   * Actualizar un andamio
   * @param {number} id - ID del andamio
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Andamio actualizado
   */
  async update(id, updateData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'scaffold_number', 'area', 'tag',
      'height', 'width', 'length', 'cubic_meters', 'progress_percentage', 
      'assembly_notes', 'card_status', 'assembly_status', 'assembly_image_url', 
      'disassembly_image', 'disassembly_notes', 'location', 'observations'
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        values.push(updateData[field]);
        fields.push(`${field} = $${values.length}`);
      }
    });

    if (fields.length === 0) {
      // No hay nada que actualizar
      return this.getById(id);
    }

    // Agregar updated_at
    fields.push(`updated_at = NOW()`);

    values.push(id);
    const query = `
      UPDATE scaffolds 
      SET ${fields.join(', ')} 
      WHERE id = $${values.length} 
      RETURNING *
    `;

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Cambiar el estado de la tarjeta (verde/roja)
   * @param {number} id - ID del andamio
   * @param {string} cardStatus - 'green' o 'red'
   * @returns {Promise<Object>} - Andamio actualizado
   */
  async updateCardStatus(id, cardStatus) {
    const query = `
      UPDATE scaffolds 
      SET card_status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [cardStatus, id]);
    return rows[0];
  },

  /**
   * Cambiar el estado de armado (assembled/disassembled)
   * @param {number} id - ID del andamio
   * @param {string} assemblyStatus - 'assembled' o 'disassembled'
   * @param {string} disassemblyImage - URL de imagen de desarmado (opcional)
   * @returns {Promise<Object>} - Andamio actualizado
   */
  async updateAssemblyStatus(id, assemblyStatus, disassemblyImage = null) {
    let query;
    let values;

    if (assemblyStatus === 'disassembled' && disassemblyImage) {
      // Al desarmar, automáticamente cambiar tarjeta a roja
      query = `
        UPDATE scaffolds 
        SET assembly_status = $1, disassembly_image = $2, card_status = 'red', 
            disassembled_at = NOW(), updated_at = NOW() 
        WHERE id = $3 
        RETURNING *
      `;
      values = [assemblyStatus, disassemblyImage, id];
    } else {
      query = `
        UPDATE scaffolds 
        SET assembly_status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `;
      values = [assemblyStatus, id];
    }

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  /**
   * Eliminar un andamio
   * @param {number} id - ID del andamio
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async delete(id) {
    const query = 'DELETE FROM scaffolds WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  },

  /**
   * Obtener todos los andamios (con filtros opcionales)
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de andamios
   */
  async getAll(filters = {}) {
    let query = `
      SELECT 
        s.*, 
        u.first_name || ' ' || u.last_name as user_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        p.name as project_name
      FROM scaffolds s 
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE 1=1
    `;
    
    const values = [];

    if (filters.project_id) {
      values.push(filters.project_id);
      query += ` AND s.project_id = $${values.length}`;
    }

    if (filters.created_by) {
      values.push(filters.created_by);
      query += ` AND s.created_by = $${values.length}`;
    }

    if (filters.card_status) {
      values.push(filters.card_status);
      query += ` AND s.card_status = $${values.length}`;
    }

    if (filters.assembly_status) {
      values.push(filters.assembly_status);
      query += ` AND s.assembly_status = $${values.length}`;
    }

    query += ' ORDER BY s.assembly_created_at DESC';

    const { rows } = await db.query(query, values);
    return rows;
  },
};

module.exports = Scaffold;
