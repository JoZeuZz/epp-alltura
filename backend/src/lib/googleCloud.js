const { Storage } = require('@google-cloud/storage');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PassThrough, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { logger } = require('./logger');

// Verificar si Google Cloud está configurado
const isGCSConfigured = process.env.GCS_PROJECT_ID &&
                        process.env.GCS_BUCKET_NAME &&
                        process.env.GCS_PROJECT_ID !== 'your-gcp-project-id';

const storageProvider = (process.env.IMAGE_STORAGE_PROVIDER || '').toLowerCase();
const resolvedProvider = storageProvider || (isGCSConfigured ? 'gcs' : 'local');

let storage, bucket;

if (isGCSConfigured) {
  const storageOptions = {
    projectId: process.env.GCS_PROJECT_ID,
  };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  storage = new Storage({
    ...storageOptions
  });
  bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
}

const localUploadsDir = path.join(__dirname, '../../uploads');
const tempUploadsDir = path.join(__dirname, '../../uploads/tmp');
const gcsPrefix = (process.env.GCS_PREFIX || '').replace(/^\/+|\/+$/g, '');

const isGcsUrl = (imageUrl) => imageUrl.includes('storage.googleapis.com');

const signedUrlTtlMs = parseInt(process.env.GCS_SIGNED_URL_TTL_MS || '2592000000', 10); // 30 days default
const signedUrlsEnabled = (process.env.GCS_SIGNED_URLS || 'true').toLowerCase() !== 'false';
const proxyEnabled = (process.env.GCS_IMAGE_PROXY || 'true').toLowerCase() !== 'false';
const proxyTokenTtlSeconds = parseInt(process.env.IMAGE_PROXY_TTL_SECONDS || '2592000', 10); // 30 days default
const proxySecret = process.env.IMAGE_PROXY_SECRET || process.env.JWT_SECRET || '';
const losslessCompressionEnabled =
  (process.env.IMAGE_LOSSLESS_COMPRESSION || 'true').toLowerCase() !== 'false';
const stripMetadataEnabled =
  (process.env.IMAGE_STRIP_METADATA || 'true').toLowerCase() !== 'false';
const maxImageBytes = parseInt(process.env.IMAGE_MAX_BYTES || '26214400', 10);
const jpegQuality = parseInt(process.env.IMAGE_JPEG_QUALITY || '92', 10);
const cacheControl =
  process.env.IMAGE_CACHE_CONTROL || 'private, max-age=31536000, immutable';

const getSharp = () => {
  try {
    // Lazy-load to avoid hard failure if dependency isn't installed.
    // eslint-disable-next-line global-require
    return require('sharp');
  } catch (error) {
    logger.warn('Sharp not available for lossless compression', { error: error.message });
    return null;
  }
};

const normalizeMimeType = (mimetype) => (mimetype || '').toLowerCase();

const supportedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const detectImageSignature = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (['avif', 'avis', 'av01'].includes(brand)) {
      return 'image/avif';
    }
  }

  return null;
};

const readFileHeader = async (file, length = 32) => {
  if (!file) return null;

  if (file.buffer) {
    return file.buffer.slice(0, length);
  }

  if (file.path) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, 0);
      return buffer;
    } finally {
      await handle.close();
    }
  }

  return null;
};

const validateImageSignature = async (file) => {
  const header = await readFileHeader(file);
  if (!header) return;

  const detected = detectImageSignature(header);
  if (!detected) {
    const error = new Error('El archivo no parece ser una imagen válida.');
    error.statusCode = 400;
    throw error;
  }

  const declared = normalizeMimeType(file.mimetype);
  if (declared && declared.startsWith('image/')) {
    if (declared === 'image/jpg' && detected === 'image/jpeg') {
      return;
    }
    if (declared !== detected) {
      const error = new Error('El tipo de archivo no coincide con el contenido.');
      error.statusCode = 400;
      throw error;
    }
  }
};

const getIncomingSize = async (file) => {
  if (!file) return 0;
  if (typeof file.size === 'number') return file.size;
  if (file.buffer) return file.buffer.length;
  if (file.path) {
    const stats = await fs.promises.stat(file.path);
    return stats.size;
  }
  return 0;
};

const createSizeLimiter = (maxBytes) => {
  let totalBytes = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      totalBytes += chunk.length;
      if (maxBytes > 0 && totalBytes > maxBytes) {
        const error = new Error(
          `La imagen procesada supera el tamaño máximo permitido (${Math.round(maxBytes / (1024 * 1024))} MB).`
        );
        error.statusCode = 413;
        return cb(error);
      }
      return cb(null, chunk);
    },
  });

  return { limiter, getTotalBytes: () => totalBytes };
};

