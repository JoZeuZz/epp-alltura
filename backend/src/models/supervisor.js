const db = require('../db');

const Supervisor = {
  async create({ first_name, last_name, email, phone, rut }) {
    const { rows } = await db.query(
      `INSERT INTO supervisors (first_name, last_name, email, phone, rut, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [first_name, last_name, email, phone, rut]
    );
    return rows[0];
  },

  async getAll() {
    const { rows } = await db.query(
      `SELECT *, first_name || ' ' || last_name as full_name 
       FROM supervisors 
       ORDER BY first_name, last_name`
    );
    return rows;
  },

  async getById(id) {
    const { rows } = await db.query(
      `SELECT *, first_name || ' ' || last_name as full_name 
       FROM supervisors 
       WHERE id = $1`,
      [id]
    );
    return rows[0];
  },

  async update(id, { first_name, last_name, email, phone, rut }) {
    const { rows } = await db.query(
      `UPDATE supervisors 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, rut = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [first_name, last_name, email, phone, rut, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM supervisors WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async search(query) {
    const { rows } = await db.query(
      `SELECT *, first_name || ' ' || last_name as full_name 
       FROM supervisors 
       WHERE first_name ILIKE $1 OR last_name ILIKE $1
       ORDER BY first_name, last_name 
       LIMIT 20`,
      [`%${query}%`]
    );
    return rows;
  }
};

module.exports = Supervisor;
