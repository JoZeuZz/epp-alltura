const db = require('../db');

class RolModel {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM rol WHERE id = $1', [id]);
    return rows.length ? new RolModel(rows[0]) : null;
  }

  static async findByNombre(nombre) {
    const { rows } = await db.query('SELECT * FROM rol WHERE nombre = $1', [nombre]);
    return rows.length ? new RolModel(rows[0]) : null;
  }

  static async findAll() {
    const { rows } = await db.query('SELECT * FROM rol ORDER BY nombre ASC');
    return rows.map((row) => new RolModel(row));
  }
}

module.exports = RolModel;
