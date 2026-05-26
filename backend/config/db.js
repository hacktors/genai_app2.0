const mongoose = require('mongoose');

let cachedConnection = null;
let lastConnectionFailureAt = 0;

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const retryAfterMs = Number(process.env.DB_RETRY_AFTER_MS) || 30000;
  if (lastConnectionFailureAt && Date.now() - lastConnectionFailureAt < retryAfterMs) {
    return null;
  }

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing system initialization variable: MONGO_URI or MONGODB_URI');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    cachedConnection = conn;
    lastConnectionFailureAt = 0;
    console.log(`MongoDB Database Bound Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    lastConnectionFailureAt = Date.now();
    console.error(`Database Connection Failure: ${error.message}`);
    // Keep the Express app alive so routes can return a useful 503 instead of
    // crashing the whole serverless function during module startup.
    return null;
  }
};

const isDBConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDBConnected };
