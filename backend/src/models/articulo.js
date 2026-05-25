'use strict';

const db = require('../db');
const { normalizePagination } = require('./modelUtils');

const RICH_SELECT = `
  SELECT a.*,
    COALESCE(json_agg(ae.especialidad ORDER BY ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
    COALESCE(
      json_agg(
        json_build_object('id', ac.id, 'nombre', ac.nombre, 'url', ac.url, 'creado_en', ac.creado_en)
        ORDER BY ac.creado_en
      ) FILTER (WHERE ac.id IS NOT NULL),
      '[]'
    ) AS certificaciones,
    b.nombre   AS bodega_nombre,
    pr.nombre  AS proyecto_nombre,
    b.ciudad   AS bodega_ciudad,
    pr.ciudad  AS proyecto_ciudad,
    u.email_login AS creado_por_email,
    prov.nombre   AS proveedor_nombre
  FROM articulo a
  LEFT JOIN articulo_especialidad ae   ON ae.articulo_id   = a.id
  LEFT JOIN articulo_certificacion ac  ON ac.articulo_id   = a.id
  LEFT JOIN bodegas b                  ON b.id             = a.bodega_actual_id
  LEFT JOIN proyectos pr               ON pr.id            = a.proyecto_actual_id
  LEFT JOIN usuario u                  ON u.id             = a.creado_por_usuario_id
  LEFT JOIN proveedor prov             ON prov.id          = a.proveedor_id
`;

class ArticuloModel {
  static async findAll(filters = {}) {
    const { tipo, estado, bodega_id, proyecto_id, especialidad, search } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);
    const conditions = [];
    const params = [];
    let p = 1;

    if (tipo)        { conditions.push(`a.tipo = $${p++}`);               params.push(tipo); }
    if (estado)      { conditions.push(`a.estado = $${p++}`);             params.push(estado); }
    if (bodega_id)   { conditions.push(`a.bodega_actual_id = $${p++}`);   params.push(bodega_id); }
    if (proyecto_id) { conditions.push(`a.proyecto_actual_id = $${p++}`); params.push(proyecto_id); }
    if (search) {
      conditions.push(`(a.nombre ILIKE $${p} OR a.nro_serie ILIKE $${p} OR a.codigo ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }
    if (especialidad) {
      conditions.push(
        `EXISTS (SELECT 1 FROM articulo_especialidad ae WHERE ae.articulo_id = a.id AND ae.especialidad = $${p++})`
      );
      params.push(especialidad);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT a.*,
              COALESCE(json_agg(ae.especialidad ORDER BY ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
              b.nombre   AS bodega_nombre,
              pr.nombre  AS proyecto_nombre,
              b.ciudad   AS bodega_ciudad,
              pr.ciudad  AS proyecto_ciudad
       FROM articulo a
       LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
       LEFT JOIN bodegas b                ON b.id           = a.bodega_actual_id
       LEFT JOIN proyectos pr             ON pr.id          = a.proyecto_actual_id
       ${where}
       GROUP BY a.id, b.nombre, pr.nombre, b.ciudad, pr.ciudad
       ORDER BY a.creado_en DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, Number(limit), Number(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM articulo a ${where}`,
      params
    );

    return { items: result.rows, total: parseInt(countResult.rows[0].count, 10) };
  }