const createReadableStream = async (file) => {
  const mimetype = normalizeMimeType(file.mimetype);
  const sharp = getSharp();
  const shouldProcess =
    !!sharp &&
    (losslessCompressionEnabled || stripMetadataEnabled) &&
    mimetype.startsWith('image/');

  if (shouldProcess) {
    let transformer = sharp(file.path || file.buffer, { failOnError: false });

    if (stripMetadataEnabled) {
      transformer = transformer.rotate();
    }

    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      transformer = transformer.jpeg({
        quality: jpegQuality,
        mozjpeg: true,
      });
      return { stream: transformer, contentType: 'image/jpeg' };
    }

    if (mimetype === 'image/png') {
      transformer = transformer.png({ compressionLevel: 9, adaptiveFiltering: true });
      return { stream: transformer, contentType: 'image/png' };
    }

    if (mimetype === 'image/webp') {
      transformer = transformer.webp({ lossless: losslessCompressionEnabled, quality: 100 });
      return { stream: transformer, contentType: 'image/webp' };
    }

    if (mimetype === 'image/avif') {
      transformer = transformer.avif({ lossless: losslessCompressionEnabled });
      return { stream: transformer, contentType: 'image/avif' };
    }
  }

  if (file.buffer) {
    const pass = new PassThrough();
    pass.end(file.buffer);
    return { stream: pass, contentType: mimetype || 'application/octet-stream' };
  }

  if (file.path) {
    return { stream: fs.createReadStream(file.path), contentType: mimetype || 'application/octet-stream' };
  }

  throw new Error('Archivo inválido para carga de imagen.');
};

const cleanupTempFile = async (file) => {
  if (!file?.path) return;
  if (!file.path.startsWith(tempUploadsDir)) return;

  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    logger.warn('No se pudo eliminar archivo temporal', { error: error.message, path: file.path });
  }
};

const getLocalFilePath = (imageUrl) => {
  let filename;

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const urlParts = imageUrl.split('/uploads/');
    if (urlParts.length > 1) {
      filename = urlParts[1];
    }
  } else if (imageUrl.startsWith('/uploads/')) {
    filename = imageUrl.replace(/^\/uploads\//, '');
  } else {
    filename = imageUrl;
  }

  if (!filename) {
    return null;
  }

  return path.join(localUploadsDir, filename);
};

const getLocalRelativePath = (imageUrl) => {
  let filename;

  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const urlParts = imageUrl.split('/uploads/');
    if (urlParts.length > 1) {
      filename = urlParts.slice(1).join('/uploads/');
    }
  } else if (imageUrl.startsWith('/uploads/')) {
    filename = imageUrl.replace(/^\/uploads\//, '');
  } else {
    filename = imageUrl;
  }

  if (!filename) {
    return null;
  }

  return filename.replace(/^\/+/, '');
};

const parseGcsUrl = (imageUrl) => {
  try {
    const parsed = new URL(imageUrl);
    const host = parsed.hostname;
    const parts = parsed.pathname.split('/').filter(Boolean);

    // https://storage.googleapis.com/<bucket>/<object>
    if (host === 'storage.googleapis.com') {
      if (parts.length < 2) {
        return null;
      }
      const [bucketName, ...objectParts] = parts;
      return { bucketName, objectName: decodeURIComponent(objectParts.join('/')) };
    }

    // https://<bucket>.storage.googleapis.com/<object>
    if (host.endsWith('.storage.googleapis.com')) {
      const bucketName = host.replace('.storage.googleapis.com', '');
      if (!bucketName || parts.length < 1) {
        return null;
      }
      return { bucketName, objectName: decodeURIComponent(parts.join('/')) };
    }

    return null;
  } catch {
    return null;
  }
};

const createProxyToken = (imageUrl) => {
  if (!proxySecret) {
    return null;
  }

  const gcsInfo = parseGcsUrl(imageUrl);
  if (!gcsInfo) {
    return null;
  }

  return jwt.sign(
    { b: gcsInfo.bucketName, o: gcsInfo.objectName },
    proxySecret,
    { expiresIn: proxyTokenTtlSeconds }
  );
};

const createLocalProxyToken = (imageUrl) => {
  if (!proxySecret) {
    return null;
  }

  const relativePath = getLocalRelativePath(imageUrl);
  if (!relativePath) {
    return null;
  }

  return jwt.sign(
    { t: 'local', f: relativePath },
    proxySecret,
    { expiresIn: proxyTokenTtlSeconds }
  );
};

