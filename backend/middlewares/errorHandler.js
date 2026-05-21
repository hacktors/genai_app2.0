const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const response = {
    error: err.message || 'Internal Architectural Exception Hooked'
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
