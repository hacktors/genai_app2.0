const jwt = require('jsonwebtoken');
const User = require('../models/User');
const memoryStore = require('../services/memoryStore');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in again to continue.' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server authentication is not configured. Missing JWT_SECRET.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (req.useMemoryStore) {
      const user = await memoryStore.findUserById(decoded.id);

      if (!user) {
        return res.status(401).json({ error: 'Session user no longer exists. Please sign in again.' });
      }

      req.user = user;
      return next();
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Session user no longer exists. Please sign in again.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Session expired. Please sign in again.'
      : 'Invalid session. Please sign in again.';
    return res.status(401).json({ error: message });
  }
};

module.exports = { protect };
