const jwt = require('jsonwebtoken');

const tokenBlacklist = new Set(); // Use Redis in production

function revokeToken(token) {
  tokenBlacklist.add(token);
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token format is "Bearer <token>"' });
  }

  const token = tokenParts[1];

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token revocado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { authMiddleware, revokeToken };
