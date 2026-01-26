const express = require('express');
const jwt = require('jsonwebtoken');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('../lib/logger');

const router = express.Router();

const proxySecret = process.env.IMAGE_PROXY_SECRET || process.env.JWT_SECRET;
const proxyTokenTtlSeconds = parseInt(process.env.IMAGE_PROXY_TTL_SECONDS || '2592000', 10);

const storageOptions = {};
if (process.env.GCS_PROJECT_ID) {
  storageOptions.projectId = process.env.GCS_PROJECT_ID;
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageOptions);

router.get('/image-proxy', async (req, res) => {
  if (!proxySecret) {
    return res.status(500).json({ message: 'Image proxy secret not configured' });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ message: 'Missing image token' });
  }

  let payload;
  try {
    payload = jwt.verify(token, proxySecret);
  } catch (error) {
    logger.warn('Invalid image proxy token', { error: error.message });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const bucketName = payload.b;
  const objectName = payload.o;

  if (!bucketName || !objectName) {
    return res.status(400).json({ message: 'Invalid image token payload' });
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';
    const cacheMaxAge = Math.min(proxyTokenTtlSeconds, 3600);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', metadata.cacheControl || `private, max-age=${cacheMaxAge}`);

    const stream = file.createReadStream();
    stream.on('error', (error) => {
      logger.warn('Image proxy stream error', { error: error.message, objectName });
      if (!res.headersSent) {
        res.status(error.code === 404 ? 404 : 500).end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    logger.error('Image proxy error', { error: error.message, objectName });
    res.status(500).json({ message: 'Failed to fetch image' });
  }
});

module.exports = router;
