import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Rate limiting for payment endpoints
 */
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many payment requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Webhook rate limiting (more restrictive)
 */
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Allow up to 50 webhook calls per minute
  message: {
    success: false,
    message: 'Webhook rate limit exceeded'
  },
  standardHeaders: false,
  legacyHeaders: false
});

/**
 * Validate Razorpay webhook signature
 */
export const validateWebhookSignature = (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('Razorpay webhook secret not configured');
      return res.status(500).json({
        success: false,
        message: 'Webhook validation configuration error'
      });
    }

    if (!webhookSignature) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({
        success: false,
        message: 'Webhook signature missing'
      });
    }

    // Get raw body for signature verification
    const rawBody = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      logger.warn(`Invalid webhook signature from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    logger.error('Error validating webhook signature:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook validation failed'
    });
  }
};

/**
 * Validate payment order creation request
 */
export const validateCreateOrder = [
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isIn([
      'free', 'starter', 'personal', 'pro',
      'developer_starter', 'developer_basic', 'developer_pro',
      'business_starter', 'business_pro', 'business_advanced', 'enterprise'
    ])
    .withMessage('Invalid plan ID'),
  
  body('subscriptionPeriod')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Subscription period must be monthly or yearly'),
  
  body('billingAddress.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  
  body('billingAddress.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('billingAddress.phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid Indian phone number is required'),
  
  body('billingAddress.address.line1')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters')
    .escape(),
  
  body('billingAddress.address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .escape(),
  
  body('billingAddress.address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters')
    .escape(),
  
  body('billingAddress.address.postal_code')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Valid 6-digit postal code is required'),
  
  body('gstNumber')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format')
];

/**
 * Validate payment verification request
 */
export const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required')
    .matches(/^order_[a-zA-Z0-9]+$/)
    .withMessage('Invalid order ID format'),
  
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required')
    .matches(/^pay_[a-zA-Z0-9]+$/)
    .withMessage('Invalid payment ID format'),
  
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid signature format')
];

/**
 * Validate payment history query parameters
 */
export const validatePaymentHistoryQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid status filter')
];

/**
 * Validate refund request
 */
export const validateRefundRequest = [
  param('paymentId')
    .isMongoId()
    .withMessage('Valid payment ID is required'),
  
  body('amount')
    .optional()
    .isInt({ min: 100 })
    .withMessage('Refund amount must be at least ₹1'),
  
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters')
    .escape()
];

/**
 * Security headers middleware for payment endpoints
 */
export const setSecurityHeaders = (req, res, next) => {
  // Prevent caching of sensitive payment data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Prevent content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only allow HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

/**
 * Sanitize payment data before logging
 */
export const sanitizePaymentData = (data) => {
  const sensitiveFields = [
    'razorpay_signature',
    'razorpay_payment_id',
    'phone',
    'email',
    'address'
  ];
  
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      if (field === 'phone') {
        sanitized[field] = sanitized[field].replace(/(\d{6})\d{4}/, '$1****');
      } else if (field === 'email') {
        sanitized[field] = sanitized[field].replace(/(.{2}).*@/, '$1***@');
      } else {
        sanitized[field] = '[REDACTED]';
      }
    }
  });
  
  return sanitized;
};

/**
 * Log payment events with sanitized data
 */
export const logPaymentEvent = (event, data, req) => {
  const sanitizedData = sanitizePaymentData(data);
  
  logger.info('Payment event', {
    event,
    data: sanitizedData,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

/**
 * Validate user ownership of payment
 */
export const validatePaymentOwnership = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    
    const Payment = (await import('../models/Payment.js')).default;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.user.toString() !== userId) {
      logger.warn(`User ${userId} attempted to access payment ${paymentId} owned by ${payment.user}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    req.payment = payment;
    next();
  } catch (error) {
    logger.error('Error validating payment ownership:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const sanitizedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value ? '[REDACTED]' : undefined
    }));
    
    logger.warn('Validation errors in payment request', {
      errors: sanitizedErrors,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Check if payments are enabled
 */
export const checkPaymentsEnabled = (req, res, next) => {
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    return res.status(503).json({
      success: false,
      message: 'Payment service is currently unavailable'
    });
  }
  next();
};

/**
 * Verify Razorpay configuration
 */
export const verifyRazorpayConfig = (req, res, next) => {
  const requiredEnvVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing Razorpay configuration:', missingVars);
    return res.status(500).json({
      success: false,
      message: 'Payment service configuration error'
    });
  }
  
  next();
};