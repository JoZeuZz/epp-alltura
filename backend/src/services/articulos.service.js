'use strict';

const db = require('../db');
const { uploadFile, deleteFileByUrl } = require('../lib/googleCloud');
const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');

const VALID_ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'];

// Direct state transitions (not via entrega/devolucion)
const TRANSICIONES_DIRECTAS = {
  'en_stock→mantencion':   { mov_tipo: 'mantencion', cambia_bodega: false },
  'en_stock→dado_de_baja': { mov_tipo: 'baja',       cambia_bodega: false },
  'en_stock→perdido':      { mov_tipo: 'ajuste',     cambia_bodega: false },
  'mantencion→en_stock':   { mov_tipo: 'entrada',    cambia_bodega: true  },
  'perdido→en_stock':      { mov_tipo: 'entrada',    cambia_bodega: true  },
  'dado_de_baja→en_stock': { mov_tipo: 'entrada',    cambia_bodega: true  },
};

function deriveCodigo(nroSerie) {
  return String(nroSerie).replace(/\s/g, '').slice(-3).toUpperCase();
}

class ArticulosService {
  static async create(payload, userId, imageFile = null) {
    let uploadedUrl = null;
    if (imageFile) uploadedUrl = await uploadFile(imageFile);

    const codigo = deriveCodigo(payload.nro_serie);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const bodegaResult = await client.query(
        `SELECT id FROM bodegas WHERE id = $1 AND estado = 'activo'`,
        [payload.bodega_id]
      );
      if (!bodegaResult.rows.length) {
        throw buildError('Bodega no encontrada o inactiva', 400, 'BODEGA_NOT_FOUND');
      }

      const result = await client.query(
        `INSERT INTO articulo
           (tipo, nombre, marca, modelo, descripcion, nro_serie, codigo, valor,
            foto_url, estado, bodega_actual_id, fecha_vencimiento, creado_por_usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_stock',$10,$11,$12)
         RETURNING id`,
        [
          payload.tipo, payload.nombre,
          payload.marca || null, payload.modelo || null, payload.descripcion || null,
          payload.nro_serie, codigo,
          payload.valor ?? 0,
          uploadedUrl || payload.foto_url || null,
          payload.bodega_id,
          payload.fecha_vencimiento || null,
          userId,
        ]
      );

      const articuloId = result.rows[0].id;

      if (Array.isArray(payload.especialidades)) {
        for (const esp of payload.especialidades) {
          if (!VALID_ESPECIALIDADES.includes(esp)) {
            throw buildError(`Especialidad inválida: ${esp}`, 400, 'INVALID_ESPECIALIDAD');
          }
          await client.query(
            `INSERT INTO articulo_especialidad (articulo_id, especialidad)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [articuloId, esp]
          );
        }
      }

      await client.query(
        `INSERT INTO movimiento_activo
           (articulo_id, tipo, bodega_destino_id, responsable_usuario_id, notas)
         VALUES ($1, 'entrada', $2, $3, 'Creación de artículo')`,
        [articuloId, payload.bodega_id, userId]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'articulo',
        entidadId: articuloId,
        accion: 'crear',
        usuarioId: userId,
        diff: { tipo: payload.tipo, nombre: payload.nombre, nro_serie: payload.nro_serie },
      });

      const data = await ArticulosService._getByIdWithClient(client, articuloId);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      if (uploadedUrl) await deleteFileByUrl(uploadedUrl);
      throw error;
    } finally {
      client.release();
    }
  }

  static async list({ tipo, estado, bodega_id, proyecto_id, especialidad, search, limit = 50, offset = 0 } = {}) {
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

    const rows = await db.query(
      `SELECT a.*,
              COALESCE(json_agg(ae.especialidad ORDER BY ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
              b.nombre  AS bodega_nombre,
              pr.nombre AS proyecto_nombre
       FROM articulo a
       LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
       LEFT JOIN bodegas b   ON b.id  = a.bodega_actual_id
       LEFT JOIN proyectos pr ON pr.id = a.proyecto_actual_id
       ${where}
       GROUP BY a.id, b.nombre, pr.nombre
       ORDER BY a.creado_en DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, Number(limit), Number(offset)]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM articulo a ${where}`,
      params
    );

    return { items: rows.rows, total: parseInt(countResult.rows[0].count, 10) };
  }

  static async getById(id) {
    const client = await db.pool.connect();
    try {
      return await ArticulosService._getByIdWithClient(client, id);
    } finally {
      client.release();
    }
  }

  static async _getByIdWithClient(client, id) {
    const result = await client.query(
      `SELECT a.*,
              COALESCE(json_agg(ae.especialidad ORDER BY ae.especialidad) FILTER (WHERE ae.especialidad IS NOT NULL), '[]') AS especialidades,
              b.nombre  AS bodega_nombre,
              pr.nombre AS proyecto_nombre,
              u.email_login AS creado_por_email
       FROM articulo a
       LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
       LEFT JOIN bodegas b    ON b.id  = a.bodega_actual_id
       LEFT JOIN proyectos pr ON pr.id = a.proyecto_actual_id
       LEFT JOIN usuario u    ON u.id  = a.creado_por_usuario_id
       WHERE a.id = $1
       GROUP BY a.id, b.nombre, pr.nombre, u.email_login`,
      [id]
    );
    if (!result.rows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    return result.rows[0];
  }

  static async update(id, payload, userId, imageFile = null) {
    let uploadedUrl = null;
    if (imageFile) uploadedUrl = await uploadFile(imageFile);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id, foto_url, nro_serie FROM articulo WHERE id = $1 FOR UPDATE`, [id]
      );
      if (!existing.rows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');

      const old = existing.rows[0];
      const newNroSerie = payload.nro_serie ?? old.nro_serie;
      const newCodigo   = deriveCodigo(newNroSerie);
      const newFotoUrl  = uploadedUrl || payload.foto_url || old.foto_url;

      await client.query(
        `UPDATE articulo SET
           nombre            = COALESCE($1, nombre),
           marca             = COALESCE($2, marca),
           modelo            = COALESCE($3, modelo),
           descripcion       = COALESCE($4, descripcion),
           nro_serie         = $5,
           codigo            = $6,
           valor             = COALESCE($7, valor),
           foto_url          = $8,
           fecha_vencimiento = $9
         WHERE id = $10`,
        [
          payload.nombre || null, payload.marca || null,
          payload.modelo || null, payload.descripcion || null,
          newNroSerie, newCodigo,
          payload.valor ?? null,
          newFotoUrl,
          payload.fecha_vencimiento || null,
          id,
        ]
      );

      if (Array.isArray(payload.especialidades)) {
        await client.query(`DELETE FROM articulo_especialidad WHERE articulo_id = $1`, [id]);
        for (const esp of payload.especialidades) {
          if (!VALID_ESPECIALIDADES.includes(esp)) {
            throw buildError(`Especialidad inválida: ${esp}`, 400, 'INVALID_ESPECIALIDAD');
          }
          await client.query(
            `INSERT INTO articulo_especialidad (articulo_id, especialidad) VALUES ($1, $2)`,
            [id, esp]
          );
        }
      }

      if (uploadedUrl && old.foto_url) await deleteFileByUrl(old.foto_url);

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: id,
        accion: 'actualizar', usuarioId: userId, diff: payload,
      });

      const data = await ArticulosService._getByIdWithClient(client, id);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      if (uploadedUrl) await deleteFileByUrl(uploadedUrl);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePermanent(id, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT id, estado, foto_url FROM articulo WHERE id = $1 FOR UPDATE`, [id]
      );
      if (!result.rows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');

      const art = result.rows[0];
      if (art.estado === 'asignado') {
        throw buildError('No se puede eliminar un artículo con custodia activa', 409, 'ARTICULO_ASSIGNED');
      }

      await client.query(`DELETE FROM articulo WHERE id = $1`, [id]);
      if (art.foto_url) await deleteFileByUrl(art.foto_url);

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: id,
        accion: 'eliminar', usuarioId: userId, diff: {},
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cambiarEstado(id, { nuevo_estado, motivo, bodega_destino_id }, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT id, estado, bodega_actual_id FROM articulo WHERE id = $1 FOR UPDATE`, [id]
      );
      if (!result.rows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');

      const art = result.rows[0];
      const key = `${art.estado}→${nuevo_estado}`;
      const transicion = TRANSICIONES_DIRECTAS[key];
      if (!transicion) {
        throw buildError(
          `Transición no permitida: ${art.estado} → ${nuevo_estado}`,
          422, 'INVALID_STATE_TRANSITION'
        );
      }

      const custodiaResult = await client.query(
        `SELECT id FROM custodia_activo WHERE articulo_id = $1 AND estado = 'activa' LIMIT 1`,
        [id]
      );
      if (custodiaResult.rows.length) {
        throw buildError(
          'El artículo tiene custodia activa. Debe procesarse mediante devolución.',
          422, 'ACTIVE_CUSTODY_EXISTS'
        );
      }

      let nuevaBodega = null;
      if (transicion.cambia_bodega) {
        if (!bodega_destino_id) {
          throw buildError('Se requiere bodega_destino_id para esta transición', 400, 'BODEGA_REQUIRED');
        }
        const ubResult = await client.query(
          `SELECT id FROM bodegas WHERE id = $1`, [bodega_destino_id]
        );
        if (!ubResult.rows.length) throw buildError('Bodega no encontrada', 404, 'BODEGA_NOT_FOUND');
        nuevaBodega = bodega_destino_id;
      }

      const returnsToStock = nuevo_estado === 'en_stock';
      await client.query(
        `UPDATE articulo SET
           estado             = $1,
           bodega_actual_id   = $2,
           proyecto_actual_id = NULL
         WHERE id = $3`,
        [nuevo_estado, returnsToStock ? nuevaBodega : null, id]
      );

      await client.query(
        `INSERT INTO movimiento_activo
           (articulo_id, tipo, bodega_origen_id, bodega_destino_id, responsable_usuario_id, notas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id, transicion.mov_tipo,
          art.bodega_actual_id,
          returnsToStock ? nuevaBodega : null,
          userId, motivo || null,
        ]
      );

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: id,
        accion: 'actualizar', usuarioId: userId,
        diff: { estado: nuevo_estado, motivo },
      });

      await client.query('COMMIT');
      return await ArticulosService.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { ArticulosService, deriveCodigo };
