const db = require('../db');

const Company = {
  async create({ name, contact_person, email, phone, address }) {
    const { rows } = await db.query(
      `INSERT INTO companies (name, contact_person, email, phone, address, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [name, contact_person, email, phone, address]
    );
    return rows[0];
  },

  async getAll() {
    const { rows } = await db.query('SELECT * FROM companies ORDER BY name');
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, { name, contact_person, email, phone, address }) {
    const { rows } = await db.query(
      `UPDATE companies 
       SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [name, contact_person, email, phone, address, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async search(query) {
    const { rows } = await db.query(
      `SELECT * FROM companies 
       WHERE name ILIKE $1 
       ORDER BY name 
       LIMIT 20`,
      [`%${query}%`]
    );
    return rows;
  }
};

module.exports = Company;
