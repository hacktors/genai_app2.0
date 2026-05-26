const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Keep the existing root .env behavior, then allow backend/.env to fill any
// missing values for developers who configure each app directory separately.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { connectDB, isDBConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();
let usingDevMemoryStore = false;

connectDB();

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      mediaSrc: ["'self'", 'data:']
    }
  }
}));
app.use(cors({ origin: allowedOrigin, credentials: allowedOrigin !== '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ledger-ai-api',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health'
    }
  });
});

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', service: 'ledger-ai-api' });
});

const requireDatabase = async (req, res, next) => {
  if (usingDevMemoryStore) {
    req.useMemoryStore = true;
    return next();
  }

  if (isDBConnected()) return next();

  if (process.env.NODE_ENV !== 'production' && process.env.DEV_MEMORY_STORE !== 'false') {
    usingDevMemoryStore = true;
    req.useMemoryStore = true;
    console.warn('MongoDB unavailable. Using in-memory development store for this server process.');
    connectDB();
    return next();
  }

  await connectDB();

  if (isDBConnected()) return next();

  return res.status(503).json({
    error: 'Database unavailable. Check MONGO_URI or MONGODB_URI, MongoDB Atlas network access, and database credentials.'
  });
};

app.use(['/api/', '/'], limiter);
app.use(['/api/auth', '/auth'], requireDatabase);
app.use(['/api/expenses', '/expenses'], requireDatabase);
app.use(['/api/ai', '/ai'], requireDatabase);
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/expenses', '/expenses'], expenseRoutes);
app.use(['/api/ai', '/ai'], aiRoutes);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT;
  if (!PORT) {
    console.warn('PORT environment variable is not set. Falling back to PORT=5000.');
  }
  const port = PORT || 5000;
  const server = app.listen(port, () => console.log(`Server executing smoothly on port ${port}`));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${port} is already in use. Stop the existing backend process or set a different PORT in .env.`);
      process.exit(1);
    }

    throw error;
  });
}

module.exports = app;
