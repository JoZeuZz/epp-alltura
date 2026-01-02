const db = require('../db');

const Project = {
  /**
   * Crear un nuevo proyecto
   * Ahora permite asignar cliente y supervisor opcionalmente
   * También sincroniza con la tabla project_users
   */
  async create({ client_id, name, status, assigned_client_id, assigned_supervisor_id }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Crear el proyecto
      const { rows } = await client.query(
        'INSERT INTO projects (client_id, name, status, assigned_client_id, assigned_supervisor_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [client_id, name, status || 'active', assigned_client_id || null, assigned_supervisor_id || null]
      );
      const newProject = rows[0];
      
      // Sincronizar con project_users
      const userIds = [];
      if (assigned_supervisor_id) userIds.push(assigned_supervisor_id);
      if (assigned_client_id) userIds.push(assigned_client_id);
      
      if (userIds.length > 0) {
        const insertPromises = userIds.map(userId => 
          client.query('INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)', [newProject.id, userId])
        );
        await Promise.all(insertPromises);
      }
      
      await client.query('COMMIT');
      return newProject;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getAll() {
    const { rows } = await db.query(`
      SELECT 
        p.*, 
        c.name as client_name,
        ac.first_name || ' ' || ac.last_name as assigned_client_name,
        ac.email as assigned_client_email,
        au.first_name || ' ' || au.last_name as assigned_supervisor_name,
        au.email as assigned_supervisor_email
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users ac ON p.assigned_client_id = ac.id
      LEFT JOIN users au ON p.assigned_supervisor_id = au.id
      WHERE p.active = TRUE AND c.active = TRUE
      ORDER BY p.created_at DESC
    `);
    return rows;
  },

  async getAllIncludingInactive() {
    const { rows } = await db.query(`
      SELECT 
        p.*, 
        c.name as client_name,
        c.active as client_active,
        ac.first_name || ' ' || ac.last_name as assigned_client_name,
        ac.email as assigned_client_email,
        au.first_name || ' ' || au.last_name as assigned_supervisor_name,
        au.email as assigned_supervisor_email
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users ac ON p.assigned_client_id = ac.id
      LEFT JOIN users au ON p.assigned_supervisor_id = au.id
      ORDER BY p.created_at DESC
    `);
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query(`
      SELECT 
        p.*, 
        c.name as client_name,
        c.active as client_active,
        ac.first_name || ' ' || ac.last_name as assigned_client_name,
        ac.email as assigned_client_email,
        au.first_name || ' ' || au.last_name as assigned_supervisor_name,
        au.email as assigned_supervisor_email
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users ac ON p.assigned_client_id = ac.id
      LEFT JOIN users au ON p.assigned_supervisor_id = au.id
      WHERE p.id = $1
    `, [id]);
    return rows[0];
  },

  async getForUser(userId) {
    const { rows } = await db.query(
      `SELECT p.*, c.name as client_name, c.active as client_active
       FROM projects p 
       JOIN project_users pu ON p.id = pu.project_id 
       LEFT JOIN clients c ON p.client_id = c.id 
       WHERE pu.user_id = $1 AND p.active = TRUE AND c.active = TRUE
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * Actualizar proyecto
   * Ahora permite actualizar cliente y supervisor asignados
   * También sincroniza con la tabla project_users
   */
  async update(id, { client_id, name, status, assigned_client_id, assigned_supervisor_id }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const fields = [];
      const values = [];
      
      if (client_id !== undefined) {
        values.push(client_id);
        fields.push(`client_id = $${values.length}`);
      }
      if (name !== undefined) {
        values.push(name);
        fields.push(`name = $${values.length}`);
      }
      if (status !== undefined) {
        values.push(status);
        fields.push(`status = $${values.length}`);
      }
      if (assigned_client_id !== undefined) {
        values.push(assigned_client_id);
        fields.push(`assigned_client_id = $${values.length}`);
      }
      if (assigned_supervisor_id !== undefined) {
        values.push(assigned_supervisor_id);
        fields.push(`assigned_supervisor_id = $${values.length}`);
      }

      let updatedProject;
      if (fields.length === 0) {
        updatedProject = await this.getById(id);
      } else {
        values.push(id);
        const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`;
        const { rows } = await client.query(query, values);
        updatedProject = rows[0];
      }
      
      // Sincronizar con project_users solo si se actualizaron los campos de asignación
      if (assigned_client_id !== undefined || assigned_supervisor_id !== undefined) {
        // Obtener usuarios actualmente asignados en project_users
        const { rows: currentUsers } = await client.query(
          'SELECT user_id FROM project_users WHERE project_id = $1',
          [id]
        );
        const currentUserIds = currentUsers.map(row => row.user_id);
        
        // Obtener los valores actuales de assigned_supervisor_id y assigned_client_id
        const projectData = updatedProject || await this.getById(id);
        const newUserIds = [];
        if (projectData.assigned_supervisor_id) newUserIds.push(projectData.assigned_supervisor_id);
        if (projectData.assigned_client_id) newUserIds.push(projectData.assigned_client_id);
        
        // Eliminar usuarios que ya no están asignados
        const toRemove = currentUserIds.filter(uid => !newUserIds.includes(uid));
        if (toRemove.length > 0) {
          await client.query(
            'DELETE FROM project_users WHERE project_id = $1 AND user_id = ANY($2)',
            [id, toRemove]
          );
        }
        
        // Agregar nuevos usuarios
        const toAdd = newUserIds.filter(uid => !currentUserIds.includes(uid));
        if (toAdd.length > 0) {
          const insertPromises = toAdd.map(userId => 
            client.query('INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)', [id, userId])
          );
          await Promise.all(insertPromises);
        }
      }
      
      await client.query('COMMIT');
      return updatedProject;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async countActive() {
    const { rows } = await db.query("SELECT COUNT(*) FROM projects WHERE status = 'active'");
    return parseInt(rows[0].count, 10);
  },

  async getAssignedUsers(projectId) {
    const { rows } = await db.query(
      'SELECT user_id FROM project_users WHERE project_id = $1',
      [projectId]
    );
    return rows.map(row => row.user_id);
  },

  async assignUsers(projectId, userIds) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Limpiar asignaciones previas en project_users
      await client.query('DELETE FROM project_users WHERE project_id = $1', [projectId]);

      // Insertar nuevas asignaciones en project_users
      if (userIds && userIds.length > 0) {
        const insertPromises = userIds.map(userId => {
          const insertQuery = 'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)';
          return client.query(insertQuery, [projectId, userId]);
        });
        await Promise.all(insertPromises);
        
        // Sincronizar con los campos assigned_supervisor_id y assigned_client_id
        // Obtener los roles de los usuarios asignados
        const { rows: userRoles } = await client.query(
          'SELECT id, role FROM users WHERE id = ANY($1)',
          [userIds]
        );
        
        const supervisorId = userRoles.find(u => u.role === 'supervisor')?.id || null;
        const clientId = userRoles.find(u => u.role === 'client')?.id || null;
        
        // Actualizar los campos en la tabla projects
        await client.query(
          'UPDATE projects SET assigned_supervisor_id = $1, assigned_client_id = $2 WHERE id = $3',
          [supervisorId, clientId, projectId]
        );
      } else {
        // Si no hay usuarios asignados, limpiar también los campos en projects
        await client.query(
          'UPDATE projects SET assigned_supervisor_id = NULL, assigned_client_id = NULL WHERE id = $1',
          [projectId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Asignar un cliente a un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {number} clientId - ID del usuario cliente
   */
  async assignClient(projectId, clientId) {
    const { rows } = await db.query(
      'UPDATE projects SET assigned_client_id = $1 WHERE id = $2 RETURNING *',
      [clientId, projectId]
    );
    return rows[0];
  },

  /**
   * Asignar un supervisor a un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {number} supervisorId - ID del usuario supervisor
   */
  async assignSupervisor(projectId, supervisorId) {
    const { rows } = await db.query(
      'UPDATE projects SET assigned_supervisor_id = $1 WHERE id = $2 RETURNING *',
      [supervisorId, projectId]
    );
    return rows[0];
  },

  /**
   * Obtener proyectos asignados a un cliente específico
   * @param {number} clientId - ID del usuario cliente
   */
  async getByAssignedClient(clientId) {
    const { rows } = await db.query(`
      SELECT 
        p.*, 
        c.name as client_name,
        c.active as client_active,
        au.first_name || ' ' || au.last_name as assigned_supervisor_name,
        au.email as assigned_supervisor_email
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users au ON p.assigned_supervisor_id = au.id
      WHERE p.assigned_client_id = $1
      ORDER BY p.created_at DESC
    `, [clientId]);
    return rows;
  },

  /**
   * Obtener proyectos asignados a un supervisor específico
   * @param {number} supervisorId - ID del usuario supervisor
   */
  async getByAssignedSupervisor(supervisorId) {
    const { rows } = await db.query(`
      SELECT 
        p.*, 
        c.name as client_name,
        c.active as client_active,
        ac.first_name || ' ' || ac.last_name as assigned_client_name,
        asup.first_name || ' ' || asup.last_name as assigned_supervisor_name
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users ac ON p.assigned_client_id = ac.id
      LEFT JOIN users asup ON p.assigned_supervisor_id = asup.id
      WHERE p.assigned_supervisor_id = $1
      ORDER BY p.created_at DESC
    `, [supervisorId]);
    return rows;
  },
};

module.exports = Project;
