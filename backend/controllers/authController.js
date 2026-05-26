const User = require('../models/User');
const jwt = require('jsonwebtoken');
const memoryStore = require('../services/memoryStore');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing system initialization variable: JWT_SECRET');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const ensureAuthConfigured = () => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('Server authentication is not configured. Missing JWT_SECRET.');
    error.statusCode = 500;
    throw error;
  }
};

exports.register = async (req, res, next) => {
  try {
    ensureAuthConfigured();

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All registration parameters required.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Passphrase must be at least 8 characters.' });
    }

    if (req.useMemoryStore) {
      const userExists = await memoryStore.findUserByEmail(email);
      if (userExists) {
        return res.status(400).json({ error: 'Identity matrix maps to an existing account.' });
      }

      const user = await memoryStore.createUser({ name, email, password });
      return res.status(201).json({
        ...user,
        token: generateToken(user._id)
      });
    }

    const userExists = await User.findOne({ email: String(email).toLowerCase().trim() }).select('_id');
    if (userExists) {
      return res.status(400).json({ error: 'Identity matrix maps to an existing account.' });
    }

    const user = await User.create({ name, email, password });
    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    ensureAuthConfigured();

    const { email, password } = req.body;

    if (req.useMemoryStore) {
      const user = await memoryStore.findUserByEmail(email);

      if (user && (await memoryStore.comparePassword(user, password || ''))) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateToken(user._id)
        });
      }

      return res.status(401).json({ error: 'Invalid identification vectors.' });
    }

    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password');

    if (user && (await user.comparePassword(password || ''))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      });
    }

    return res.status(401).json({ error: 'Invalid identification vectors.' });
  } catch (error) {
    return next(error);
  }
};
