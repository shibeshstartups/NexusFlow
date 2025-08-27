import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import crypto from 'crypto';
import User from '../models/User.js';
import { AppError, catchAsync } from './errorMiddleware.js';
import { logger } from '../utils/logger.js';

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate refresh token
const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Create and send token response
export const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.cookie('jwt', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    expires: new Date(
      Date.now() + (process.env.JWT_REFRESH_COOKIE_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000
    )
  });

  // Remove password from output
  user.password = undefined;

  // Update login tracking
  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  user.save({ validateBeforeSave: false });

  logger.logAuth('LOGIN_SUCCESS', user._id, {
    email: user.email,
    ip: res.req?.ip,
    userAgent: res.req?.get('User-Agent')
  });

  res.status(statusCode).json({
    success: true,
    message,
    token,
    refreshToken,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageQuota: user.storageQuota,
        transferUsed: user.transferUsed,
        transferQuota: user.transferQuota,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    }
  });
};

// Verify JWT token
export const verifyToken = async (token, secret = process.env.JWT_SECRET) => {
  try {
    const decoded = await promisify(jwt.verify)(token, secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Your token has expired. Please log in again.', 401);
    } else if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please log in again.', 401);
    } else {
      throw new AppError('Token verification failed.', 401);
    }
  }
};

// Protect routes - require authentication
export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    logger.logAuth('AUTH_FAILED', null, {
      reason: 'No token provided',
      ip: req.ip,
      url: req.originalUrl
    });
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  const decoded = await verifyToken(token);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+password');
  if (!currentUser) {
    logger.logAuth('AUTH_FAILED', decoded.id, {
      reason: 'User no longer exists',
      ip: req.ip
    });
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // 4) Check if user is active
  if (!currentUser.isActive) {
    logger.logAuth('AUTH_FAILED', currentUser._id, {
      reason: 'User account inactive',
      ip: req.ip
    });
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // 5) Check if user changed password after the token was issued
  if (currentUser.passwordChangedAfter && currentUser.passwordChangedAfter(decoded.iat)) {
    logger.logAuth('AUTH_FAILED', currentUser._id, {
      reason: 'Password changed after token issued',
      ip: req.ip
    });
    return next(new AppError('User recently changed password! Please log in again.', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Optional authentication - doesn't fail if no token
export const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = await verifyToken(token);
      const currentUser = await User.findById(decoded.id);
      
      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
        res.locals.user = currentUser;
      }
    } catch (error) {
      // Silent fail for optional auth
      logger.logAuth('OPTIONAL_AUTH_FAILED', null, {
        reason: error.message,
        ip: req.ip
      });
    }
  }
  
  next();
});

// Restrict access to certain roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.logAuth('ACCESS_DENIED', req.user._id, {
        reason: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role,
        ip: req.ip,
        url: req.originalUrl
      });
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Check if user is owner of resource
export const checkOwnership = (Model, paramName = 'id') => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramName];
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return next(new AppError(`${Model.modelName} not found`, 404));
    }

    // Check if user is owner or admin
    if (resource.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.logAuth('ACCESS_DENIED', req.user._id, {
        reason: 'Not resource owner',
        resourceType: Model.modelName,
        resourceId,
        ip: req.ip
      });
      return next(new AppError('You do not have permission to access this resource', 403));
    }

    req.resource = resource;
    next();
  });
};

