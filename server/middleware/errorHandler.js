const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`Duplicate value: "${value}" for field "${field}". Please use another value.`, 400);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data. ${messages.join('. ')}`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File is too large. Maximum size is 25MB.', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(`Unexpected file field: "${err.field}".`, 400);
  }
  return new AppError('File upload failed. Please try again.', 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Unknown / programming error: don't leak details
  logger.error('UNEXPECTED ERROR', { message: err.message, stack: err.stack });
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

/**
 * Centralized error-handling middleware. Must be registered last,
 * after all routes, so Express treats it as the error handler.
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
    return;
  }

  let error = Object.assign(
    Object.create(Object.getPrototypeOf(err)),
    err
  );
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.name === 'MulterError') error = handleMulterError(error);

  sendErrorProd(error, res);
};