  static async findByIdWithClient(client, id) {
    const result = await client.query(
      `${RICH_SELECT}
       WHERE a.id = $1
       GROUP BY a.id, b.nombre, pr.nombre, b.ciudad, pr.ciudad, u.email_login, prov.nombre`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const client = await db.pool.connect();
    try {
      return await ArticuloModel.findByIdWithClient(client, id);
    } finally {
      client.release();
    }
  }

  static async getRawForUpdate(client, id) {
    const { rows } = await client.query(
      `SELECT id, estado, foto_url, factura_url, manual_url, nro_serie, proveedor_id, fecha_compra, fecha_vencimiento
       FROM articulo WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  }

  static async getForStateChange(client, id) {
    const { rows } = await client.query(
      `SELECT id, estado, bodega_actual_id, proyecto_actual_id FROM articulo WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  }

  static async insert(client, fields) {
    const result = await client.query(
      `INSERT INTO articulo
         (tipo, nombre, marca, modelo, descripcion, nro_serie, codigo, valor,
          foto_url, estado, bodega_actual_id, fecha_vencimiento,
          fecha_compra, proveedor_id, factura_url, manual_url,
          creado_por_usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_stock',$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        fields.tipo,              fields.nombre,
        fields.marca         || null,
        fields.modelo        || null,
        fields.descripcion   || null,
        fields.nro_serie,         fields.codigo,
        fields.valor         ?? 0,
        fields.foto_url      || null,
        fields.bodega_id,
        fields.fecha_vencimiento || null,
        fields.fecha_compra      || null,
        fields.proveedor_id      || null,
        fields.factura_url   || null,
        fields.manual_url    || null,
        fields.creado_por_usuario_id,
      ]
    );
    return result.rows[0].id;
  }

  static async updateFields(client, id, fields) {
    await client.query(
      `UPDATE articulo SET
         nombre            = COALESCE($1,  nombre),
         marca             = COALESCE($2,  marca),
         modelo            = COALESCE($3,  modelo),
         descripcion       = COALESCE($4,  descripcion),
         nro_serie         = $5,
         codigo            = $6,
         valor             = COALESCE($7,  valor),
         foto_url          = $8,
         fecha_vencimiento = $9,
         fecha_compra      = $10,
         proveedor_id      = $11,
         factura_url       = $12,
         manual_url        = $13
       WHERE id = $14`,
      [
        fields.nombre      || null,
        fields.marca       || null,
        fields.modelo      || null,
        fields.descripcion || null,
        fields.nro_serie,  fields.codigo,
        fields.valor       ?? null,
        fields.foto_url,
        fields.fecha_vencimiento,
        fields.fecha_compra,
        fields.proveedor_id,
        fields.factura_url,
        fields.manual_url,
        id,
      ]
    );
  }

  static async updateEstado(client, id, { estado, bodega_actual_id, proyecto_actual_id }) {
    await client.query(
      `UPDATE articulo SET estado = $1, bodega_actual_id = $2, proyecto_actual_id = $3 WHERE id = $4`,
      [estado, bodega_actual_id, proyecto_actual_id, id]
    );
  }

  static async deleteById(client, id) {
    await client.query(`DELETE FROM articulo WHERE id = $1`, [id]);
  }

  static async upsertEspecialidades(client, articuloId, especialidades) {
    await client.query(`DELETE FROM articulo_especialidad WHERE articulo_id = $1`, [articuloId]);
    for (const esp of especialidades) {
      await client.query(
        `INSERT INTO articulo_especialidad (articulo_id, especialidad) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [articuloId, esp]
      );
    }
  }

  static async insertMovimiento(client, { articuloId, tipo, bodegaOrigenId, bodegaDestinoId, responsableUsuarioId, notas }) {
    await client.query(
      `INSERT INTO movimiento_activo
         (articulo_id, tipo, bodega_origen_id, bodega_destino_id, responsable_usuario_id, notas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [articuloId, tipo, bodegaOrigenId || null, bodegaDestinoId || null, responsableUsuarioId, notas || null]
    );
  }

  static async hasCustodiaActiva(client, id) {
    const { rows } = await client.query(
      `SELECT id FROM custodia_activo WHERE articulo_id = $1 AND estado = 'activa' LIMIT 1`,
      [id]
    );
    return rows.length > 0;
  }

  static async getCertInfo(articuloId) {
    const { rows } = await db.query(
      `SELECT a.codigo, COUNT(ac.id)::int AS cert_count
       FROM articulo a
       LEFT JOIN articulo_certificacion ac ON ac.articulo_id = a.id
       WHERE a.id = $1
       GROUP BY a.id, a.codigo`,
      [articuloId]
    );
    return rows[0] || null;
  }

  static async insertCertificacion(client, articuloId, nombre, url) {
    await client.query(
      `INSERT INTO articulo_certificacion (articulo_id, nombre, url) VALUES ($1, $2, $3)`,
      [articuloId, nombre || null, url]
    );
  }

  static async findCertificacion(client, certId, articuloId) {
    const { rows } = await client.query(
      `SELECT id, url FROM articulo_certificacion WHERE id = $1 AND articulo_id = $2 FOR UPDATE`,
      [certId, articuloId]
    );
    return rows[0] || null;
  }

  static async deleteCertificacionById(client, certId) {
    await client.query(`DELETE FROM articulo_certificacion WHERE id = $1`, [certId]);
  }

  static async getCertUrls(client, articuloId) {
    const { rows } = await client.query(
      `SELECT url FROM articulo_certificacion WHERE articulo_id = $1`,
      [articuloId]
    );
    return rows.map((r) => r.url);
  }
}

module.exports = ArticuloModel;
