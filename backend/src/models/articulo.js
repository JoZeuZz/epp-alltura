'use strict';

const db = require('../db');
const { normalizePagination } = require('./modelUtils');

const RICH_SELECT = `
  SELECT a.*,
    COALESCE(json_agg(DISTINCT ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
    COALESCE(
      json_agg(DISTINCT json_build_object('id', ac.id, 'nombre', ac.nombre, 'url', ac.url, 'creado_en', ac.creado_en))
      FILTER (WHERE ac.id IS NOT NULL),
      '[]'::json
    ) ||
    COALESCE(
      json_agg(DISTINCT json_build_object('id', pc.id, 'nombre', pc.nombre, 'url', pc.url, 'creado_en', pc.creado_en))
      FILTER (WHERE pc.id IS NOT NULL),
      '[]'::json
    ) AS certificaciones,
    b.nombre   AS bodega_nombre,
    pr.nombre  AS proyecto_nombre,
    b.ciudad   AS bodega_ciudad,
    pr.ciudad  AS proyecto_ciudad,
    pr.estado  AS proyecto_estado,
    CASE
      WHEN pr.estado = 'finalizado' AND a.proyecto_actual_id IS NOT NULL THEN true
      ELSE false
    END AS alerta_devolucion,
    u.email_login AS creado_por_email,
    prov.nombre   AS proveedor_nombre
  FROM articulo a
  LEFT JOIN articulo_especialidad ae          ON ae.articulo_id   = a.id
  LEFT JOIN articulo_certificacion ac         ON ac.articulo_id   = a.id
  LEFT JOIN articulo_plantilla_certificacion pc ON pc.plantilla_id = a.plantilla_id
  LEFT JOIN bodegas b                         ON b.id             = a.bodega_actual_id
  LEFT JOIN proyectos pr                      ON pr.id            = a.proyecto_actual_id
  LEFT JOIN usuario u                         ON u.id             = a.creado_por_usuario_id
  LEFT JOIN proveedor prov                    ON prov.id          = a.proveedor_id
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
          plantilla_id,
          creado_por_usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_stock',$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        fields.tipo,              fields.nombre,
        fields.marca         || null,
        fields.modelo        || null,
        fields.descripcion   || null,
        fields.nro_serie || null,  fields.codigo,
        fields.valor         ?? 0,
        fields.foto_url      || null,
        fields.bodega_id,
        fields.fecha_vencimiento || null,
        fields.fecha_compra      || null,
        fields.proveedor_id      || null,
        fields.factura_url   || null,
        fields.manual_url    || null,
        fields.plantilla_id      || null,
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
         valor             = COALESCE($6,  valor),
         foto_url          = $7,
         fecha_vencimiento = $8,
         fecha_compra      = $9,
         proveedor_id      = $10,
         factura_url       = $11,
         manual_url        = $12
       WHERE id = $13`,
      [
        fields.nombre      || null,
        fields.marca       || null,
        fields.modelo      || null,
        fields.descripcion || null,
        fields.nro_serie,
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

  static async exportAll() {
    const { rows } = await db.query(`
      SELECT a.*,
        COALESCE(
          json_agg(ae.especialidad ORDER BY ae.especialidad)
          FILTER (WHERE ae.especialidad IS NOT NULL),
          '[]'
        ) AS especialidades
      FROM articulo a
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
      GROUP BY a.id
      ORDER BY a.creado_en ASC
    `);
    return rows;
  }

  static async upsertBatch(rows) {
    const client = await db.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query('BEGIN');

      for (const row of rows) {
        await client.query('SAVEPOINT row_save');
        try {
          const result = await client.query(`
            INSERT INTO articulo
              (id, tipo, nombre, marca, modelo, descripcion, nro_serie, codigo, valor,
               foto_url, estado, bodega_actual_id, proyecto_actual_id, fecha_vencimiento,
               fecha_compra, proveedor_id, factura_url, manual_url, plantilla_id,
               creado_por_usuario_id, creado_en)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
            ON CONFLICT (id) DO UPDATE SET
              tipo                 = EXCLUDED.tipo,
              nombre               = EXCLUDED.nombre,
              marca                = EXCLUDED.marca,
              modelo               = EXCLUDED.modelo,
              descripcion          = EXCLUDED.descripcion,
              nro_serie            = EXCLUDED.nro_serie,
              codigo               = EXCLUDED.codigo,
              valor                = EXCLUDED.valor,
              foto_url             = EXCLUDED.foto_url,
              estado               = EXCLUDED.estado,
              bodega_actual_id     = EXCLUDED.bodega_actual_id,
              proyecto_actual_id   = EXCLUDED.proyecto_actual_id,
              fecha_vencimiento    = EXCLUDED.fecha_vencimiento,
              fecha_compra         = EXCLUDED.fecha_compra,
              proveedor_id         = EXCLUDED.proveedor_id,
              factura_url          = EXCLUDED.factura_url,
              manual_url           = EXCLUDED.manual_url,
              plantilla_id         = EXCLUDED.plantilla_id,
              creado_por_usuario_id = EXCLUDED.creado_por_usuario_id
            RETURNING (xmax = 0) AS was_inserted
          `, [
            row.id, row.tipo, row.nombre, row.marca ?? null, row.modelo ?? null,
            row.descripcion ?? null, row.nro_serie ?? null, row.codigo, row.valor ?? null,
            row.foto_url ?? null, row.estado, row.bodega_actual_id ?? null,
            row.proyecto_actual_id ?? null, row.fecha_vencimiento ?? null,
            row.fecha_compra ?? null, row.proveedor_id ?? null,
            row.factura_url ?? null, row.manual_url ?? null,
            row.plantilla_id ?? null, row.creado_por_usuario_id ?? null,
            row.creado_en ?? new Date().toISOString(),
          ]);

          if (result.rows[0].was_inserted) inserted++;
          else updated++;

          // sync especialidades
          const especialidades = Array.isArray(row.especialidades) ? row.especialidades : [];
          await client.query(
            'DELETE FROM articulo_especialidad WHERE articulo_id = $1', [row.id]
          );
          for (const esp of especialidades) {
            await client.query(
              'INSERT INTO articulo_especialidad (articulo_id, especialidad) VALUES ($1,$2) ON CONFLICT DO NOTHING',
              [row.id, esp]
            );
          }
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT row_save');
          errors.push({ id: row.id, error: err.message });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
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
