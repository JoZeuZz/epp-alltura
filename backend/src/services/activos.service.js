// backend/src/services/activos.service.js
const crypto = require('crypto');
const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const EntregasService = require('./entregas.service');
const DevolucionesService = require('./devoluciones.service');

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
  static async entregar(activoId, payload, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const activoResult = await client.query(
        `SELECT * FROM activo WHERE id = $1 FOR UPDATE`,
        [activoId]
      );
      if (!activoResult.rows.length) {
        throw buildError('Activo no encontrado', 404, 'ASSET_NOT_FOUND');
      }
      const activo = activoResult.rows[0];
      if (activo.estado !== 'en_stock') {
        throw buildError('El activo no está disponible para entrega', 409, 'ASSET_NOT_AVAILABLE');
      }
      if (activo.ubicacion_actual_id !== payload.ubicacion_origen_id) {
        throw buildError('El activo no está en la ubicación de origen indicada', 409, 'ASSET_WRONG_LOCATION');
      }

      await EntregasService.validateWorkerActive(client, payload.trabajador_id);
      await EntregasService.validateMovementRoute(client, {
        tipo: 'entrega',
        ubicacion_origen_id: payload.ubicacion_origen_id,
        ubicacion_destino_id: payload.ubicacion_destino_id,
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
          creado_por_usuario_id, trabajador_id, ubicacion_origen_id, ubicacion_destino_id,
          tipo, estado, nota_destino, fecha_devolucion_esperada, confirmada_en
        ) VALUES ($1, $2, $3, $4, 'entrega', 'confirmada', $5, $6, NOW())
        RETURNING id`,
        [
          userId,
          payload.trabajador_id,
          payload.ubicacion_origen_id,
          payload.ubicacion_destino_id,
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
        [entregaId, payload.trabajador_id, textoFirma, hashValue(textoFirma), payload.firma_imagen_url]
      );

      await client.query(
        `UPDATE activo SET estado = 'asignado', ubicacion_actual_id = $1 WHERE id = $2`,
        [payload.ubicacion_destino_id, activoId]
      );

      const custodiaResult = await client.query(
        `INSERT INTO custodia_activo (
          activo_id, trabajador_id, ubicacion_destino_id, entrega_id, estado, fecha_devolucion_esperada
        ) VALUES ($1, $2, $3, $4, 'activa', $5)
        RETURNING id`,
        [
          activoId,
          payload.trabajador_id,
          payload.ubicacion_destino_id,
          entregaId,
          payload.fecha_devolucion_esperada || null,
        ]
      );
      const custodiaId = custodiaResult.rows[0].id;

      const movimientoResult = await client.query(
        `INSERT INTO movimiento_activo (
          activo_id, tipo, ubicacion_origen_id, ubicacion_destino_id,
          responsable_usuario_id, entrega_id, notas
        ) VALUES ($1, 'entrega', $2, $3, $4, $5, $6)
        RETURNING id`,
        [activoId, payload.ubicacion_origen_id, payload.ubicacion_destino_id, userId, entregaId, payload.notas || null]
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
          ubicacion_destino_id: payload.ubicacion_destino_id,
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
}

module.exports = ActivosService;
