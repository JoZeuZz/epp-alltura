const { Storage } = require('@google-cloud/storage');
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
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const [bucketName, ...objectParts] = parts;
    return { bucketName, objectName: decodeURIComponent(objectParts.join('/')) };
  } catch (error) {
    return null;
  }
};

/**
 * Uploads a file to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {object} file The file object from multer.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
const uploadFile = (file) => new Promise((resolve, reject) => {
  const { originalname, buffer } = file;
  const filename = Date.now() + path.extname(originalname);

  if (resolvedProvider === 'gcs' && !isGCSConfigured) {
    reject('Google Cloud Storage no está configurado. Revisa GCS_PROJECT_ID, GCS_BUCKET_NAME y GOOGLE_APPLICATION_CREDENTIALS.');
    return;
  }

  // Si Google Cloud no está configurado o se fuerza local, guardar localmente
  if (resolvedProvider === 'local') {
    // Crear directorio si no existe
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }

    const filePath = path.join(localUploadsDir, filename);
    
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(`Unable to save image locally: ${err}`);
      } else {
        // Devolver URL absoluta usando BACKEND_URL o construyendo desde PORT
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        const localUrl = `${backendUrl}/uploads/${filename}`;
        resolve(localUrl);
      }
    });
  } else {
    // Usar Google Cloud Storage
    const objectName = gcsPrefix ? `${gcsPrefix}/${filename}` : filename;
    const blob = bucket.file(objectName);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    })
    .on('error', (err) => {
      reject(`Unable to upload image to GCS: ${err}`);
    })
    .end(buffer);
  }
});

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

module.exports = { uploadFile, deleteFileByUrl };
