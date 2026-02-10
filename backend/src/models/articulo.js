const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

class ArticuloModel {
  constructor(data) {
    this.id = data.id;
    this.tipo = data.tipo;
    this.nombre = data.nombre;
    this.marca = data.marca;
    this.modelo = data.modelo;
    this.categoria = data.categoria;
    this.tracking_mode = data.tracking_mode;
    this.retorno_mode = data.retorno_mode;
    this.nivel_control = data.nivel_control;
    this.requiere_vencimiento = data.requiere_vencimiento;
    this.unidad_medida = data.unidad_medida;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
  }

  static async create(fields) {
    const { rows } = await db.query(
      `
      INSERT INTO articulo (
        tipo, nombre, marca, modelo, categoria, tracking_mode, retorno_mode, nivel_control,
        requiere_vencimiento, unidad_medida, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        fields.tipo,
        fields.nombre,
        fields.marca || null,
        fields.modelo || null,
        fields.categoria || null,
        fields.tracking_mode,
        fields.retorno_mode,
        fields.nivel_control,
        Boolean(fields.requiere_vencimiento),
        fields.unidad_medida,
        fields.estado || 'activo',
      ]
    );

    return new ArticuloModel(rows[0]);
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM articulo WHERE id = $1', [id]);
    return rows.length ? new ArticuloModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const { tipo, estado, tracking_mode, retorno_mode, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    if (tipo) {
      values.push(tipo);
      conditions.push(`tipo = $${values.length}`);
    }

    if (estado) {
      values.push(estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (tracking_mode) {
      values.push(tracking_mode);
      conditions.push(`tracking_mode = $${values.length}`);
    }

    if (retorno_mode) {
      values.push(retorno_mode);
      conditions.push(`retorno_mode = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(nombre ILIKE $${values.length} OR marca ILIKE $${values.length} OR modelo ILIKE $${values.length})`);
    }

    let query = 'SELECT * FROM articulo';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    values.push(limit, offset);
    query += ` ORDER BY creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((row) => new ArticuloModel(row));
  }

  static async update(id, fields) {
    const { clause, values } = buildSetClause({
      tipo: fields.tipo,
      nombre: fields.nombre,
      marca: fields.marca,
      modelo: fields.modelo,
      categoria: fields.categoria,
      tracking_mode: fields.tracking_mode,
      retorno_mode: fields.retorno_mode,
      nivel_control: fields.nivel_control,
      requiere_vencimiento: fields.requiere_vencimiento,
      unidad_medida: fields.unidad_medida,
      estado: fields.estado,
    });

    if (!clause) {
      return ArticuloModel.findById(id);
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE articulo SET ${clause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return rows.length ? new ArticuloModel(rows[0]) : null;
  }
}

module.exports = ArticuloModel;
