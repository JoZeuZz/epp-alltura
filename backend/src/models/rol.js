const db = require('../db');

class RolModel {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
  }

  static async findByNombre(nombre) {
    const { rows } = await db.query('SELECT * FROM rol WHERE nombre = $1', [nombre]);
    return rows.length ? new RolModel(rows[0]) : null;
  }

}

module.exports = RolModel;
