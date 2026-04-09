const crypto = require('crypto');

const requestId = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.trim() !== '' ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = requestId;
