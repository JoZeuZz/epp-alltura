'use strict';

const PlantillaModel = require('../models/plantilla');
const { uploadFile, uploadDocument, deleteFileByUrl, resolveImageUrl } = require('../lib/googleCloud');
const { buildError } = require('../lib/errors');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const db = require('../db');

const VALID_ESPECIALIDADES = ['oocc', 'ooee', 'equipos', 'trabajos_verticales_lineas_de_vida'];

function validateEspecialidades(esps) {
  for (const e of esps) {
    if (!VALID_ESPECIALIDADES.includes(e)) {
      throw buildError(`Especialidad inválida: ${e}`, 400, 'INVALID_ESPECIALIDAD');
    }
  }
}

class PlantillasService {
  static async list({ tipo, estado } = {}) {
    const rows = await PlantillaModel.findAll({ tipo, estado });
    return await Promise.all(
      rows.map(async (p) => ({ ...p, foto_url: await resolveImageUrl(p.foto_url) }))
    );
  }

  static async getById(id) {
    const p = await PlantillaModel.findById(id);
    if (!p) throw buildError('Plantilla no encontrada', 404, 'PLANTILLA_NOT_FOUND');
    const client = await db.pool.connect();
    try {
      const instance_count = await PlantillaModel.countInstances(client, id);
      return { ...p, foto_url: await resolveImageUrl(p.foto_url), instance_count };
    } finally {
      client.release();
    }
  }

  static async create(payload, userId, files = {}) {
    const fotoFile   = files.foto?.[0]   || null;
    const manualFile = files.manual?.[0] || null;

    let uploadedFotoUrl   = null;
    let uploadedManualUrl = null;
    if (fotoFile)   uploadedFotoUrl   = await uploadFile(fotoFile, { folder: 'plantillas/fotos', filePrefix: payload.nombre });
    if (manualFile) uploadedManualUrl = await uploadDocument(manualFile, { folder: 'plantillas/manuales', filePrefix: payload.nombre });

    if (Array.isArray(payload.especialidades)) validateEspecialidades(payload.especialidades);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const plantillaId = await PlantillaModel.insert(client, {
        tipo:        payload.tipo,
        nombre:      payload.nombre,
        marca:       payload.marca,
        modelo:      payload.modelo,
        descripcion: payload.descripcion,
        foto_url:    uploadedFotoUrl   || payload.foto_url   || null,
        manual_url:  uploadedManualUrl || payload.manual_url || null,
        creado_por_usuario_id: userId,
      });

      if (Array.isArray(payload.especialidades) && payload.especialidades.length) {
        await PlantillaModel.upsertEspecialidades(client, plantillaId, payload.especialidades);
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'articulo_plantilla',
        entidadId:   plantillaId,
        accion:      'crear',
        usuarioId:   userId,
        diff:        { tipo: payload.tipo, nombre: payload.nombre },
      });

      const data = await PlantillaModel.findByIdWithClient(client, plantillaId);
      const instance_count = await PlantillaModel.countInstances(client, plantillaId);
      await client.query('COMMIT');
      return { ...data, instance_count };
    } catch (error) {
      await client.query('ROLLBACK');
      await Promise.allSettled(
        [uploadedFotoUrl, uploadedManualUrl].filter(Boolean).map(deleteFileByUrl)
      );
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, payload, userId, files = {}) {
    const fotoFile   = files.foto?.[0]   || null;
    const manualFile = files.manual?.[0] || null;

    let uploadedFotoUrl   = null;
    let uploadedManualUrl = null;
    if (fotoFile)   uploadedFotoUrl   = await uploadFile(fotoFile, { folder: 'plantillas/fotos', filePrefix: id });
    if (manualFile) uploadedManualUrl = await uploadDocument(manualFile, { folder: 'plantillas/manuales', filePrefix: id });

    if (Array.isArray(payload.especialidades)) validateEspecialidades(payload.especialidades);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const old = await PlantillaModel.findByIdWithClient(client, id);
      if (!old) throw buildError('Plantilla no encontrada', 404, 'PLANTILLA_NOT_FOUND');

      const has = (k) => Object.prototype.hasOwnProperty.call(payload, k);
      const newFotoUrl   = uploadedFotoUrl   || (has('foto_url')   ? payload.foto_url   : old.foto_url);
      const newManualUrl = uploadedManualUrl || (has('manual_url') ? payload.manual_url : old.manual_url);

      await PlantillaModel.updateFields(client, id, {
        nombre:      payload.nombre,
        marca:       payload.marca,
        modelo:      payload.modelo,
        descripcion: payload.descripcion,
        foto_url:    newFotoUrl  ?? null,
        manual_url:  newManualUrl ?? null,
      });

      if (Array.isArray(payload.especialidades)) {
        await PlantillaModel.upsertEspecialidades(client, id, payload.especialidades);
      }

      await Promise.allSettled([
        uploadedFotoUrl   && old.foto_url   ? deleteFileByUrl(old.foto_url)   : null,
        uploadedManualUrl && old.manual_url ? deleteFileByUrl(old.manual_url) : null,
      ].filter(Boolean));

      await writeAuditEvent({
        client,
        entidadTipo: 'articulo_plantilla',
        entidadId:   id,
        accion:      'actualizar',
        usuarioId:   userId,
        diff:        payload,
      });

      const data = await PlantillaModel.findByIdWithClient(client, id);
      const instance_count = await PlantillaModel.countInstances(client, id);
      await client.query('COMMIT');
      return { ...data, instance_count };
    } catch (error) {
      await client.query('ROLLBACK');
      await Promise.allSettled(
        [uploadedFotoUrl, uploadedManualUrl].filter(Boolean).map(deleteFileByUrl)
      );
      throw error;
    } finally {
      client.release();
    }
  }

  static async addCertificacion(plantillaId, file, nombre) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const p = await PlantillaModel.findByIdWithClient(client, plantillaId);
      if (!p) throw buildError('Plantilla no encontrada', 404, 'PLANTILLA_NOT_FOUND');

      const certCount = await PlantillaModel.getCertCount(client, plantillaId);
      if (certCount >= 5) throw buildError('Máximo 5 certificaciones por plantilla', 422, 'MAX_CERTIFICACIONES');

      const url = await uploadDocument(file, {
        folder:     'plantillas/certificaciones',
        filePrefix: `${plantillaId}_${nombre || 'cert'}`,
      });

      await PlantillaModel.insertCertificacion(client, plantillaId, nombre, url);
      const data = await PlantillaModel.findByIdWithClient(client, plantillaId);
      await client.query('COMMIT');
      return data;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { PlantillasService };
