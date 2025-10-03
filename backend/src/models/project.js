const db = require('../db');

const Project = {
  async create({ client_id, name, status }) {
    const { rows } = await db.query(
      'INSERT INTO projects (client_id, name, status) VALUES ($1, $2, $3) RETURNING *',
      [client_id, name, status || 'active']
    );
    return rows[0];
  },

  async getAll() {
    const { rows } = await db.query('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.created_at DESC');
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1', [id]);
    return rows[0];
  },

  async getForUser(userId) {
    const { rows } = await db.query(
      `SELECT p.*, c.name as client_name 
       FROM projects p 
       JOIN project_users pu ON p.id = pu.project_id 
       LEFT JOIN clients c ON p.client_id = c.id 
       WHERE pu.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async update(id, { client_id, name, status }) {
    const { rows } = await db.query(
      'UPDATE projects SET client_id = $1, name = $2, status = $3 WHERE id = $4 RETURNING *',
      [client_id, name, status, id]
    );
    return rows[0];
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
      
      await client.query('DELETE FROM project_users WHERE project_id = $1', [projectId]);

      if (userIds && userIds.length > 0) {
        const insertPromises = userIds.map(userId => {
          const insertQuery = 'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)';
          return client.query(insertQuery, [projectId, userId]);
        });
        await Promise.all(insertPromises);
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
};

module.exports = Project;
