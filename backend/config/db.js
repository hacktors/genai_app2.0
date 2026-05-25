const mongoose = require('mongoose');

let cachedConnection = null;

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing system initialization variable: MONGO_URI');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    cachedConnection = conn;
    console.log(`MongoDB Database Bound Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database Connection Failure: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    // In development, don't terminate the whole process for DB connectivity issues.
    // Return null so callers can handle the missing DB connection gracefully.
    return null;
  }
};

const isDBConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDBConnected };
