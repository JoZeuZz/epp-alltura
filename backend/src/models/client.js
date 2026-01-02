const db = require('../db');

const Client = {
  async create({ name, email, phone, address, specialty }) {
    const { rows } = await db.query(
      'INSERT INTO clients (name, email, phone, address, specialty) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, address, specialty]
    );
    return rows[0];
  },

  async getAll() {
    const { rows } = await db.query('SELECT * FROM clients WHERE active = TRUE ORDER BY name');
    return rows;
  },

  async getAllIncludingInactive() {
    const { rows } = await db.query('SELECT * FROM clients ORDER BY name');
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, { name, email, phone, address, specialty }) {
    const { rows } = await db.query(
      'UPDATE clients SET name = $1, email = $2, phone = $3, address = $4, specialty = $5 WHERE id = $6 RETURNING *',
      [name, email, phone, address, specialty, id]
    );
    return rows[0];
  },

  async delete(id) {
    // Verificar si el cliente tiene proyectos vinculados
    const { rows: projects } = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE client_id = $1',
      [id]
    );
    
    const hasProjects = parseInt(projects[0].count) > 0;
    
    if (hasProjects) {
      // Si tiene proyectos, desactivar en lugar de eliminar
      return await this.deactivate(id);
    } else {
      // Si no tiene proyectos, eliminar permanentemente
      const { rows } = await db.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
      return rows[0];
    }
  },

  async deactivate(id) {
    // Desactivar el cliente
    const { rows } = await db.query(
      'UPDATE clients SET active = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    
    // Desactivar todos sus proyectos en cascada
    await db.query(
      'UPDATE projects SET active = FALSE WHERE client_id = $1',
      [id]
    );
    
    return { ...rows[0], deactivated: true };
  },

  async reactivate(id) {
    // Reactivar el cliente
    const { rows } = await db.query(
      'UPDATE clients SET active = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    
    // Reactivar todos sus proyectos en cascada
    await db.query(
      'UPDATE projects SET active = TRUE WHERE client_id = $1',
      [id]
    );
    
    return rows[0];
  }
};

module.exports = Client;
