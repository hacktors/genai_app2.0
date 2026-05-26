const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

const normalizeErrorValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const messages = value.map((entry) => normalizeErrorValue(entry, '')).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
  }
  if (typeof value === 'object') {
    if (value.message) return normalizeErrorValue(value.message, fallback);
    if (value.error) return normalizeErrorValue(value.error, fallback);
    if (value.code) return normalizeErrorValue(value.code, fallback);

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const response = {
    error: normalizeErrorValue(err.message || err, 'Internal Architectural Exception Hooked')
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(err.statusCode || statusCode).json(response);
};

module.exports = { errorHandler, notFound };
