const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
// Load environment from project root .env so backend run from /backend finds vars
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { connectDB, isDBConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

const dbConnection = connectDB();

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';

app.use(helmet());
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ledger-ai-api' });
});

const requireDatabase = async (req, res, next) => {
  if (isDBConnected()) return next();

  await dbConnection.catch(() => null);

  if (isDBConnected()) return next();

  return res.status(503).json({
    error: 'Database unavailable. Check MONGO_URI, MongoDB Atlas network access, and database credentials.'
  });
};

app.use('/api/', limiter);
app.use('/api/auth', requireDatabase);
app.use('/api/expenses', requireDatabase);
app.use('/api/ai', requireDatabase);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT;
  if (!PORT) {
    console.error('ERROR: PORT environment variable is not set. Please ensure .env file contains PORT=<value>');
    process.exit(1);
  }
  const server = app.listen(PORT, () => console.log(`Server executing smoothly on port ${PORT}`));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${PORT} is already in use. Stop the existing backend process or set a different PORT in .env.`);
      process.exit(1);
    }

    throw error;
  });
}

module.exports = app;
