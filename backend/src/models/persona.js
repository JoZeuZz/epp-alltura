const db = require('../db');

class PersonaModel {
  constructor(data) {
    this.id = data.id;
    this.rut = data.rut;
    this.nombres = data.nombres;
    this.apellidos = data.apellidos;
    this.telefono = data.telefono;
    this.email = data.email;
    this.foto_url = data.foto_url;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async findByRut(rut) {
    const { rows } = await db.query('SELECT * FROM persona WHERE rut = $1', [rut]);
    return rows.length ? new PersonaModel(rows[0]) : null;
  }
}

module.exports = PersonaModel;
