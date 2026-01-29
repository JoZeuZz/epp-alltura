const express = require('express');
const jwt = require('jsonwebtoken');
const { Storage } = require('@google-cloud/storage');
const { logger } = require('../lib/logger');
const { createRedisRateLimiter, getRateLimitConfig } = require('../middleware/rateLimit');

const router = express.Router();

let sharp = null;
try {
  // eslint-disable-next-line global-require
  sharp = require('sharp');
} catch (error) {
  logger.warn('Sharp not available for image proxy resizing', { error: error.message });
}

const proxySecret = process.env.IMAGE_PROXY_SECRET || process.env.JWT_SECRET;
const proxyTokenTtlSeconds = parseInt(process.env.IMAGE_PROXY_TTL_SECONDS || '2592000', 10);
const proxyMaxCacheSeconds = Math.min(proxyTokenTtlSeconds, 3600);
const sizePresets = {
  thumb: { width: 320, height: 240 },
  medium: { width: 1024, height: 768 },
};

const storageOptions = {};
if (process.env.GCS_PROJECT_ID) {
  storageOptions.projectId = process.env.GCS_PROJECT_ID;
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageOptions);

const { windowMs: imageProxyWindowMs, max: imageProxyMax } = getRateLimitConfig('IMAGE_PROXY', {
  windowMs: 60 * 1000,
  max: 240,
});

const imageProxyLimiter = createRedisRateLimiter({
  keyPrefix: 'image-proxy',
  windowMs: imageProxyWindowMs,
  max: imageProxyMax,
  message: 'Demasiadas solicitudes de imágenes. Intenta nuevamente más tarde.',
});

const normalizeEtag = (etag) => {
  if (!etag) {
    return null;
  }

  if (etag.startsWith('W/"') || etag.startsWith('"')) {
    return etag;
  }

  return `"${etag}"`;
};

const stripEtag = (etag) => {
  if (!etag) {
    return null;
  }

  let clean = etag;
  if (clean.startsWith('W/"')) {
    clean = clean.slice(2);
  }
  clean = clean.replace(/^"+|"+$/g, '');
  return clean;
};

router.use(imageProxyLimiter);

router.get('/', async (req, res) => {
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
  const size = typeof req.query.size === 'string' ? req.query.size : '';

  if (!bucketName || !objectName) {
    return res.status(400).json({ message: 'Invalid image token payload' });
  }

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';
    const cacheMaxAge = proxyMaxCacheSeconds;
    const lastModified = metadata.updated || metadata.timeCreated;
    const baseEtagRaw = metadata.etag || metadata.md5Hash || metadata.generation;
    const baseEtag = stripEtag(baseEtagRaw);
    const resolvedEtag = normalizeEtag(baseEtag ? (size ? `${baseEtag}-${size}` : baseEtag) : null);

    if (resolvedEtag) {
      res.setHeader('ETag', resolvedEtag);
    }
    if (lastModified) {
      res.setHeader('Last-Modified', new Date(lastModified).toUTCString());
    }

    if (resolvedEtag && req.headers['if-none-match'] === resolvedEtag) {
      res.setHeader('Cache-Control', metadata.cacheControl || `private, max-age=${cacheMaxAge}`);
      return res.status(304).end();
    }

    if (!resolvedEtag && lastModified && req.headers['if-modified-since']) {
      const ifModifiedSince = new Date(req.headers['if-modified-since']);
      if (!Number.isNaN(ifModifiedSince.getTime()) && ifModifiedSince >= new Date(lastModified)) {
        res.setHeader('Cache-Control', metadata.cacheControl || `private, max-age=${cacheMaxAge}`);
        return res.status(304).end();
      }
    }

    if (size && sizePresets[size] && sharp) {
      const [fileBuffer] = await file.download();
      const preset = sizePresets[size];
      const pipeline = sharp(fileBuffer, { failOnError: false })
        .rotate()
        .resize({
          width: preset.width,
          height: preset.height,
          fit: 'inside',
          withoutEnlargement: true,
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      const resolvedContentType =
        info.format === 'jpeg' ? 'image/jpeg' : info.format ? `image/${info.format}` : contentType;

      res.setHeader('Content-Type', resolvedContentType);
      res.setHeader('Cache-Control', metadata.cacheControl || `private, max-age=${cacheMaxAge}`);
      return res.end(data);
    }

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
