const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const maxImageBytesRaw = parseInt(process.env.IMAGE_MAX_BYTES || `${DEFAULT_MAX_IMAGE_BYTES}`, 10);
const maxImageBytes =
  Number.isFinite(maxImageBytesRaw) && maxImageBytesRaw > 0
    ? maxImageBytesRaw
    : DEFAULT_MAX_IMAGE_BYTES;
const maxDocumentBytesRaw = parseInt(
  process.env.DOCUMENT_MAX_BYTES || `${DEFAULT_MAX_DOCUMENT_BYTES}`,
  10
);
const maxDocumentBytes =
  Number.isFinite(maxDocumentBytesRaw) && maxDocumentBytesRaw > 0
    ? maxDocumentBytesRaw
    : DEFAULT_MAX_DOCUMENT_BYTES;

const tempUploadsDir = path.join(__dirname, '../../uploads/tmp');
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '') || '.img';
    const randomPart = crypto.randomBytes(8).toString('hex');
    cb(null, `upload-${Date.now()}-${randomPart}${extension}`);
  },
});

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const allowedDocumentTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const normalizeMime = (mime) => {
  if (!mime) return '';
  const lower = mime.toLowerCase();
  return lower === 'image/jpg' ? 'image/jpeg' : lower;
};

const MAGIC_SIGNATURES = {
  jpeg: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  png: (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  webp: (buffer) =>
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP',
  avif: (buffer) => {
    if (buffer.length < 12) return false;
    const box = buffer.toString('ascii', 4, 8);
    const brand = buffer.toString('ascii', 8, 12);
    if (box !== 'ftyp') return false;
    return ['avif', 'avis', 'mif1', 'msf1'].includes(brand);
  },
};

const detectImageMime = (buffer) => {
  if (MAGIC_SIGNATURES.jpeg(buffer)) return 'image/jpeg';
  if (MAGIC_SIGNATURES.png(buffer)) return 'image/png';
  if (MAGIC_SIGNATURES.webp(buffer)) return 'image/webp';
  if (MAGIC_SIGNATURES.avif(buffer)) return 'image/avif';
  return null;
};

const detectDocumentMime = (buffer) => {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  return detectImageMime(buffer);
};

const readMagicBytes = async (filePath, length = 16) => {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(length), 0, length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
};

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Silenciar errores de limpieza
  }
};

const imageFileFilter = (_req, file, cb) => {
  if (!file || !file.mimetype) {
    const error = new Error('Archivo inválido. No se pudo determinar el tipo.');
    error.statusCode = 400;
    return cb(error, false);
  }

  if (!file.mimetype.startsWith('image/')) {
    const error = new Error('Solo se permiten archivos de imagen.');
    error.statusCode = 400;
    return cb(error, false);
  }

  if (!allowedImageTypes.has(file.mimetype)) {
    const error = new Error('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
    error.statusCode = 400;
    return cb(error, false);
  }

  if (file.mimetype === 'image/svg+xml') {
    const error = new Error('El formato SVG no está permitido.');
    error.statusCode = 400;
    return cb(error, false);
  }

  return cb(null, true);
};

const documentFileFilter = (_req, file, cb) => {
  if (!file || !file.mimetype) {
    const error = new Error('Archivo inválido. No se pudo determinar el tipo.');
    error.statusCode = 400;
    return cb(error, false);
  }

  const normalizedMime = normalizeMime(file.mimetype);
  if (!allowedDocumentTypes.has(normalizedMime)) {
    const error = new Error('Solo se permiten archivos PDF o imágenes JPG/PNG/WEBP.');
    error.statusCode = 400;
    return cb(error, false);
  }

  return cb(null, true);
};

const imageUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: maxImageBytes,
    files: 1,
  },
  fileFilter: imageFileFilter,
});

const documentUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: maxDocumentBytes,
    files: 1,
    fields: 50,
    fieldSize: 1024 * 1024,
  },
  fileFilter: documentFileFilter,
});

const collectRequestFiles = (req) => {
  const files = [];
  if (req.file) {
    files.push(req.file);
  } else if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((fileGroup) => {
      if (Array.isArray(fileGroup)) {
        files.push(...fileGroup);
      } else if (fileGroup) {
        files.push(fileGroup);
      }
    });
  }

  return files;
};

module.exports = {
  imageUpload,
  documentUpload,
  MAX_IMAGE_BYTES: maxImageBytes,
  MAX_DOCUMENT_BYTES: maxDocumentBytes,
  validateImageMagic: async (req, _res, next) => {
    try {
      const files = collectRequestFiles(req);

      if (!files.length) {
        return next();
      }

      for (const file of files) {
        if (!file?.path) continue;
        const buffer = await readMagicBytes(file.path);
        const detected = detectImageMime(buffer);
        const declared = normalizeMime(file.mimetype);

        if (!detected || !allowedImageTypes.has(detected)) {
          await safeUnlink(file.path);
          const error = new Error('El archivo no es una imagen válida.');
          error.statusCode = 400;
          return next(error);
        }

        if (declared && normalizeMime(declared) !== detected) {
          await safeUnlink(file.path);
          const error = new Error('El tipo de imagen no coincide con el contenido del archivo.');
          error.statusCode = 400;
          return next(error);
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  },
  validateDocumentMagic: async (req, _res, next) => {
    try {
      const files = collectRequestFiles(req);

      if (!files.length) {
        return next();
      }

      for (const file of files) {
        if (!file?.path) continue;

        const buffer = await readMagicBytes(file.path, 24);
        const detected = detectDocumentMime(buffer);
        const declared = normalizeMime(file.mimetype);

        if (!detected || !allowedDocumentTypes.has(detected)) {
          await safeUnlink(file.path);
          const error = new Error('El archivo no corresponde a un PDF o imagen válida.');
          error.statusCode = 400;
          return next(error);
        }

        if (declared && normalizeMime(declared) !== detected) {
          await safeUnlink(file.path);
          const error = new Error(
            'El tipo de documento no coincide con el contenido del archivo.'
          );
          error.statusCode = 400;
          return next(error);
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  },
};
