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
    const { rows } = await db.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = Client;
