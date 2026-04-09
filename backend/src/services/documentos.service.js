const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { logger } = require('../lib/logger');
const { writeAuditEvent } = require('../lib/auditoriaDb');
const { uploadDocument, deleteFileByUrl, resolveImageUrl } = require('../lib/googleCloud');

const ENTITY_TABLE_BY_TYPE = {
  entrega: 'entrega',
  devolucion: 'devolucion',
};

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const computeFileHash = async (file) => {
  if (!file) {
    throw buildError('Debe adjuntar un archivo para el anexo.', 400);
  }

  if (file.buffer) {
    return crypto.createHash('sha256').update(file.buffer).digest('hex');
  }

  if (file.path) {
    const buffer = await fs.promises.readFile(file.path);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  throw buildError('No se pudo leer el archivo adjunto para calcular hash.', 400);
};

class DocumentosService {
  static async createAnexo(payload, userId) {
    const entidadTipo = String(payload.entidad_tipo || '').trim().toLowerCase();
    const entidadId = String(payload.entidad_id || '').trim();
    const tipo = String(payload.tipo || 'informe').trim().toLowerCase();

    if (!ENTITY_TABLE_BY_TYPE[entidadTipo]) {
      throw buildError('entidad_tipo no soportado para anexos.', 400);
    }

    if (!entidadId) {
      throw buildError('entidad_id es obligatorio para anexos.', 400);
    }

    if (tipo !== 'informe') {
      throw buildError('tipo de anexo inválido. Use "informe".', 400);
    }

    const archivoHash = await computeFileHash(payload.file);

    let uploadedDocumentUrl = null;
    const client = await db.pool.connect();

    try {
      uploadedDocumentUrl = await uploadDocument(payload.file);

      await client.query('BEGIN');

      const targetTable = ENTITY_TABLE_BY_TYPE[entidadTipo];
      const entityResult = await client.query(
        `
        SELECT id
        FROM ${targetTable}
        WHERE id = $1
        LIMIT 1
        `,
        [entidadId]
      );

      if (!entityResult.rows.length) {
        throw buildError(`No existe la entidad ${entidadTipo} indicada.`, 404);
      }

      const documentResult = await client.query(
        `
        INSERT INTO documento (
          tipo,
          archivo_url,
          archivo_hash,
          creado_por_usuario_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id AS documento_id, tipo, archivo_url, archivo_hash, creado_en, creado_por_usuario_id
        `,
        [tipo, uploadedDocumentUrl, archivoHash, userId]
      );

      const documentRecord = documentResult.rows[0];

      await client.query(
        `
        INSERT INTO documento_referencia (
          documento_id,
          entidad_tipo,
          entidad_id
        )
        VALUES ($1, $2, $3)
        `,
        [documentRecord.documento_id, entidadTipo, entidadId]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'documento',
        entidadId: documentRecord.documento_id,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          tipo,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          archivo_hash: archivoHash,
        },
      });

      await client.query('COMMIT');

      return {
        ...documentRecord,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        archivo_url_resuelto: await resolveImageUrl(documentRecord.archivo_url),
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (uploadedDocumentUrl) {
        try {
          await deleteFileByUrl(uploadedDocumentUrl);
        } catch (cleanupError) {
          logger.warn('No se pudo limpiar anexo tras error', {
            message: cleanupError.message,
            uploadedDocumentUrl,
          });
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DocumentosService;
