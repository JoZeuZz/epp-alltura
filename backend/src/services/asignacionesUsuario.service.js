'use strict';

const db = require('../db');
const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const isUuid = (value) => UUID_REGEX.test(String(value || '').trim());

class AsignacionesUsuarioService {
  /**
   * Assign one or more articles to a system user.
   *
   * @param {object} payload
   * @param {string} payload.usuario_id       - Destination user UUID
   * @param {string[]} payload.articulo_ids   - Array of article UUIDs (1-50)
   * @param {string} payload.origen_tipo      - 'bodega' | 'usuario'
   * @param {string} [payload.bodega_origen_id] - Required when origen_tipo='bodega'
   * @param {string} [payload.notas]
   * @param {string} actorId                  - Authenticated user performing the action
   */
  static async assign(payload, actorId) {
    const { usuario_id, articulo_ids, origen_tipo, bodega_origen_id, notas } = payload;

    // Basic payload validation
    if (!isUuid(usuario_id)) {
      throw buildError('usuario_id inválido', 400, 'INVALID_USUARIO_ID');
    }

    if (!Array.isArray(articulo_ids) || articulo_ids.length < 1 || articulo_ids.length > 50) {
      throw buildError('articulo_ids debe ser un arreglo de 1 a 50 elementos', 400, 'INVALID_ARTICULO_IDS');
    }

    if (!['bodega', 'usuario'].includes(origen_tipo)) {
      throw buildError('origen_tipo debe ser "bodega" o "usuario"', 400, 'INVALID_ORIGEN_TIPO');
    }

    if (origen_tipo === 'bodega' && !isUuid(bodega_origen_id)) {
      throw buildError('bodega_origen_id es requerido cuando origen_tipo es "bodega"', 400, 'BODEGA_ORIGEN_REQUIRED');
    }

    const uniqueIds = [...new Set(articulo_ids.map((id) => String(id).trim()))];
    for (const id of uniqueIds) {
      if (!isUuid(id)) {
        throw buildError(`articulo_id inválido: ${id}`, 400, 'INVALID_ARTICULO_ID');
      }
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate destination user exists and is activo
      const userResult = await client.query(
        `SELECT u.id, u.estado AS usuario_estado, p.estado AS persona_estado
         FROM usuario u
         INNER JOIN persona p ON p.id = u.persona_id
         WHERE u.id = $1
         LIMIT 1`,
        [usuario_id]
      );

      if (!userResult.rows.length) {
        throw buildError('Usuario destino no encontrado', 404, 'USER_NOT_FOUND');
      }

      const destUser = userResult.rows[0];
      if (destUser.usuario_estado !== 'activo' || destUser.persona_estado !== 'activo') {
        throw buildError('El usuario destino debe estar activo', 400, 'USER_NOT_ACTIVE');
      }

      // Validate bodega if needed
      if (origen_tipo === 'bodega') {
        const bodegaResult = await client.query(
          `SELECT id, estado FROM bodegas WHERE id = $1 LIMIT 1`,
          [bodega_origen_id]
        );
        if (!bodegaResult.rows.length) {
          throw buildError('Bodega de origen no encontrada', 404, 'BODEGA_NOT_FOUND');
        }
        if (bodegaResult.rows[0].estado !== 'activo') {
          throw buildError('La bodega de origen debe estar activa', 400, 'BODEGA_NOT_ACTIVE');
        }
      }

      const createdIds = [];

      for (const articuloId of uniqueIds) {
        // Lock the article row
        const artResult = await client.query(
          `SELECT id, estado, bodega_actual_id, usuario_actual_id,
                  COALESCE(nro_serie, nombre, 'artículo') AS label
           FROM articulo
           WHERE id = $1
           FOR UPDATE`,
          [articuloId]
        );

        if (!artResult.rows.length) {
          throw buildError(`Artículo ${articuloId} no encontrado`, 404, 'ASSET_NOT_FOUND');
        }

        const asset = artResult.rows[0];

        if (origen_tipo === 'bodega') {
          if (asset.estado !== 'en_stock') {
            throw buildError(
              `El artículo "${asset.label}" no está en stock`,
              409,
              'ASSET_NOT_IN_STOCK'
            );
          }
          if (asset.bodega_actual_id !== bodega_origen_id) {
            throw buildError(
              `El artículo "${asset.label}" no se encuentra en la bodega de origen`,
              409,
              'ASSET_WRONG_BODEGA'
            );
          }
        } else {
          // origen_tipo === 'usuario'
          if (asset.estado !== 'asignado') {
            throw buildError(
              `El artículo "${asset.label}" no está asignado al usuario`,
              409,
              'ASSET_NOT_ASSIGNED'
            );
          }
          if (asset.usuario_actual_id !== actorId) {
            throw buildError(
              `El artículo "${asset.label}" no está asignado al usuario actual`,
              409,
              'ASSET_NOT_OWNED_BY_ACTOR'
            );
          }
        }

        // Check no active asignacion_usuario exists
        const activeAsig = await client.query(
          `SELECT id FROM asignacion_usuario
           WHERE articulo_id = $1 AND estado = 'activa'
           LIMIT 1
           FOR UPDATE`,
          [articuloId]
        );

        if (activeAsig.rows.length) {
          throw buildError(
            `El artículo "${asset.label}" ya tiene una asignación activa`,
            409,
            'ACTIVE_ASSIGNMENT_EXISTS'
          );
        }

        // Insert asignacion_usuario
        const asigResult = await client.query(
          `INSERT INTO asignacion_usuario (
             articulo_id,
             usuario_id,
             asignado_por_usuario_id,
             bodega_origen_id,
             usuario_origen_id,
             estado,
             notas
           )
           VALUES ($1, $2, $3, $4, $5, 'activa', $6)
           RETURNING id`,
          [
            articuloId,
            usuario_id,
            actorId,
            origen_tipo === 'bodega' ? bodega_origen_id : null,
            origen_tipo === 'usuario' ? actorId : null,
            notas || null,
          ]
        );

        const asignacionId = asigResult.rows[0].id;

        // Update article state
        await client.query(
          `UPDATE articulo
           SET estado = 'asignado',
               bodega_actual_id = NULL,
               proyecto_actual_id = NULL,
               usuario_actual_id = $1
           WHERE id = $2`,
          [usuario_id, articuloId]
        );

        // Insert movement record
        await client.query(
          `INSERT INTO movimiento_activo (
             articulo_id,
             tipo,
             bodega_origen_id,
             usuario_origen_id,
             usuario_destino_id,
             responsable_usuario_id,
             asignacion_id,
             notas
           )
           VALUES ($1, 'asignacion_usuario', $2, $3, $4, $5, $6, $7)`,
          [
            articuloId,
            origen_tipo === 'bodega' ? bodega_origen_id : null,
            origen_tipo === 'usuario' ? actorId : null,
            usuario_id,
            actorId,
            asignacionId,
            notas || null,
          ]
        );

        createdIds.push(asignacionId);
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'asignacion_usuario',
        entidadId: createdIds[0],
        accion: 'crear',
        usuarioId: actorId,
        diff: {
          usuario_id,
          origen_tipo,
          bodega_origen_id: bodega_origen_id || null,
          cantidad_articulos: createdIds.length,
        },
      });

      await client.query('COMMIT');
      return { ok: true, asignaciones_creadas: createdIds.length, ids: createdIds };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get articles currently assigned to the authenticated user.
   *
   * @param {string} userId
   * @param {object} filters - { tipo, search, limit, offset }
   */
  static async getMias(userId, filters = {}) {
    const limit = Math.min(Number(filters.limit) || 100, 200);
    const offset = Number(filters.offset) || 0;

    const conditions = [`a.usuario_actual_id = $1`, `au.estado = 'activa'`];
    const values = [userId];

    if (filters.tipo) {
      values.push(String(filters.tipo));
      conditions.push(`a.tipo = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${String(filters.search).trim()}%`);
      const idx = values.length;
      conditions.push(
        `(a.nombre ILIKE $${idx} OR a.codigo ILIKE $${idx} OR a.nro_serie ILIKE $${idx})`
      );
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    values.push(Number(limit), Number(offset));
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const query = `
      SELECT
        a.id,
        a.tipo,
        a.nombre,
        a.marca,
        a.modelo,
        a.codigo,
        a.nro_serie,
        a.estado,
        a.valor,
        a.foto_url,
        a.fecha_vencimiento,
        au.id AS asignacion_id,
        au.desde_en AS asignado_en,
        au.notas AS asignacion_notas,
        b_orig.nombre AS bodega_origen_nombre,
        (p_asig.nombres || ' ' || p_asig.apellidos) AS asignado_por_nombre
      FROM articulo a
      INNER JOIN asignacion_usuario au ON au.articulo_id = a.id AND au.estado = 'activa'
      LEFT JOIN bodegas b_orig ON b_orig.id = au.bodega_origen_id
      LEFT JOIN usuario u_asig ON u_asig.id = au.asignado_por_usuario_id
      LEFT JOIN persona p_asig ON p_asig.id = u_asig.persona_id
      ${whereClause}
      ORDER BY au.desde_en DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const { rows } = await db.query(query, values);
    return { items: rows, total: rows.length };
  }

  /**
   * Return articles from authenticated user back to a bodega.
   *
   * @param {object} payload - { articulo_ids[], bodega_destino_id, notas? }
   * @param {string} actorId
   */
  static async devolverBodega(payload, actorId) {
    const { articulo_ids, bodega_destino_id, notas } = payload;

    if (!isUuid(bodega_destino_id)) {
      throw buildError('bodega_destino_id inválido', 400, 'INVALID_BODEGA_DESTINO_ID');
    }

    if (!Array.isArray(articulo_ids) || articulo_ids.length < 1 || articulo_ids.length > 50) {
      throw buildError('articulo_ids debe ser un arreglo de 1 a 50 elementos', 400, 'INVALID_ARTICULO_IDS');
    }

    const uniqueIds = [...new Set(articulo_ids.map((id) => String(id).trim()))];
    for (const id of uniqueIds) {
      if (!isUuid(id)) {
        throw buildError(`articulo_id inválido: ${id}`, 400, 'INVALID_ARTICULO_ID');
      }
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate destination bodega
      const bodegaResult = await client.query(
        `SELECT id, estado FROM bodegas WHERE id = $1 LIMIT 1`,
        [bodega_destino_id]
      );

      if (!bodegaResult.rows.length) {
        throw buildError('Bodega de destino no encontrada', 404, 'BODEGA_NOT_FOUND');
      }

      if (bodegaResult.rows[0].estado !== 'activo') {
        throw buildError('La bodega de destino debe estar activa', 400, 'BODEGA_NOT_ACTIVE');
      }

      const closedIds = [];

      for (const articuloId of uniqueIds) {
        // Lock article
        const artResult = await client.query(
          `SELECT id, estado, usuario_actual_id,
                  COALESCE(nro_serie, nombre, 'artículo') AS label
           FROM articulo
           WHERE id = $1
           FOR UPDATE`,
          [articuloId]
        );

        if (!artResult.rows.length) {
          throw buildError(`Artículo ${articuloId} no encontrado`, 404, 'ASSET_NOT_FOUND');
        }

        const asset = artResult.rows[0];

        if (asset.usuario_actual_id !== actorId) {
          throw buildError(
            `El artículo "${asset.label}" no está asignado al usuario actual`,
            409,
            'ASSET_NOT_OWNED_BY_ACTOR'
          );
        }

        // Lock active assignment
        const asigResult = await client.query(
          `SELECT id FROM asignacion_usuario
           WHERE articulo_id = $1 AND estado = 'activa'
           LIMIT 1
           FOR UPDATE`,
          [articuloId]
        );

        if (!asigResult.rows.length) {
          throw buildError(
            `El artículo "${asset.label}" no tiene asignación activa`,
            409,
            'NO_ACTIVE_ASSIGNMENT'
          );
        }

        const asignacionId = asigResult.rows[0].id;

        // Close the assignment
        await client.query(
          `UPDATE asignacion_usuario
           SET estado = 'cerrada',
               hasta_en = NOW(),
               cerrado_por_usuario_id = $1,
               motivo_cierre = 'devolucion_bodega'
           WHERE id = $2`,
          [actorId, asignacionId]
        );

        // Update article back to stock
        await client.query(
          `UPDATE articulo
           SET estado = 'en_stock',
               bodega_actual_id = $1,
               proyecto_actual_id = NULL,
               usuario_actual_id = NULL
           WHERE id = $2`,
          [bodega_destino_id, articuloId]
        );

        // Insert movement record
        await client.query(
          `INSERT INTO movimiento_activo (
             articulo_id,
             tipo,
             usuario_origen_id,
             bodega_destino_id,
             responsable_usuario_id,
             asignacion_id,
             notas
           )
           VALUES ($1, 'devolucion_usuario_bodega', $2, $3, $4, $5, $6)`,
          [articuloId, actorId, bodega_destino_id, actorId, asignacionId, notas || null]
        );

        closedIds.push(asignacionId);
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'asignacion_usuario',
        entidadId: closedIds[0],
        accion: 'actualizar',
        usuarioId: actorId,
        diff: {
          accion: 'devolucion_bodega',
          bodega_destino_id,
          cantidad_articulos: closedIds.length,
        },
      });

      await client.query('COMMIT');
      return { ok: true, cerradas: closedIds.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get assignment history for a user.
   *
   * @param {string} userId
   * @param {object} filters - { limit, offset }
   */
  static async getHistorial(userId, filters = {}) {
    const limit = Math.min(Number(filters.limit) || 100, 200);
    const offset = Number(filters.offset) || 0;

    const query = `
      SELECT
        a.id,
        a.tipo,
        a.nombre,
        a.marca,
        a.modelo,
        a.codigo,
        a.nro_serie,
        a.estado,
        a.valor,
        a.foto_url,
        a.fecha_vencimiento,
        au.id AS asignacion_id,
        au.estado AS asignacion_estado,
        au.desde_en AS asignado_en,
        au.hasta_en AS devuelto_en,
        au.motivo_cierre,
        au.notas AS asignacion_notas,
        b_orig.nombre AS bodega_origen_nombre,
        (p_asig.nombres || ' ' || p_asig.apellidos) AS asignado_por_nombre
      FROM asignacion_usuario au
      INNER JOIN articulo a ON a.id = au.articulo_id
      LEFT JOIN bodegas b_orig ON b_orig.id = au.bodega_origen_id
      LEFT JOIN usuario u_asig ON u_asig.id = au.asignado_por_usuario_id
      LEFT JOIN persona p_asig ON p_asig.id = u_asig.persona_id
      WHERE au.usuario_id = $1
      ORDER BY au.desde_en DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await db.query(query, [userId, Number(limit), Number(offset)]);
    return { items: rows, total: rows.length };
  }
}

module.exports = AsignacionesUsuarioService;