// Check storage quota before file operations
export const checkStorageQuota = (sizeField = 'size') => {
  return catchAsync(async (req, res, next) => {
    const user = req.user;
    let additionalSize = 0;

    // Get size from request body, file, or files
    if (req.body[sizeField]) {
      additionalSize = parseInt(req.body[sizeField]);
    } else if (req.file) {
      additionalSize = req.file.size;
    } else if (req.files && Array.isArray(req.files)) {
      additionalSize = req.files.reduce((total, file) => total + file.size, 0);
    }

    if (!user.hasStorageCapacity(additionalSize)) {
      logger.logAuth('QUOTA_EXCEEDED', user._id, {
        type: 'storage',
        used: user.storageUsed,
        quota: user.storageQuota,
        additional: additionalSize,
        ip: req.ip
      });
      
      const usedGB = (user.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
      const quotaGB = (user.storageQuota / (1024 * 1024 * 1024)).toFixed(2);
      
      return next(new AppError(
        `Storage quota exceeded. Using ${usedGB}GB of ${quotaGB}GB limit.`,
        413
      ));
    }

    next();
  });
};

// Check transfer quota for downloads
export const checkTransferQuota = (sizeField = 'size') => {
  return catchAsync(async (req, res, next) => {
    const user = req.user;
    let transferSize = 0;

    if (req.body[sizeField]) {
      transferSize = parseInt(req.body[sizeField]);
    } else if (req.resource && req.resource.size) {
      transferSize = req.resource.size;
    }

    if (!user.hasTransferCapacity(transferSize)) {
      logger.logAuth('QUOTA_EXCEEDED', user._id, {
        type: 'transfer',
        used: user.transferUsed,
        quota: user.transferQuota,
        additional: transferSize,
        ip: req.ip
      });
      
      const usedGB = (user.transferUsed / (1024 * 1024 * 1024)).toFixed(2);
      const quotaGB = (user.transferQuota / (1024 * 1024 * 1024)).toFixed(2);
      
      return next(new AppError(
        `Transfer quota exceeded. Using ${usedGB}GB of ${quotaGB}GB limit.`,
        413
      ));
    }

    next();
  });
};

// Refresh JWT token
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body || req.cookies;

  if (!refreshToken) {
    return next(new AppError('Refresh token not provided', 401));
  }

  // Verify refresh token
  const decoded = await verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated.', 401));
  }

  // Generate new tokens
  createSendToken(currentUser, 200, res, 'Token refreshed successfully');
});

// Logout
export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  if (req.user) {
    logger.logAuth('LOGOUT', req.user._id, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  return {
    resetToken,
    hashedToken,
    expires: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
};

// Generate email verification token
export const generateEmailVerificationToken = () => {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  
  return {
    verificationToken,
    hashedToken,
    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
};

// Verify email verification token
export const verifyEmailToken = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  if (!token) {
    return next(new AppError('Email verification token is required', 400));
  }

  // Hash the token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with this token and check if it hasn't expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Email verification token is invalid or has expired', 400));
  }

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  logger.logAuth('EMAIL_VERIFIED', user._id, {
    email: user.email,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// Check plan permissions
export const checkPlanPermissions = (requiredPlan = 'free') => {
  const planHierarchy = {
    'free': 0,
    'creative_pro': 1,
    'business': 2,
    'enterprise': 3
  };

  return (req, res, next) => {
    const userPlanLevel = planHierarchy[req.user.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      logger.logAuth('PLAN_RESTRICTION', req.user._id, {
        userPlan: req.user.plan,
        requiredPlan,
        feature: req.originalUrl,
        ip: req.ip
      });
      
      return next(new AppError(
        `This feature requires a ${requiredPlan} plan or higher. Please upgrade your account.`,
        403
      ));
    }

    next();
  };
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// API key authentication (for external integrations)
export const apiKeyAuth = catchAsync(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return next(new AppError('API key is required', 401));
  }

  // Hash the API key to compare with stored hash
  const hashedApiKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const user = await User.findOne({
    'apiKeys.hashedKey': hashedApiKey,
    'apiKeys.isActive': true
  });

  if (!user) {
    logger.logAuth('API_KEY_FAILED', null, {
      apiKey: apiKey.substring(0, 8) + '...',
      ip: req.ip
    });
    return next(new AppError('Invalid API key', 401));
  }

  req.user = user;
  next();
});

export default {
  protect,
  optionalAuth,
  restrictTo,
  checkOwnership,
  checkStorageQuota,
  checkTransferQuota,
  refreshToken,
  logout,
  verifyEmailToken,
  checkPlanPermissions,
  securityHeaders,
  apiKeyAuth,
  createSendToken,
  verifyToken,
  generatePasswordResetToken,
  generateEmailVerificationToken
};