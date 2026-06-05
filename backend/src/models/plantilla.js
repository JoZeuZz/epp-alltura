'use strict';

const db = require('../db');

const RICH_SELECT = `
  SELECT p.*,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object('especialidad', pe.especialidad))
      FILTER (WHERE pe.especialidad IS NOT NULL), '[]'
    ) AS especialidades_raw,
    COALESCE(
      json_agg(DISTINCT jsonb_build_object('id', pc.id, 'nombre', pc.nombre, 'url', pc.url, 'creado_en', pc.creado_en))
      FILTER (WHERE pc.id IS NOT NULL), '[]'
    ) AS certificaciones
  FROM articulo_plantilla p
  LEFT JOIN articulo_plantilla_especialidad pe ON pe.plantilla_id = p.id
  LEFT JOIN articulo_plantilla_certificacion pc ON pc.plantilla_id = p.id
`;

class PlantillaModel {
  static async findAll({ tipo, estado } = {}) {
    const conditions = [];
    const params = [];
    let p = 1;
    if (tipo)   { conditions.push(`p.tipo = $${p++}`);   params.push(tipo); }
    if (estado) { conditions.push(`p.estado = $${p++}`); params.push(estado); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `${RICH_SELECT} ${where} GROUP BY p.id ORDER BY p.nombre ASC`,
      params
    );
    return rows.map(normalizeRow);
  }

  static async findByIdWithClient(client, id) {
    const { rows } = await client.query(
      `${RICH_SELECT} WHERE p.id = $1 GROUP BY p.id`,
      [id]
    );
    return rows[0] ? normalizeRow(rows[0]) : null;
  }

  static async findById(id) {
    const client = await db.pool.connect();
    try {
      return await PlantillaModel.findByIdWithClient(client, id);
    } finally {
      client.release();
    }
  }

  static async insert(client, fields) {
    const { rows } = await client.query(
      `INSERT INTO articulo_plantilla
         (tipo, nombre, marca, modelo, descripcion, foto_url, manual_url, creado_por_usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        fields.tipo, fields.nombre,
        fields.marca        || null,
        fields.modelo       || null,
        fields.descripcion  || null,
        fields.foto_url     || null,
        fields.manual_url   || null,
        fields.creado_por_usuario_id,
      ]
    );
    return rows[0].id;
  }

  static async updateFields(client, id, fields) {
    await client.query(
      `UPDATE articulo_plantilla SET
         nombre       = COALESCE($1, nombre),
         marca        = COALESCE($2, marca),
         modelo       = COALESCE($3, modelo),
         descripcion  = COALESCE($4, descripcion),
         foto_url     = $5,
         manual_url   = $6,
         actualizado_en = NOW()
       WHERE id = $7`,
      [
        fields.nombre      || null,
        fields.marca       || null,
        fields.modelo      || null,
        fields.descripcion || null,
        fields.foto_url    ?? null,
        fields.manual_url  ?? null,
        id,
      ]
    );
  }

  static async upsertEspecialidades(client, plantillaId, especialidades) {
    await client.query(
      `DELETE FROM articulo_plantilla_especialidad WHERE plantilla_id = $1`,
      [plantillaId]
    );
    for (const esp of especialidades) {
      await client.query(
        `INSERT INTO articulo_plantilla_especialidad (plantilla_id, especialidad)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [plantillaId, esp]
      );
    }
  }

  static async countInstances(client, id) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM articulo WHERE plantilla_id = $1`,
      [id]
    );
    return rows[0].n;
  }

  static async insertCertificacion(client, plantillaId, nombre, url) {
    await client.query(
      `INSERT INTO articulo_plantilla_certificacion (plantilla_id, nombre, url)
       VALUES ($1, $2, $3)`,
      [plantillaId, nombre || null, url]
    );
  }

  static async getCertCount(client, plantillaId) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM articulo_plantilla_certificacion WHERE plantilla_id = $1`,
      [plantillaId]
    );
    return rows[0].n;
  }
}

function normalizeRow(row) {
  return {
    ...row,
    especialidades: (row.especialidades_raw || []).map((e) => e.especialidad).filter(Boolean),
    especialidades_raw: undefined,
  };
}

module.exports = PlantillaModel;
