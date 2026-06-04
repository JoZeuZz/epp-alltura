'use strict';
const db = require('../db');

async function findActaUrl(tipo, entidadTipo, entidadId) {
  const { rows } = await db.query(`
    SELECT d.archivo_url
    FROM documento d
    JOIN documento_referencia dr ON dr.documento_id = d.id
    WHERE d.tipo = $1
      AND dr.entidad_tipo = $2
      AND dr.entidad_id = $3
    ORDER BY d.creado_en DESC
    LIMIT 1
  `, [tipo, entidadTipo, entidadId]);
  return rows[0]?.archivo_url ?? null;
}

async function saveActaUrl(tipo, entidadTipo, entidadId, archivoUrl, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      DELETE FROM documento
      WHERE id IN (
        SELECT d.id FROM documento d
        JOIN documento_referencia dr ON dr.documento_id = d.id
        WHERE d.tipo = $1
          AND dr.entidad_tipo = $2
          AND dr.entidad_id = $3
      )
    `, [tipo, entidadTipo, entidadId]);

    const { rows } = await client.query(`
      INSERT INTO documento (tipo, archivo_url, creado_por_usuario_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [tipo, archivoUrl, userId]);

    await client.query(`
      INSERT INTO documento_referencia (documento_id, entidad_tipo, entidad_id)
      VALUES ($1, $2, $3)
    `, [rows[0].id, entidadTipo, entidadId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findActaUrl, saveActaUrl };
