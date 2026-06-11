const { Storage } = require('@google-cloud/storage');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PassThrough, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { logger } = require('./logger');

const getRedisClient = () => {
  try {
    return require('./redis');
  } catch {
    return null;
  }
};

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

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      storageOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } catch {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  storage = new Storage({ ...storageOptions });
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
const maxDocumentBytes = parseInt(process.env.DOCUMENT_MAX_BYTES || '26214400', 10);
const jpegQuality = parseInt(process.env.IMAGE_JPEG_QUALITY || '92', 10);
const webpQuality = parseInt(process.env.IMAGE_WEBP_QUALITY || '85', 10);
const cacheControl =
  process.env.IMAGE_CACHE_CONTROL || 'private, max-age=31536000, immutable';

const sanitizeForFilename = (str) =>
  String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'archivo';

const getSharp = () => {
  try {
    // Lazy-load to avoid hard failure if dependency isn't installed.
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
const supportedDocumentMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
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

const detectDocumentSignature = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  return detectImageSignature(buffer);
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

const validateDocumentSignature = async (file) => {
  const header = await readFileHeader(file);
  if (!header) return;

  const detected = detectDocumentSignature(header);
  if (!detected) {
    const error = new Error('El archivo no parece ser un documento válido.');
    error.statusCode = 400;
    throw error;
  }

  const declared = normalizeMimeType(file.mimetype);
  if (declared && supportedDocumentMimeTypes.has(declared)) {
    if (declared === 'image/jpg' && detected === 'image/jpeg') {
      return detected;
    }

    if (declared !== detected) {
      const error = new Error('El tipo de documento no coincide con el contenido.');
      error.statusCode = 400;
      throw error;
    }
  }

  return detected;
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
    // Extract dominant color via separate Sharp instance (fast stats read)
    let dominantColor = null;
    try {
      const stats = await sharp(file.path || file.buffer, { failOnError: false }).stats();
      const r = Math.round(stats.channels[0].mean);
      const g = Math.round(stats.channels[1].mean);
      const b = Math.round(stats.channels[2].mean);
      dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
      // non-fatal — dominant color stays null
    }

    // Convert all images to WebP
    const transformer = sharp(file.path || file.buffer, { failOnError: false })
      .rotate()
      .webp({ quality: webpQuality });

    return { stream: transformer, contentType: 'image/webp', dominantColor };
  }

  // Sharp unavailable or processing disabled — pass through as-is
  if (file.buffer) {
    const pass = new PassThrough();
    pass.end(file.buffer);
    return { stream: pass, contentType: mimetype || 'application/octet-stream', dominantColor: null };
  }

  if (file.path) {
    return {
      stream: fs.createReadStream(file.path),
      contentType: mimetype || 'application/octet-stream',
      dominantColor: null,
    };
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
 * Uploads a file to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {object} file The file object from multer.
 * @param {object} [options={}] Upload options.
 * @param {string} [options.folder] Subfolder within the bucket/uploads dir.
 * @param {string} [options.filePrefix] Prefix for the filename (will be sanitized).
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
const uploadFile = async (file, options = {}) => {
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

  if (resolvedProvider === 'gcs' && !isGCSConfigured) {
    throw new Error(
      'Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  const { stream, contentType, dominantColor } = await createReadableStream(file);
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

  const { folder, filePrefix } = options;
  const prefix = filePrefix ? `${sanitizeForFilename(filePrefix)}_` : '';
  const baseFilename = `${prefix}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

  try {
    if (resolvedProvider === 'local') {
      const subdir = folder ? path.join(localUploadsDir, folder) : localUploadsDir;
      if (!subdir.startsWith(localUploadsDir + path.sep) && subdir !== localUploadsDir) {
        throw Object.assign(new Error('Invalid upload folder path'), { statusCode: 400 });
      }
      await fs.promises.mkdir(subdir, { recursive: true });
      const filePath = path.join(subdir, baseFilename);
      await pipeline(stream, limiter, fs.createWriteStream(filePath));
      logger.debug('Imagen procesada localmente', { baseFilename, size: getTotalBytes() });
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const relPath = folder ? `${folder}/${baseFilename}` : baseFilename;
      return { url: `${backendUrl}/uploads/${relPath}`, dominantColor };
    }

    const objectNameParts = [gcsPrefix, folder, baseFilename].filter(Boolean);
    const objectName = objectNameParts.join('/');
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

    return { url: `https://storage.googleapis.com/${bucket.name}/${blob.name}`, dominantColor };
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
 * Uploads a document file (PDF or image) to storage.
 * @param {object} file The file object from multer.
 * @param {object} [options={}] Upload options.
 * @param {string} [options.folder] Subfolder within the bucket/uploads dir.
 * @param {string} [options.filePrefix] Prefix for the filename (will be sanitized).
 * @returns {Promise<string>} The public URL of the uploaded document.
 */
const uploadDocument = async (file, options = {}) => {
  if (!file) {
    throw new Error('Archivo inválido para carga de documento.');
  }

  const incomingSize = await getIncomingSize(file);
  if (maxDocumentBytes > 0 && incomingSize > maxDocumentBytes) {
    const error = new Error(
      `El documento supera el tamaño máximo permitido (${Math.round(
        maxDocumentBytes / (1024 * 1024)
      )} MB).`
    );
    error.statusCode = 413;
    throw error;
  }

  const declaredMime = normalizeMimeType(file.mimetype);
  if (declaredMime && !supportedDocumentMimeTypes.has(declaredMime)) {
    const error = new Error('Solo se permiten documentos PDF o imágenes JPG/PNG/WEBP.');
    error.statusCode = 400;
    throw error;
  }

  const detectedMime = await validateDocumentSignature(file);

  if (detectedMime && detectedMime.startsWith('image/')) {
    const result = await uploadFile(file, options);
    return result.url;
  }

  if (resolvedProvider === 'gcs' && !isGCSConfigured) {
    throw new Error(
      'Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  const extensionByMime = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const contentType = detectedMime || declaredMime || 'application/octet-stream';
  const fallbackExt = path.extname(file.originalname || '') || '.bin';
  const extension = extensionByMime[contentType] || fallbackExt;

  const { folder, filePrefix } = options;
  const prefix = filePrefix ? `${sanitizeForFilename(filePrefix)}_` : '';
  const baseFilename = `${prefix}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

  const { limiter, getTotalBytes } = createSizeLimiter(maxDocumentBytes);
  const stream = file.buffer
    ? (() => {
        const pass = new PassThrough();
        pass.end(file.buffer);
        return pass;
      })()
    : fs.createReadStream(file.path);

  try {
    if (resolvedProvider === 'local') {
      const subdir = folder ? path.join(localUploadsDir, folder) : localUploadsDir;
      if (!subdir.startsWith(localUploadsDir + path.sep) && subdir !== localUploadsDir) {
        throw Object.assign(new Error('Invalid upload folder path'), { statusCode: 400 });
      }
      await fs.promises.mkdir(subdir, { recursive: true });
      const filePath = path.join(subdir, baseFilename);
      await pipeline(stream, limiter, fs.createWriteStream(filePath));
      logger.debug('Documento almacenado localmente', { baseFilename, size: getTotalBytes() });
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const relPath = folder ? `${folder}/${baseFilename}` : baseFilename;
      return `${backendUrl}/uploads/${relPath}`;
    }

    const objectNameParts = [gcsPrefix, folder, baseFilename].filter(Boolean);
    const objectName = objectNameParts.join('/');
    const blob = bucket.file(objectName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType,
        cacheControl,
      },
    });

    await pipeline(stream, limiter, blobStream);
    logger.debug('Documento subido a GCS', { objectName, size: getTotalBytes() });

    return `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const providerLabel = resolvedProvider === 'local' ? 'local' : 'GCS';
    throw new Error(`Unable to upload document (${providerLabel}): ${error.message}`);
  } finally {
    await cleanupTempFile(file);
  }
};

const resolveHeaderImages = async (row) => {
  if (!row) return row;
  const detalles = Array.isArray(row.detalles)
    ? await Promise.all(row.detalles.map(async (detail) => ({
      ...detail,
      foto_url: await resolveImageUrl(detail.foto_url),
    })))
    : row.detalles;
  return {
    ...row,
    evidencia_foto_url_raw: row.evidencia_foto_url,
    firma_imagen_url_raw: row.firma_imagen_url,
    evidencia_foto_url: await resolveImageUrl(row.evidencia_foto_url),
    firma_imagen_url: await resolveImageUrl(row.firma_imagen_url),
    detalles,
  };
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

    // Invalidate proxy thumbnail cache for GCS
    try {
      const rc = getRedisClient();
      if (rc) {
        const client = await rc.getClient();
        const sizes = ['thumb', 'medium'];
        await Promise.all(
          sizes.map(s => client.del(`imgcache:${s}:${gcsInfo.bucketName}:${gcsInfo.objectName}`))
        );
      }
    } catch (err) {
      logger.warn('Failed to invalidate GCS image proxy cache', { error: err.message });
    }

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

  // Invalidate proxy thumbnail cache for local files
  try {
    const rc = getRedisClient();
    if (rc) {
      const client = await rc.getClient();
      const sizes = ['thumb', 'medium'];
      const relativePath = getLocalRelativePath(imageUrl);
      if (relativePath) {
        await Promise.all(
          sizes.map(s => client.del(`imgcache:${s}:local:${relativePath}`))
        );
      }
    }
  } catch (err) {
    logger.warn('Failed to invalidate local image proxy cache', { error: err.message });
  }
};

const downloadImageBuffer = async (storedUrl) => {
  if (!storedUrl) return null;
  try {
    if (isGcsUrl(storedUrl)) {
      if (!isGCSConfigured || !storage) return null;
      const gcsInfo = parseGcsUrl(storedUrl);
      if (!gcsInfo) {
        logger.warn(`downloadImageBuffer: could not parse GCS URL: ${storedUrl}`);
        return null;
      }
      const targetBucket = storage.bucket(gcsInfo.bucketName);
      const [contents] = await targetBucket.file(gcsInfo.objectName).download();
      return contents;
    }
    // Local: http://localhost:PORT/uploads/relative/path
    const backendUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
    if (storedUrl.startsWith(backendUrl + '/uploads/')) {
      const relPath = storedUrl.slice((backendUrl + '/uploads/').length);
      const localPath = path.resolve(localUploadsDir, relPath);
      if (!localPath.startsWith(localUploadsDir + path.sep) && localPath !== localUploadsDir) {
        return null; // path traversal
      }
      return await fs.promises.readFile(localPath);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Uploads a PDF buffer directly to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {Buffer} buffer The PDF buffer to upload.
 * @param {string} filename The filename for the PDF.
 * @param {object} [options={}] Upload options.
 * @param {string} [options.folder] Subfolder within the bucket/uploads dir.
 * @returns {Promise<string>} The public URL of the uploaded PDF.
 */
async function uploadPdfBuffer(buffer, filename, options = {}) {
  const { folder } = options;

  if (resolvedProvider === 'local') {
    const subdir = folder ? path.join(localUploadsDir, folder) : localUploadsDir;
    await fs.promises.mkdir(subdir, { recursive: true });
    const relPath = folder ? `${folder}/${filename}` : filename;
    await fs.promises.writeFile(path.join(localUploadsDir, relPath), buffer);
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${backendUrl}/uploads/${relPath}`;
  }

  if (!isGCSConfigured) {
    throw new Error('Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.');
  }
  const objectNameParts = [gcsPrefix, folder, filename].filter(Boolean);
  const objectName = objectNameParts.join('/');
  const gcsFile = bucket.file(objectName);
  await gcsFile.save(buffer, { contentType: 'application/pdf', resumable: false });
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectName}`;
}

module.exports = {
  uploadFile,
  uploadDocument,
  uploadPdfBuffer,
  deleteFileByUrl,
  resolveImageUrl,
  resolveHeaderImages,
  downloadImageBuffer,
};
