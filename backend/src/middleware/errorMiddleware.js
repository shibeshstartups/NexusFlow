import { logger } from '../utils/logger.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  constructor(errors) {
    const message = Array.isArray(errors) 
      ? errors.map(err => err.msg || err.message).join(', ')
      : errors;
    
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// MongoDB duplicate key error handler
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists.`;
  return new AppError(message, 400);
};

// MongoDB validation error handler
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(error => ({
    field: error.path,
    message: error.message,
    value: error.value
  }));
  
  const message = errors.map(error => error.message).join('. ');
  return new ValidationError(errors);
};

// MongoDB cast error handler
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// JWT error handlers
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

// File upload error handler
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum size allowed is 5GB.', 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum 50 files allowed per upload.', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field.', 400);
  }
  return new AppError('File upload error: ' + err.message, 400);
};

// Storage quota error handler
const handleStorageQuotaError = (used, quota) => {
  const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
  const quotaGB = (quota / (1024 * 1024 * 1024)).toFixed(2);
  return new AppError(
    `Storage quota exceeded. Using ${usedGB}GB of ${quotaGB}GB limit.`, 
    413
  );
};

// Rate limiting error handler
const handleRateLimitError = () => {
  return new AppError('Too many requests. Please try again later.', 429);
};

// Send error response for development
const sendErrorDev = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    logger.logError(err, req);
    
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      }
    });
  }
  
  // Rendered website errors
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

// Send error response for production
const sendErrorProd = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted errors: send message to client
    if (err.isOperational) {
      logger.logError(err, req);
      
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        ...(err.errors && { errors: err.errors })
      });
    }
    
    // Programming or unknown errors: don't leak error details
    logger.error('Unexpected Error:', err);
    
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our end. Please try again later.'
    });
  }
  
  // Rendered website errors
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  
  // Programming or unknown errors
  logger.error('Unexpected Error:', err);
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (error.code === 11000) error = handleDuplicateKeyError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);

    sendErrorProd(error, req, res);
  }
};

// 404 handler middleware
export const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
  next(new AppError(message, 404));
};

// Async error catcher wrapper
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Validation error formatter
export const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

// Security error handlers
export const handleSecurityError = (type, details, req) => {
  logger.logSecurity(type, {
    ...details,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method
  });
  
  switch (type) {
    case 'SUSPICIOUS_ACTIVITY':
      return new AppError('Suspicious activity detected. Access denied.', 403);
    case 'INVALID_FILE_TYPE':
      return new AppError('Invalid file type. Only images, videos, and documents are allowed.', 400);
    case 'FILE_TOO_LARGE':
      return new AppError('File size exceeds the maximum limit.', 413);
    case 'INVALID_CREDENTIALS':
      return new AppError('Invalid credentials provided.', 401);
    case 'ACCESS_DENIED':
      return new AppError('Access denied. Insufficient permissions.', 403);
    case 'QUOTA_EXCEEDED':
      return new AppError('Storage or transfer quota exceeded.', 413);
    default:
      return new AppError('Security error occurred.', 403);
  }
};

// Database error handler
export const handleDatabaseError = (error, operation) => {
  logger.error(`Database Error during ${operation}:`, error);
  
  if (error.name === 'MongoNetworkError') {
    return new AppError('Database connection failed. Please try again later.', 503);
  }
  
  if (error.name === 'MongoTimeoutError') {
    return new AppError('Database operation timed out. Please try again.', 504);
  }
  
  if (error.code === 11000) {
    return handleDuplicateKeyError(error);
  }
  
  return new AppError('Database operation failed. Please try again later.', 500);
};

// File system error handler
export const handleFileSystemError = (error, operation) => {
  logger.error(`File System Error during ${operation}:`, error);
  
  switch (error.code) {
    case 'ENOENT':
      return new AppError('File or directory not found.', 404);
    case 'EACCES':
      return new AppError('Permission denied to access file.', 403);
    case 'ENOSPC':
      return new AppError('No space left on device.', 507);
    case 'EMFILE':
    case 'ENFILE':
      return new AppError('Too many open files. Please try again later.', 503);
    default:
      return new AppError('File system error occurred.', 500);
  }
};

// Export utility functions
export {
  handleDuplicateKeyError,
  handleValidationError,
  handleCastError,
  handleJWTError,
  handleJWTExpiredError,
  handleMulterError,
  handleStorageQuotaError,
  handleRateLimitError
};