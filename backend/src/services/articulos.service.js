'use strict';

const ArticuloModel = require('../models/articulo');
const { uploadFile, uploadDocument, deleteFileByUrl } = require('../lib/googleCloud');
const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const db = require('../db');

const VALID_ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'];

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

function validateEspecialidades(especialidades) {
  for (const esp of especialidades) {
    if (!VALID_ESPECIALIDADES.includes(esp)) {
      throw buildError(`Especialidad inválida: ${esp}`, 400, 'INVALID_ESPECIALIDAD');
    }
  }
}

class ArticulosService {
  static async create(payload, userId, files = {}) {
    const fotoFile    = files.foto?.[0]    || null;
    const facturaFile = files.factura?.[0] || null;
    const manualFile  = files.manual?.[0]  || null;

    let uploadedFotoUrl    = null;
    let uploadedFacturaUrl = null;
    let uploadedManualUrl  = null;

    const codigo = deriveCodigo(payload.nro_serie);
    if (fotoFile)    uploadedFotoUrl    = await uploadFile(fotoFile, { folder: 'articulos/fotos', filePrefix: `${codigo}_${payload.nombre}` });
    if (facturaFile) uploadedFacturaUrl = await uploadDocument(facturaFile, { folder: 'articulos/facturas', filePrefix: codigo });
    if (manualFile)  uploadedManualUrl  = await uploadDocument(manualFile, { folder: 'articulos/manuales', filePrefix: codigo });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const bodegaResult = await client.query(
        `SELECT id FROM bodegas WHERE id = $1 AND estado = 'activo'`,
        [payload.bodega_id]
      );
      if (!bodegaResult.rows.length) throw buildError('Bodega no encontrada o inactiva', 400, 'BODEGA_NOT_FOUND');

      if (Array.isArray(payload.especialidades)) validateEspecialidades(payload.especialidades);

      const articuloId = await ArticuloModel.insert(client, {
        tipo:        payload.tipo,
        nombre:      payload.nombre,
        marca:       payload.marca,
        modelo:      payload.modelo,
        descripcion: payload.descripcion,
        nro_serie:   payload.nro_serie,
        codigo,
        valor:            payload.valor,
        foto_url:         uploadedFotoUrl    || payload.foto_url    || null,
        bodega_id:        payload.bodega_id,
        fecha_vencimiento: payload.fecha_vencimiento,
        fecha_compra:      payload.fecha_compra,
        proveedor_id:      payload.proveedor_id,
        factura_url:       uploadedFacturaUrl || payload.factura_url || null,
        manual_url:        uploadedManualUrl  || payload.manual_url  || null,
        creado_por_usuario_id: userId,
      });

      if (Array.isArray(payload.especialidades) && payload.especialidades.length) {
        await ArticuloModel.upsertEspecialidades(client, articuloId, payload.especialidades);
      }

      await ArticuloModel.insertMovimiento(client, {
        articuloId,
        tipo:                 'entrada',
        bodegaDestinoId:      payload.bodega_id,
        responsableUsuarioId: userId,
        notas:                'Creación de artículo',
      });

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: articuloId,
        accion: 'crear', usuarioId: userId,
        diff: { tipo: payload.tipo, nombre: payload.nombre, nro_serie: payload.nro_serie },
      });

      const data = await ArticuloModel.findByIdWithClient(client, articuloId);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      await Promise.allSettled([uploadedFotoUrl, uploadedFacturaUrl, uploadedManualUrl].filter(Boolean).map(deleteFileByUrl));
      throw error;
    } finally {
      client.release();
    }
  }

  static async list(filters = {}) {
    return ArticuloModel.findAll(filters);
  }

  static async getById(id) {
    const art = await ArticuloModel.findById(id);
    if (!art) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    return art;
  }

  static async update(id, payload, userId, files = {}) {
    const fotoFile    = files.foto?.[0]    || null;
    const facturaFile = files.factura?.[0] || null;
    const manualFile  = files.manual?.[0]  || null;

    let uploadedFotoUrl    = null;
    let uploadedFacturaUrl = null;
    let uploadedManualUrl  = null;

    const { rows: preRows } = await db.query(`SELECT nro_serie FROM articulo WHERE id = $1`, [id]);
    if (!preRows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    const uploadCodigo = deriveCodigo(payload.nro_serie ?? preRows[0].nro_serie);

    if (fotoFile)    uploadedFotoUrl    = await uploadFile(fotoFile, { folder: 'articulos/fotos', filePrefix: uploadCodigo });
    if (facturaFile) uploadedFacturaUrl = await uploadDocument(facturaFile, { folder: 'articulos/facturas', filePrefix: uploadCodigo });
    if (manualFile)  uploadedManualUrl  = await uploadDocument(manualFile, { folder: 'articulos/manuales', filePrefix: uploadCodigo });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const old = await ArticuloModel.getRawForUpdate(client, id);
      if (!old) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');

      if (Array.isArray(payload.especialidades)) validateEspecialidades(payload.especialidades);

      const has = (k) => Object.prototype.hasOwnProperty.call(payload, k);
      const newNroSerie    = payload.nro_serie ?? old.nro_serie;
      const newCodigo      = deriveCodigo(newNroSerie);
      const newFotoUrl     = uploadedFotoUrl    || payload.foto_url    || old.foto_url;
      const newFacturaUrl  = uploadedFacturaUrl || (payload.factura_url ?? old.factura_url);
      const newManualUrl   = uploadedManualUrl  || (payload.manual_url  ?? old.manual_url);
      const newFechaVenc   = has('fecha_vencimiento') ? (payload.fecha_vencimiento || null) : (old.fecha_vencimiento ?? null);
      const newFechaComp   = has('fecha_compra')      ? (payload.fecha_compra      || null) : (old.fecha_compra      ?? null);
      const newProveedorId = has('proveedor_id')      ? (payload.proveedor_id      || null) : (old.proveedor_id      ?? null);

      await ArticuloModel.updateFields(client, id, {
        nombre:      payload.nombre,
        marca:       payload.marca,
        modelo:      payload.modelo,
        descripcion: payload.descripcion,
        nro_serie:   newNroSerie,
        codigo:      newCodigo,
        valor:            payload.valor,
        foto_url:         newFotoUrl,
        fecha_vencimiento: newFechaVenc,
        fecha_compra:      newFechaComp,
        proveedor_id:      newProveedorId,
        factura_url:       newFacturaUrl,
        manual_url:        newManualUrl,
      });

      if (Array.isArray(payload.especialidades)) {
        await ArticuloModel.upsertEspecialidades(client, id, payload.especialidades);
      }

      await Promise.allSettled([
        uploadedFotoUrl    && old.foto_url    ? deleteFileByUrl(old.foto_url)    : null,
        uploadedFacturaUrl && old.factura_url ? deleteFileByUrl(old.factura_url) : null,
        uploadedManualUrl  && old.manual_url  ? deleteFileByUrl(old.manual_url)  : null,
      ].filter(Boolean));

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: id,
        accion: 'actualizar', usuarioId: userId, diff: payload,
      });

      const data = await ArticuloModel.findByIdWithClient(client, id);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      await Promise.allSettled([uploadedFotoUrl, uploadedFacturaUrl, uploadedManualUrl].filter(Boolean).map(deleteFileByUrl));
      if (error.code === '23505') {
        const field = error.constraint?.includes('nro_serie') ? 'nro_serie' : 'codigo';
        throw buildError(`El ${field} ya existe en otro artículo`, 409, 'DUPLICATE_NRO_SERIE');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePermanent(id, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const art = await ArticuloModel.getRawForUpdate(client, id);
      if (!art) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
      if (art.estado === 'asignado') throw buildError('No se puede eliminar un artículo con custodia activa', 409, 'ARTICULO_ASSIGNED');

      const certUrls = await ArticuloModel.getCertUrls(client, id);

      await ArticuloModel.deleteById(client, id);

      await Promise.allSettled(
        [art.foto_url, art.factura_url, art.manual_url, ...certUrls].filter(Boolean).map(deleteFileByUrl)
      );

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

  static async addCertificacion(articuloId, file, nombre, userId) {
    const certInfo = await ArticuloModel.getCertInfo(articuloId);
    if (!certInfo) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    if (certInfo.cert_count >= 5) throw buildError('El artículo ya tiene el máximo de 5 certificaciones', 422, 'MAX_CERTIFICACIONES');

    const certNombre = nombre || 'cert';
    const url = await uploadDocument(file, {
      folder: 'articulos/certificaciones',
      filePrefix: `${certInfo.codigo}_${certNombre}`,
    });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await ArticuloModel.insertCertificacion(client, articuloId, nombre, url);

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: articuloId,
        accion: 'actualizar', usuarioId: userId,
        diff: { certificacion_added: nombre || url },
      });

      const data = await ArticuloModel.findByIdWithClient(client, articuloId);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      await deleteFileByUrl(url).catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteCertificacion(articuloId, certId, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const cert = await ArticuloModel.findCertificacion(client, certId, articuloId);
      if (!cert) throw buildError('Certificación no encontrada', 404, 'CERT_NOT_FOUND');

      await ArticuloModel.deleteCertificacionById(client, certId);
      await deleteFileByUrl(cert.url).catch(() => {});

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: articuloId,
        accion: 'actualizar', usuarioId: userId,
        diff: { certificacion_deleted: certId },
      });

      const data = await ArticuloModel.findByIdWithClient(client, articuloId);
      await client.query('COMMIT');
      return data;
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

      const art = await ArticuloModel.getForStateChange(client, id);
      if (!art) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');

      const key = `${art.estado}→${nuevo_estado}`;
      const transicion = TRANSICIONES_DIRECTAS[key];
      if (!transicion) {
        throw buildError(
          `Transición no permitida: ${art.estado} → ${nuevo_estado}`,
          422, 'INVALID_STATE_TRANSITION'
        );
      }

      if (await ArticuloModel.hasCustodiaActiva(client, id)) {
        throw buildError(
          'El artículo tiene custodia activa. Debe procesarse mediante devolución.',
          422, 'ACTIVE_CUSTODY_EXISTS'
        );
      }

      let nuevaBodega = null;
      if (transicion.cambia_bodega) {
        if (!bodega_destino_id) throw buildError('Se requiere bodega_destino_id para esta transición', 400, 'BODEGA_REQUIRED');
        const { rows: ubRows } = await client.query(`SELECT id FROM bodegas WHERE id = $1`, [bodega_destino_id]);
        if (!ubRows.length) throw buildError('Bodega no encontrada', 404, 'BODEGA_NOT_FOUND');
        nuevaBodega = bodega_destino_id;
      }

      await ArticuloModel.updateEstado(client, id, {
        estado:            nuevo_estado,
        bodega_actual_id:  transicion.cambia_bodega ? nuevaBodega : art.bodega_actual_id,
        proyecto_actual_id: nuevo_estado === 'en_stock' ? null : (art.proyecto_actual_id ?? null),
      });

      await ArticuloModel.insertMovimiento(client, {
        articuloId:           id,
        tipo:                 transicion.mov_tipo,
        bodegaOrigenId:       art.bodega_actual_id,
        bodegaDestinoId:      transicion.cambia_bodega ? nuevaBodega : null,
        responsableUsuarioId: userId,
        notas:                motivo || null,
      });

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: id,
        accion: 'actualizar', usuarioId: userId,
        diff: { estado: nuevo_estado, motivo },
      });

      const updated = await ArticuloModel.findByIdWithClient(client, id);
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { ArticulosService, deriveCodigo };
