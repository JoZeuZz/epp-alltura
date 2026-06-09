'use strict';

const ArticuloModel = require('../models/articulo');
const { uploadFile, uploadDocument, deleteFileByUrl, resolveImageUrl } = require('../lib/googleCloud');
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

const CODIGO_PREFIX = { epp: 'EPP', herramienta: 'HRR', equipo: 'EQP' };

async function generateCodigo(client, tipo) {
  const { rows } = await client.query('SELECT nextval($1) AS val', [`seq_codigo_${tipo}`]);
  return `${CODIGO_PREFIX[tipo]}-${String(rows[0].val).padStart(5, '0')}`;
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

    // Validate bodega before uploads to fail fast
    const { rows: bodegaCheck } = await db.query(
      `SELECT id FROM bodegas WHERE id = $1 AND estado = 'activo'`,
      [payload.bodega_id]
    );
    if (!bodegaCheck.length) throw buildError('Bodega no encontrada o inactiva', 400, 'BODEGA_NOT_FOUND');

    // Upload files BEFORE opening transaction (keeps transactions short, avoids holding DB connection during network I/O)
    // Note: codigo is generated inside transaction, so we use payload.nombre as prefix for now
    if (fotoFile)    uploadedFotoUrl    = await uploadFile(fotoFile, { folder: 'articulos/fotos', filePrefix: payload.nombre });
    if (facturaFile) uploadedFacturaUrl = await uploadDocument(facturaFile, { folder: 'articulos/facturas', filePrefix: payload.nombre });
    if (manualFile)  uploadedManualUrl  = await uploadDocument(manualFile, { folder: 'articulos/manuales', filePrefix: payload.nombre });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const codigo = await generateCodigo(client, payload.tipo);

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
      await Promise.allSettled([uploadedFotoUrl, uploadedFacturaUrl, uploadedManualUrl].filter(Boolean).map(url => deleteFileByUrl(url)));
      throw error;
    } finally {
      client.release();
    }
  }

  static async list(filters = {}) {
    const result = await ArticuloModel.findAll(filters);
    result.items = await Promise.all(
      result.items.map(async (item) => ({
        ...item,
        foto_url: await resolveImageUrl(item.foto_url),
      }))
    );
    return result;
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

    const { rows: preRows } = await db.query(`SELECT codigo FROM articulo WHERE id = $1`, [id]);
    if (!preRows.length) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
    const uploadCodigo = preRows[0].codigo;

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
      await Promise.allSettled([uploadedFotoUrl, uploadedFacturaUrl, uploadedManualUrl].filter(Boolean).map(url => deleteFileByUrl(url)));
      if (error.code === '23505') {
        throw buildError('El código interno ya existe en otro artículo', 409, 'DUPLICATE_CODIGO');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePermanent(id, userId) {
    // Block delete if article has any signed actas (legal immutability)
    const { rows: signedCheck } = await db.query(`
      SELECT 1 FROM (
        SELECT 1 FROM entrega_detalle ed
        JOIN firma_entrega fe ON fe.entrega_id = ed.entrega_id
        WHERE ed.articulo_id = $1
        UNION ALL
        SELECT 1 FROM devolucion_detalle dd
        JOIN firma_devolucion fd ON fd.devolucion_id = dd.devolucion_id
        WHERE dd.articulo_id = $1
      ) AS signed_actas
      LIMIT 1
    `, [id]);
    if (signedCheck.length > 0) {
      throw buildError(
        'El artículo tiene actas firmadas y no puede eliminarse permanentemente.',
        409,
        'ARTICULO_HAS_SIGNED_ACTAS'
      );
    }

    const { rows: draftCheck } = await db.query(
      `SELECT 1
       FROM entrega_detalle ed
       JOIN entrega e ON e.id = ed.entrega_id
       WHERE ed.articulo_id = $1
         AND e.estado NOT IN ('confirmada', 'anulada')
       LIMIT 1`,
      [id]
    );
    if (draftCheck.length > 0) {
      throw buildError(
        'El artículo está incluido en una entrega pendiente o en borrador y no puede eliminarse.',
        409,
        'ARTICULO_IN_DRAFT_DELIVERY'
      );
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const art = await ArticuloModel.getRawForUpdate(client, id);
      if (!art) throw buildError('Artículo no encontrado', 404, 'ARTICULO_NOT_FOUND');
      if (art.estado === 'asignado') throw buildError('No se puede eliminar un artículo con custodia activa', 409, 'ARTICULO_ASSIGNED');

      const certUrls = await ArticuloModel.getCertUrls(client, id);

      await client.query('DELETE FROM inspeccion_activo WHERE articulo_id = $1', [id]);
      await client.query('DELETE FROM movimiento_activo WHERE articulo_id = $1', [id]);
      await client.query('DELETE FROM entrega_detalle WHERE articulo_id = $1', [id]);
      await client.query('DELETE FROM custodia_activo WHERE articulo_id = $1', [id]);
      await ArticuloModel.deleteById(client, id);

      await Promise.allSettled(
        [art.foto_url, art.factura_url, art.manual_url, ...certUrls].filter(Boolean).map(url => deleteFileByUrl(url))
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
        usuario_actual_id: null,
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
  static async createBatch(payload, userId, files = {}) {
    const fotoFile = files.foto?.[0] || null;
    let sharedFotoUrl = null;
    if (fotoFile) {
      sharedFotoUrl = await uploadFile(fotoFile, {
        folder: 'articulos/fotos',
        filePrefix: `batch_${payload.plantilla_id}`,
      });
    }

    const PlantillaModel = require('../models/plantilla');
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Validate plantilla
      const plantilla = await PlantillaModel.findByIdWithClient(client, payload.plantilla_id);
      if (!plantilla) throw buildError('Plantilla no encontrada', 404, 'PLANTILLA_NOT_FOUND');
      if (plantilla.estado !== 'activo') throw buildError('Plantilla inactiva', 400, 'PLANTILLA_INACTIVA');

      // Validate bodega
      const { rows: bodegaRows } = await client.query(
        `SELECT id FROM bodegas WHERE id = $1 AND estado = 'activo'`,
        [payload.bodega_id]
      );
      if (!bodegaRows.length) throw buildError('Bodega no encontrada o inactiva', 400, 'BODEGA_NOT_FOUND');

      // Create instances
      const createdIds = [];
      for (const inst of payload.instancias) {
        const codigo = await generateCodigo(client, plantilla.tipo);
        const articuloId = await ArticuloModel.insert(client, {
          tipo:        plantilla.tipo,
          nombre:      plantilla.nombre,
          marca:       plantilla.marca,
          modelo:      plantilla.modelo,
          descripcion: plantilla.descripcion,
          manual_url:  plantilla.manual_url,
          foto_url:    sharedFotoUrl || plantilla.foto_url || null,
          plantilla_id: plantilla.id,
          codigo,
          nro_serie:         inst.nro_serie || null,
          valor:             inst.valor ?? 0,
          bodega_id:         payload.bodega_id,
          fecha_compra:      inst.fecha_compra      || null,
          fecha_vencimiento: inst.fecha_vencimiento || null,
          proveedor_id:      inst.proveedor_id      || null,
          factura_url:       null,
          creado_por_usuario_id: userId,
        });

        if (plantilla.especialidades?.length) {
          await ArticuloModel.upsertEspecialidades(client, articuloId, plantilla.especialidades);
        }

        await ArticuloModel.insertMovimiento(client, {
          articuloId,
          tipo:                 'entrada',
          bodegaDestinoId:      payload.bodega_id,
          responsableUsuarioId: userId,
          notas:                `Creación en lote desde plantilla ${plantilla.nombre}`,
        });

        createdIds.push(articuloId);
      }

      await writeAuditEvent({
        client, entidadTipo: 'articulo', entidadId: createdIds[0],
        accion: 'crear', usuarioId: userId,
        diff: { batch: true, plantilla_id: plantilla.id, count: createdIds.length },
      });

      await client.query('COMMIT');
      return { created: createdIds.length, ids: createdIds };
    } catch (error) {
      await client.query('ROLLBACK');
      if (sharedFotoUrl) await deleteFileByUrl(sharedFotoUrl).catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { ArticulosService };
