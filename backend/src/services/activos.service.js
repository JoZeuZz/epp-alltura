const crypto = require('crypto');
const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');

const CUSTODIA_STATE_BY_DISPOSICION = {
  devuelto: 'devuelta',
  perdido: 'perdida',
  baja: 'baja',
  mantencion: 'mantencion',
};

const ACTIVO_STATE_BY_DISPOSICION = {
  devuelto: 'en_stock',
  perdido: 'perdido',
  baja: 'dado_de_baja',
  mantencion: 'mantencion',
};

const MOV_ACTIVO_TYPE_BY_DISPOSICION = {
  devuelto: 'devolucion',
  perdido: 'ajuste',
  baja: 'baja',
  mantencion: 'mantencion',
};

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const hashValue = (value) =>
  crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');

class ActivosService {
  static async _validateWorkerActive(client, trabajadorId) {
    const { rows } = await client.query(
      `SELECT t.id, t.estado, p.estado AS persona_estado
       FROM trabajador t
       INNER JOIN persona p ON p.id = t.persona_id
       WHERE t.id = $1
       LIMIT 1`,
      [trabajadorId]
    );

    if (!rows.length) throw buildError('Trabajador no encontrado', 400);
    const worker = rows[0];
    if (worker.estado !== 'activo' || worker.persona_estado !== 'activo') {
      throw buildError('El trabajador debe estar activo para recibir movimientos', 400);
    }
  }

  static async _validateEntregaRoute(client, { bodega_origen_id, proyecto_destino_id }) {
    if (bodega_origen_id === proyecto_destino_id) {
      throw buildError('La bodega de origen y el proyecto de destino deben ser diferentes', 400);
    }

    const [bodegaResult, proyectoResult] = await Promise.all([
      client.query(`SELECT id, estado FROM bodegas WHERE id = $1`, [bodega_origen_id]),
      client.query(`SELECT id, estado FROM proyectos WHERE id = $1`, [proyecto_destino_id]),
    ]);

    if (!bodegaResult.rows.length) throw buildError('La bodega de origen no existe', 400);
    if (!proyectoResult.rows.length) throw buildError('El proyecto de destino no existe', 400);
    if (bodegaResult.rows[0].estado !== 'activo') throw buildError('La bodega de origen debe estar activa', 400);
    if (proyectoResult.rows[0].estado === 'inactivo') throw buildError('El proyecto de destino no puede estar inactivo', 400);
  }

  static async _validateReceivingBodega(client, bodegaId) {
    const { rows } = await client.query(
      `SELECT id, estado FROM bodegas WHERE id = $1 LIMIT 1`,
      [bodegaId]
    );

    if (!rows.length) {
      throw buildError('Bodega de recepción no encontrada', 400, 'BODEGA_NOT_FOUND');
    }
    if (rows[0].estado !== 'activo') {
      throw buildError('La bodega de recepción debe estar activa', 400, 'BODEGA_NOT_ACTIVE');
    }
  }

