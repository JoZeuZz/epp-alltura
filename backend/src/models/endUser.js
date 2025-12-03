const db = require('../db');

const EndUser = {
  async create({ name, company_id, email, phone, department }) {
    const { rows } = await db.query(
      `INSERT INTO end_users (name, company_id, email, phone, department, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [name, company_id, email, phone, department]
    );
    return rows[0];
  },

  async getAll() {
    const { rows } = await db.query(
      `SELECT eu.*, c.name as company_name 
       FROM end_users eu
       LEFT JOIN companies c ON eu.company_id = c.id
       ORDER BY eu.name`
    );
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query(
      `SELECT eu.*, c.name as company_name 
       FROM end_users eu
       LEFT JOIN companies c ON eu.company_id = c.id
       WHERE eu.id = $1`,
      [id]
    );
    return rows[0];
  },

  async getByCompany(company_id) {
    const { rows } = await db.query(
      'SELECT * FROM end_users WHERE company_id = $1 ORDER BY name',
      [company_id]
    );
    return rows;
  },

  async update(id, { name, company_id, email, phone, department }) {
    const { rows } = await db.query(
      `UPDATE end_users 
       SET name = $1, company_id = $2, email = $3, phone = $4, department = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [name, company_id, email, phone, department, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM end_users WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async search(query) {
    const { rows } = await db.query(
      `SELECT eu.*, c.name as company_name 
       FROM end_users eu
       LEFT JOIN companies c ON eu.company_id = c.id
       WHERE eu.name ILIKE $1 
       ORDER BY eu.name 
       LIMIT 20`,
      [`%${query}%`]
    );
    return rows;
  }
};

module.exports = EndUser;
