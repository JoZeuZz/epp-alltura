const { Storage } = require('@google-cloud/storage');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
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
const maxImageBytes = parseInt(process.env.IMAGE_MAX_BYTES || '10485760', 10);
const jpegQuality = parseInt(process.env.IMAGE_JPEG_QUALITY || '92', 10);

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
  } catch (error) {
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

const maybeCompressLossless = async (file) => {
  if (!losslessCompressionEnabled && !stripMetadataEnabled) {
    return file;
  }

  if (!file || !file.buffer || !file.mimetype || !file.mimetype.startsWith('image/')) {
    return file;
  }

  const sharp = getSharp();
  if (!sharp) {
    return file;
  }

  try {
    let pipeline = sharp(file.buffer, { failOnError: false });

    if (stripMetadataEnabled) {
      pipeline = pipeline.rotate();
    }

    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      pipeline = pipeline.jpeg({
        quality: jpegQuality,
        mozjpeg: true,
      });
    } else if (file.mimetype === 'image/png') {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    } else if (file.mimetype === 'image/webp') {
      pipeline = pipeline.webp({ lossless: losslessCompressionEnabled, quality: 100 });
    } else if (file.mimetype === 'image/avif') {
      pipeline = pipeline.avif({ lossless: losslessCompressionEnabled });
    } else {
      return file;
    }

    const outputBuffer = await pipeline.toBuffer();
    if (!outputBuffer) {
      return file;
    }

    if (!stripMetadataEnabled && outputBuffer.length >= file.buffer.length) {
      return file;
    }

    return {
      ...file,
      buffer: outputBuffer,
      size: outputBuffer.length,
    };
  } catch (error) {
    logger.warn('Lossless compression failed, using original image', {
      error: error.message,
      mimetype: file.mimetype,
    });
    return file;
  }
};

/**
 * Uploads a file to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {object} file The file object from multer.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
const uploadFile = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('Archivo inválido para carga de imagen.');
  }

  const incomingSize = file.size || file.buffer.length || 0;
  if (maxImageBytes > 0 && incomingSize > maxImageBytes) {
    const error = new Error(
      `La imagen supera el tamaño máximo permitido (${Math.round(maxImageBytes / (1024 * 1024))} MB).`
    );
    error.statusCode = 413;
    throw error;
  }

  const preparedFile = await maybeCompressLossless(file);
  const { originalname, buffer } = preparedFile;
  const processedSize = preparedFile.size || buffer.length || 0;
  if (maxImageBytes > 0 && processedSize > maxImageBytes) {
    const error = new Error(
      `La imagen procesada supera el tamaño máximo permitido (${Math.round(maxImageBytes / (1024 * 1024))} MB).`
    );
    error.statusCode = 413;
    throw error;
  }
  const filename = Date.now() + path.extname(originalname);

  if (resolvedProvider === 'gcs' && !isGCSConfigured) {
    throw new Error(
      'Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  // Si Google Cloud no está configurado o se fuerza local, guardar localmente
  if (resolvedProvider === 'local') {
    // Crear directorio si no existe
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }

    const filePath = path.join(localUploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    // Devolver URL absoluta usando BACKEND_URL o construyendo desde PORT
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${backendUrl}/uploads/${filename}`;
  }

  // Usar Google Cloud Storage
  const objectName = gcsPrefix ? `${gcsPrefix}/${filename}` : filename;
  const blob = bucket.file(objectName);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: preparedFile.mimetype || 'application/octet-stream',
    },
  });

  await new Promise((resolve, reject) => {
    blobStream
      .on('finish', resolve)
      .on('error', (err) => reject(new Error(`Unable to upload image to GCS: ${err}`)))
      .end(buffer);
  });

  return `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
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