/**
 * Uploads a file to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {object} file The file object from multer.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
const uploadFile = async (file) => {
  if (!file) {
    throw new Error('Archivo inválido para carga de imagen.');
  }

  const incomingSize = await getIncomingSize(file);
  if (maxImageBytes > 0 && incomingSize > maxImageBytes) {
    const error = new Error(
      `La imagen supera el tamaño máximo permitido (${Math.round(maxImageBytes / (1024 * 1024))} MB).`
    );
    error.statusCode = 413;
    throw error;
  }

  const mimetype = normalizeMimeType(file.mimetype);
  if (mimetype && mimetype.startsWith('image/') && !supportedImageMimeTypes.has(mimetype)) {
    const error = new Error('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
    error.statusCode = 400;
    throw error;
  }

  await validateImageSignature(file);

  if (resolvedProvider === 'gcs' && !isGCSConfigured) {
    throw new Error(
      'Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  const { stream, contentType } = await createReadableStream(file);
  const { limiter, getTotalBytes } = createSizeLimiter(maxImageBytes);

  const extensionByMime = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
  };
  const fallbackExt = path.extname(file.originalname || '') || '.img';
  const extension = extensionByMime[contentType] || fallbackExt;
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

  try {
    if (resolvedProvider === 'local') {
      if (!fs.existsSync(localUploadsDir)) {
        fs.mkdirSync(localUploadsDir, { recursive: true });
      }

      const filePath = path.join(localUploadsDir, filename);
      await pipeline(stream, limiter, fs.createWriteStream(filePath));

      logger.debug('Imagen procesada localmente', { filename, size: getTotalBytes() });
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      return `${backendUrl}/uploads/${filename}`;
    }

    const objectName = gcsPrefix ? `${gcsPrefix}/${filename}` : filename;
    const blob = bucket.file(objectName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: contentType || 'application/octet-stream',
        cacheControl,
      },
    });

    await pipeline(stream, limiter, blobStream);
    logger.debug('Imagen subida a GCS', { objectName, size: getTotalBytes() });

    return `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const providerLabel = resolvedProvider === 'local' ? 'local' : 'GCS';
    throw new Error(`Unable to upload image (${providerLabel}): ${error.message}`);
  } finally {
    await cleanupTempFile(file);
  }
};

/**
 * Resolve an image URL to a signed URL when using GCS (for private buckets).
 * Falls back to the original URL if signing is not available.
 * @param {string} imageUrl
 * @returns {Promise<string>}
 */
const resolveImageUrl = async (imageUrl) => {
  if (!imageUrl) return imageUrl;

  if (resolvedProvider !== 'gcs') {
    const token = createLocalProxyToken(imageUrl);
    if (token) {
      return `/api/image-proxy?token=${token}`;
    }
    return imageUrl;
  }

  if (proxyEnabled && isGcsUrl(imageUrl)) {
    const token = createProxyToken(imageUrl);
    if (token) {
      return `/api/image-proxy?token=${token}`;
    }
  }

  if (!signedUrlsEnabled) {
    return imageUrl;
  }

  if (!isGCSConfigured || !storage) {
    return imageUrl;
  }

  if (!isGcsUrl(imageUrl)) {
    return imageUrl;
  }

  const gcsInfo = parseGcsUrl(imageUrl);
  if (!gcsInfo) {
    return imageUrl;
  }

  try {
    const targetBucket = storage.bucket(gcsInfo.bucketName);
    const file = targetBucket.file(gcsInfo.objectName);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + signedUrlTtlMs,
    });
    return signedUrl;
  } catch (error) {
    logger.warn(`No se pudo generar signed URL para ${imageUrl}: ${error.message}`);
    return imageUrl;
  }
};

/**
 * Deletes a file stored either locally or on Google Cloud Storage.
 * @param {string} imageUrl URL or path of the image.
 */
const deleteFileByUrl = async (imageUrl) => {
  if (!imageUrl) return;

  if (isGcsUrl(imageUrl)) {
    if (!isGCSConfigured) {
      logger.warn(`Google Cloud Storage no configurado, no se elimina: ${imageUrl}`);
      return;
    }

    const gcsInfo = parseGcsUrl(imageUrl);
    if (!gcsInfo) {
      logger.warn(`No se pudo parsear URL de GCS: ${imageUrl}`);
      return;
    }

    const targetBucket = storage.bucket(gcsInfo.bucketName);
    await targetBucket.file(gcsInfo.objectName).delete({ ignoreNotFound: true });
    logger.info(`Imagen eliminada en GCS: ${imageUrl}`);
    return;
  }

  const localPath = getLocalFilePath(imageUrl);
  if (!localPath) {
    logger.warn(`No se pudo determinar ruta local para eliminar: ${imageUrl}`);
    return;
  }

  try {
    await fs.promises.access(localPath);
    await fs.promises.unlink(localPath);
    logger.info(`Imagen eliminada: ${localPath}`);
  } catch (error) {
    logger.warn(`No se pudo eliminar la imagen ${imageUrl}: ${error.message}`);
  }
};

module.exports = { uploadFile, deleteFileByUrl, resolveImageUrl };
