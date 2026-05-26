import { GoogleGenerativeAI } from '@google/generative-ai';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import morgan from 'morgan';
import multer from 'multer';

dotenv.config();

mongoose.set('bufferCommands', false);

const categories = ['Food', 'Travel', 'Entertainment', 'Shopping', 'Medical', 'Education', 'Utilities', 'Bills', 'Groceries', 'Others'];
const paymentMethods = ['Cash', 'Card', 'UPI', 'NetBanking', 'Other'];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    password: { type: String, required: true, minlength: 8, select: false }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const ExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchant: { type: String, required: true, trim: true, maxlength: 160, index: true },
    date: { type: Date, required: true, index: true },
    items: {
      type: [{ name: { type: String, required: true, trim: true, maxlength: 160 }, price: { type: Number, required: true, min: 0 } }],
      default: []
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0, index: true },
    paymentMethod: { type: String, enum: paymentMethods, default: 'Other' },
    category: { type: String, enum: categories, default: 'Others', index: true },
    receiptUrl: { type: String, default: null, trim: true }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Unsupported asset format. Upload JPG, PNG, or PDF.'), allowed.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1000 * 1000 }
});

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

app.use(helmet({ contentSecurityPolicy: { directives: { mediaSrc: ["'self'", 'data:'] } } }));
app.use(cors({ origin: allowedOrigin, credentials: allowedOrigin !== '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

const normalizeErrorValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return normalizeErrorValue(value.message || value.error || value.code, fallback);
  return String(value);
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    const error = new Error('Database unavailable. Missing MONGO_URI or MONGODB_URI.');
    error.statusCode = 503;
    throw error;
  }

  globalThis.__ledgerMongoPromise ||= mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await globalThis.__ledgerMongoPromise;
};

const requireDatabase = async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: normalizeErrorValue(error, 'Database unavailable.') });
  }
};

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('Server authentication is not configured. Missing JWT_SECRET.');
    error.statusCode = 500;
    throw error;
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in again to continue.' });
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Server authentication is not configured. Missing JWT_SECRET.' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Session user no longer exists. Please sign in again.' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Invalid session. Please sign in again.' });
  }
};

const coerceAllowed = (value, allowed, fallback) => {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return allowed.find((entry) => entry.toLowerCase() === normalized) || fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const sanitizeAIExpense = (payload) => {
  const items = Array.isArray(payload.items)
    ? payload.items.filter((item) => item?.name).map((item) => ({ name: String(item.name).trim(), price: toNumber(item.price) }))
    : [];
  const subtotal = toNumber(payload.subtotal, items.reduce((sum, item) => sum + item.price, 0));
  const tax = toNumber(payload.tax);

  return {
    merchant: String(payload.merchant || 'Unknown Merchant').trim(),
    date: Number.isNaN(Date.parse(payload.date)) ? new Date().toISOString().slice(0, 10) : payload.date,
    items,
    subtotal,
    tax,
    total: toNumber(payload.total, subtotal + tax),
    paymentMethod: coerceAllowed(payload.paymentMethod, paymentMethods, 'Other'),
    category: coerceAllowed(payload.category, categories, 'Others')
  };
};

const analyzeReceiptAI = async (fileBuffer, mimeType) => {
  if (!process.env.GEMINI_API_KEY) throw new Error('Missing system initialization variable: GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  const prompt = `Extract receipt data as minified JSON only with keys merchant,date,items,subtotal,tax,total,paymentMethod,category.`;
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: fileBuffer.toString('base64'), mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType } }
  ]);
  const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
  return sanitizeAIExpense(JSON.parse(text));
};

app.get(['/', '/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', service: 'ledger-ai-api' });
});

app.post(['/api/auth/register', '/auth/register'], requireDatabase, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    generateToken('configuration-check');

    if (!name || !email || !password) return res.status(400).json({ error: 'All registration parameters required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Passphrase must be at least 8 characters.' });

    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail }).select('_id')) {
      return res.status(400).json({ error: 'Identity matrix maps to an existing account.' });
    }

    const user = await User.create({ name, email: normalizedEmail, password });
    return res.status(201).json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
  } catch (error) {
    return next(error);
  }
});

app.post(['/api/auth/login', '/auth/login'], requireDatabase, async (req, res, next) => {
  try {
    generateToken('configuration-check');
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password');

    if (user && (await user.comparePassword(password || ''))) {
      return res.json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
    }

    return res.status(401).json({ error: 'Invalid identification vectors.' });
  } catch (error) {
    return next(error);
  }
});

app.get(['/api/expenses', '/expenses'], requireDatabase, protect, async (req, res, next) => {
  try {
    const { category, search, sortBy, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const query = { userId: req.user._id };
    if (category) query.category = category;
    if (search) query.merchant = { $regex: String(search).trim(), $options: 'i' };

    let sortOptions = { date: -1 };
    if (sortBy === 'amount_asc') sortOptions = { total: 1 };
    if (sortBy === 'amount_desc') sortOptions = { total: -1 };

    const [expenses, total] = await Promise.all([
      Expense.find(query).sort(sortOptions).skip((currentPage - 1) * pageSize).limit(pageSize),
      Expense.countDocuments(query)
    ]);

    return res.json({ expenses, total, page: currentPage, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    return next(error);
  }
});

app.post(['/api/expenses', '/expenses'], requireDatabase, protect, async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, userId: req.user._id });
    return res.status(201).json(expense);
  } catch (error) {
    return next(error);
  }
});

app.get(['/api/expenses/analytics', '/expenses/analytics'], requireDatabase, protect, async (req, res, next) => {
  try {
    const breakdown = await Expense.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$category', value: { $sum: '$total' }, count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', value: { $round: ['$value', 2] }, count: 1 } },
      { $sort: { value: -1 } }
    ]);
    const totalStats = await Expense.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: null, grandTotal: { $sum: '$total' }, rawCount: { $sum: 1 } } }]);
    const stats = totalStats[0] || { grandTotal: 0, rawCount: 0 };
    return res.json({ grandTotal: Number(stats.grandTotal.toFixed(2)), rawCount: stats.rawCount, breakdown });
  } catch (error) {
    return next(error);
  }
});

app.put(['/api/expenses/:id', '/expenses/:id'], requireDatabase, protect, async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ error: 'Resource context unmapped or unavailable.' });
    return res.json(expense);
  } catch (error) {
    return next(error);
  }
});

app.delete(['/api/expenses/:id', '/expenses/:id'], requireDatabase, protect, async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Resource destruction target not found.' });
    return res.json({ message: 'Resource cleanly dropped from cluster.' });
  } catch (error) {
    return next(error);
  }
});

app.post(['/api/ai/analyze', '/ai/analyze'], requireDatabase, protect, upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Asset binary not found inside stream.' });
    const payloadAI = await analyzeReceiptAI(req.file.buffer, req.file.mimetype);
    return res.json({ ...payloadAI, receiptUrl: null });
  } catch (error) {
    return next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const response = { error: normalizeErrorValue(err, 'Internal server error.') };
  if (process.env.NODE_ENV !== 'production') response.stack = err.stack;
  res.status(statusCode).json(response);
});

export default app;
