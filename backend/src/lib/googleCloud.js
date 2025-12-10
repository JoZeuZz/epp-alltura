const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Verificar si Google Cloud está configurado
const isGCSConfigured = process.env.GCS_PROJECT_ID && 
                        process.env.GCS_BUCKET_NAME && 
                        process.env.GOOGLE_APPLICATION_CREDENTIALS &&
                        process.env.GCS_PROJECT_ID !== 'your-gcp-project-id';

let storage, bucket;

if (isGCSConfigured) {
  storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
}

/**
 * Uploads a file to Google Cloud Storage or saves locally if GCS is not configured.
 * @param {object} file The file object from multer.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
const uploadFile = (file) => new Promise((resolve, reject) => {
  const { originalname, buffer } = file;
  const filename = Date.now() + path.extname(originalname);

  // Si Google Cloud no está configurado, guardar localmente
  if (!isGCSConfigured) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(`Unable to save image locally: ${err}`);
      } else {
        // Devolver URL local
        const localUrl = `/uploads/${filename}`;
        resolve(localUrl);
      }
    });
  } else {
    // Usar Google Cloud Storage
    const blob = bucket.file(filename);
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

module.exports = { uploadFile };