  static async entregar(activoId, payload, userId) {
    const firmaImagenUrl = String(payload.firma_imagen_url || '').trim();
    if (!firmaImagenUrl) {
      throw buildError('La firma es obligatoria', 400, 'SIGNATURE_REQUIRED');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const activoResult = await client.query(
        `SELECT id, estado, bodega_actual_id, articulo_id FROM activo WHERE id = $1 FOR UPDATE`,
        [activoId]
      );
      if (!activoResult.rows.length) throw buildError('Activo no encontrado', 404, 'ASSET_NOT_FOUND');
      const activo = activoResult.rows[0];

      if (activo.estado !== 'en_stock') {
        throw buildError('El activo no está disponible para entrega', 409, 'ASSET_NOT_AVAILABLE');
      }
      if (activo.bodega_actual_id !== payload.bodega_origen_id) {
        throw buildError('El activo no está en la bodega de origen indicada', 409, 'ASSET_WRONG_LOCATION');
      }

      await ActivosService._validateWorkerActive(client, payload.trabajador_id);
      await ActivosService._validateEntregaRoute(client, {
        bodega_origen_id: payload.bodega_origen_id,
        proyecto_destino_id: payload.proyecto_destino_id,
      });

      const custodiaCheck = await client.query(
        `SELECT id FROM custodia_activo WHERE activo_id = $1 AND estado = 'activa' LIMIT 1 FOR UPDATE`,
        [activoId]
      );
      if (custodiaCheck.rows.length) {
        throw buildError('El activo ya tiene una custodia activa', 409, 'ACTIVE_CUSTODY_EXISTS');
      }

      const entregaResult = await client.query(
        `INSERT INTO entrega (
          creado_por_usuario_id, trabajador_id, bodega_origen_id, proyecto_destino_id,
          tipo, estado, nota_destino, fecha_devolucion_esperada, confirmada_en
        ) VALUES ($1, $2, $3, $4, 'entrega', 'confirmada', $5, $6, NOW())
        RETURNING id`,
        [
          userId,
          payload.trabajador_id,
          payload.bodega_origen_id,
          payload.proyecto_destino_id,
          payload.notas || null,
          payload.fecha_devolucion_esperada || null,
        ]
      );
      const entregaId = entregaResult.rows[0].id;

      await client.query(
        `INSERT INTO entrega_detalle (
          entrega_id, articulo_id, activo_id, lote_id, cantidad, tipo_item_entrega, condicion_salida, notas
        ) VALUES ($1, $2, $3, NULL, 1, 'retornable', $4, $5)`,
        [entregaId, activo.articulo_id, activoId, payload.condicion_salida || 'ok', payload.notas || null]
      );

      const textoFirma = 'Entrega directa confirmada';
      await client.query(
        `INSERT INTO firma_entrega (
          entrega_id, trabajador_id, metodo, texto_aceptacion, texto_hash, firma_imagen_url
        ) VALUES ($1, $2, 'en_dispositivo', $3, $4, $5)`,
        [entregaId, payload.trabajador_id, textoFirma, hashValue(textoFirma), firmaImagenUrl]
      );

      await client.query(
        `UPDATE activo SET estado = 'asignado', bodega_actual_id = NULL, proyecto_actual_id = $1 WHERE id = $2`,
        [payload.proyecto_destino_id, activoId]
      );

      const custodiaResult = await client.query(
        `INSERT INTO custodia_activo (
          activo_id, trabajador_id, proyecto_id, entrega_id, estado, fecha_devolucion_esperada
        ) VALUES ($1, $2, $3, $4, 'activa', $5)
        RETURNING id`,
        [
          activoId,
          payload.trabajador_id,
          payload.proyecto_destino_id,
          entregaId,
          payload.fecha_devolucion_esperada || null,
        ]
      );
      const custodiaId = custodiaResult.rows[0].id;

      const movimientoResult = await client.query(
        `INSERT INTO movimiento_activo (
          activo_id, tipo, bodega_origen_id, proyecto_destino_id,
          responsable_usuario_id, entrega_id, notas
        ) VALUES ($1, 'entrega', $2, $3, $4, $5, $6)
        RETURNING id`,
        [activoId, payload.bodega_origen_id, payload.proyecto_destino_id, userId, entregaId, payload.notas || null]
      );
      const movimientoId = movimientoResult.rows[0].id;

      await writeAuditEvent({
        client,
        entidadTipo: 'activo',
        entidadId: activoId,
        accion: 'entregar',
        usuarioId: userId,
        diff: {
          entrega_id: entregaId,
          trabajador_id: payload.trabajador_id,
          proyecto_destino_id: payload.proyecto_destino_id,
        },
      });

      await client.query('COMMIT');
      return { activo_id: activoId, entrega_id: entregaId, custodia_id: custodiaId, movimiento_id: movimientoId, estado: 'confirmada' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async devolver(activoId, payload, userId) {
    const firmaImagenUrl = String(payload.firma_imagen_url || '').trim();
    if (!firmaImagenUrl) {
      throw buildError('La firma es obligatoria', 400, 'SIGNATURE_REQUIRED');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const activoResult = await client.query(
        `SELECT id, estado, proyecto_actual_id, articulo_id FROM activo WHERE id = $1 FOR UPDATE`,
        [activoId]
      );
      if (!activoResult.rows.length) throw buildError('Activo no encontrado', 404, 'ASSET_NOT_FOUND');
      const activo = activoResult.rows[0];

      if (activo.estado !== 'asignado') {
        throw buildError('El activo no está en estado asignado', 409, 'ASSET_NOT_ASSIGNED');
      }

      await ActivosService._validateReceivingBodega(client, payload.bodega_recepcion_id);

      const custodiaResult = await client.query(
        `SELECT * FROM custodia_activo
         WHERE activo_id = $1 AND trabajador_id = $2 AND estado = 'activa' AND hasta_en IS NULL
         ORDER BY desde_en DESC LIMIT 1 FOR UPDATE`,
        [activoId, payload.trabajador_id]
      );
      if (!custodiaResult.rows.length) {
        throw buildError('No existe custodia activa para este activo y trabajador', 409, 'ACTIVE_CUSTODY_NOT_FOUND');
      }
      const custodia = custodiaResult.rows[0];
      const disposition = payload.disposicion;

      const devolucionResult = await client.query(
        `INSERT INTO devolucion (
          trabajador_id, recibido_por_usuario_id, bodega_recepcion_id, estado, confirmada_en, notas
        ) VALUES ($1, $2, $3, 'confirmada', NOW(), $4)
        RETURNING id`,
        [payload.trabajador_id, userId, payload.bodega_recepcion_id, payload.notas || null]
      );
      const devolucionId = devolucionResult.rows[0].id;

      await client.query(
        `INSERT INTO devolucion_detalle (
          devolucion_id, custodia_activo_id, articulo_id, activo_id, lote_id,
          cantidad, condicion_entrada, disposicion, notas
        ) VALUES ($1, $2, $3, $4, NULL, 1, $5, $6, $7)`,
        [devolucionId, custodia.id, activo.articulo_id, activoId, payload.condicion_entrada || 'ok', disposition, payload.notas || null]
      );

      const textoFirma = 'Devolución directa confirmada';
      await client.query(
        `INSERT INTO firma_devolucion (
          devolucion_id, receptor_usuario_id, metodo, texto_aceptacion, texto_hash, firma_imagen_url
        ) VALUES ($1, $2, 'en_dispositivo', $3, $4, $5)`,
        [devolucionId, userId, textoFirma, hashValue(textoFirma), firmaImagenUrl]
      );

      await client.query(
        `UPDATE custodia_activo SET estado = $1, hasta_en = NOW() WHERE id = $2`,
        [CUSTODIA_STATE_BY_DISPOSICION[disposition], custodia.id]
      );

      const returnsToStock = ['devuelto', 'mantencion'].includes(disposition);
      if (returnsToStock) {
        await client.query(
          `UPDATE activo SET estado = $1, bodega_actual_id = $2, proyecto_actual_id = NULL WHERE id = $3`,
          [ACTIVO_STATE_BY_DISPOSICION[disposition], payload.bodega_recepcion_id, activoId]
        );
      } else {
        await client.query(
          `UPDATE activo SET estado = $1 WHERE id = $2`,
          [ACTIVO_STATE_BY_DISPOSICION[disposition], activoId]
        );
      }

      const movimientoResult = await client.query(
        `INSERT INTO movimiento_activo (
          activo_id, tipo, proyecto_origen_id, bodega_destino_id,
          responsable_usuario_id, devolucion_id, notas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          activoId,
          MOV_ACTIVO_TYPE_BY_DISPOSICION[disposition],
          activo.proyecto_actual_id,
          returnsToStock ? payload.bodega_recepcion_id : null,
          userId,
          devolucionId,
          payload.notas || null,
        ]
      );
      const movimientoId = movimientoResult.rows[0].id;

      await writeAuditEvent({
        client,
        entidadTipo: 'activo',
        entidadId: activoId,
        accion: 'devolver',
        usuarioId: userId,
        diff: { devolucion_id: devolucionId, trabajador_id: payload.trabajador_id, disposicion: disposition },
      });

      await client.query('COMMIT');
      return { activo_id: activoId, devolucion_id: devolucionId, custodia_id: custodia.id, movimiento_id: movimientoId, estado: 'confirmada' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ActivosService;
