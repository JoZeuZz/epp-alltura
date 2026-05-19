const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class ProyectoModel {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.ciudad = data.ciudad ?? null;
    this.cliente = data.cliente;
    this.presupuesto_clp = data.presupuesto_clp;
    this.estado = data.estado;
    this.fecha_inicio = data.fecha_inicio;
    this.fecha_fin = data.fecha_fin;
    this.creado_en = data.creado_en;
    this.actualizado_en = data.actualizado_en;
  }

  static async create({ nombre, descripcion, ciudad, cliente, presupuesto_clp, estado = 'activo', fecha_inicio, fecha_fin }) {
    const { rows } = await db.query(
      `INSERT INTO proyectos (nombre, descripcion, ciudad, cliente, presupuesto_clp, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre, descripcion || null, ciudad || null, cliente || null, presupuesto_clp ?? null, estado, fecha_inicio || null, fecha_fin || null]
    );
    return new ProyectoModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM proyectos WHERE id = $1', [id]);
    return rows.length ? new ProyectoModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { estado, cliente, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (estado) {
      values.push(estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (cliente) {
      values.push(cliente);
      conditions.push(`cliente = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(nombre ILIKE $${values.length} OR cliente ILIKE $${values.length})`);
    }

    let query = 'SELECT * FROM proyectos';
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    values.push(limit, offset);
    query += ` ORDER BY creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((r) => new ProyectoModel(r));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      nombre: fields.nombre,
      descripcion: fields.descripcion,
      ciudad: fields.ciudad,
      cliente: fields.cliente,
      presupuesto_clp: fields.presupuesto_clp,
      estado: fields.estado,
      fecha_inicio: fields.fecha_inicio,
      fecha_fin: fields.fecha_fin,
    });

    if (!clause) return ProyectoModel.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE proyectos SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows.length ? new ProyectoModel(rows[0]) : null;
  }
}

module.exports = ProyectoModel;
