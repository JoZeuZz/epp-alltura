const { uploadFile, deleteFileByUrl } = require('./googleCloud');
const { logger } = require('./logger');
const { buildError } = require('./errors');

const MIN_SIGNATURE_BYTES = 1500;

const buildRequestMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

const buildSignaturePayload = async (req, folder) => {
  const payload = { ...(req.body || {}) };
  let uploadedSignatureUrl = null;
  if (req.file) {
    if (req.file.size < MIN_SIGNATURE_BYTES) {
      throw buildError(
        'La firma parece estar en blanco o es demasiado pequeña. Por favor, dibuja tu firma.',
        400,
        'SIGNATURE_BLANK_OR_EMPTY'
      );
    }
    uploadedSignatureUrl = await uploadFile(req.file, { folder });
    payload.firma_imagen_url = uploadedSignatureUrl;
  }
  return { payload, uploadedSignatureUrl };
};

const cleanupUploadedSignature = async (url) => {
  if (!url) return;
  try {
    await deleteFileByUrl(url);
  } catch (err) {
    logger.warn('No se pudo limpiar artefacto de firma tras error', {
      message: err.message,
      url,
    });
  }
};

const requirePrivilegedActor = (actor, message, code) => {
  const roles = new Set(Array.isArray(actor?.roles) ? actor.roles : [actor?.role]);
  if (!roles.has('admin') && !roles.has('supervisor')) {
    throw buildError(message, 403, code);
  }
};

module.exports = {
  buildRequestMeta,
  buildSignaturePayload,
  cleanupUploadedSignature,
  requirePrivilegedActor,
};
