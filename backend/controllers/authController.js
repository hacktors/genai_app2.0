const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing system initialization variable: JWT_SECRET');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All registration parameters required.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Passphrase must be at least 8 characters.' });
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
    const { email, password } = req.body;
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
