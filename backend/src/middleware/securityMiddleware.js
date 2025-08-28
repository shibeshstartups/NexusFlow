import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

// Advanced security middleware for protecting against various attacks

// SQL Injection Prevention Middleware
export const sqlInjectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /('|\\')|(;)|(\\|)|(\\*)|(%)|(\\+)|(=)/i,
    /(union|select|insert|delete|update|create|drop|exec|execute)/i,
    /(script|javascript|vbscript|onload|onerror)/i,
    /(<|>|"|%3c|%3e)/i
  ];
  
  const checkForSQLi = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && checkForSQLi(obj[key])) {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) return true;
      }
    }
    return false;
  };
  
  // Check request body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    logger.logSecurity('SQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid characters detected in request'
    });
  }
  
  next();
};

// XSS Prevention Middleware
export const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\s]*=[\s]*[\"']\\s*javascript:/gi,
    /<[^>]*?=[\"'][^\"'>]*?javascript:/gi
  ];
  
  const sanitizeString = (str) => {
    let sanitized = str;
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // HTML encode special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  };
  
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  // Sanitize request data
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

// CSRF Protection Middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for API endpoints using JWT
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return next();
  }
  
  // For cookie-based authentication, check for CSRF token
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token) {
      logger.logSecurity('CSRF_TOKEN_MISSING', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'CSRF token required'
      });
    }
    
    // Verify CSRF token (simplified - in production, use crypto.timingSafeEqual)
    const expectedToken = req.session?.csrfToken;
    if (token !== expectedToken) {
      logger.logSecurity('CSRF_TOKEN_INVALID', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }
  }
  
  next();
};

// NoSQL Injection Prevention
export const noSQLInjectionProtection = (req, res, next) => {
  const checkForNoSQLi = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          return true;
        }
        if (typeof obj[key] === 'object' && checkForNoSQLi(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForNoSQLi(req.body) || checkForNoSQLi(req.query) || checkForNoSQLi(req.params)) {
    logger.logSecurity('NOSQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid request format detected'
    });
  }
  
  next();
};

// Request Size Limiting
export const requestSizeLimit = (maxSizeInMB = 10) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = maxSizeInMB * 1024 * 1024; // Convert to bytes
    
    if (contentLength > maxSize) {
      logger.logSecurity('REQUEST_SIZE_EXCEEDED', {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.originalUrl
      });
      
      return res.status(413).json({
        success: false,
        message: `Request too large. Maximum size: ${maxSizeInMB}MB`
      });
    }
    
    next();
  };
};

// Suspicious User Agent Detection
export const suspiciousUserAgentDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const suspiciousAgents = [
    /sqlmap/i,
    /nikto/i,
    /w3af/i,
    /acunetix/i,
    /netsparker/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];
  
  const isSuspicious = suspiciousAgents.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    logger.logSecurity('SUSPICIOUS_USER_AGENT', {
      ip: req.ip,
      userAgent,
      url: req.originalUrl,
      method: req.method
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// Honeypot Protection
export const honeypotProtection = (req, res, next) => {
  // Check for honeypot field in forms
  if (req.body && req.body.honeypot && req.body.honeypot.trim() !== '') {
    logger.logSecurity('HONEYPOT_TRIGGERED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      honeypotValue: req.body.honeypot
    });
    
    // Silently reject the request
    return res.status(200).json({
      success: true,
      message: 'Request processed successfully'
    });
  }
  
  next();
};

// Content Type Validation
export const contentTypeValidation = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.get('Content-Type') || '';
      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        logger.logSecurity('INVALID_CONTENT_TYPE', {
          ip: req.ip,
          contentType,
          allowedTypes,
          url: req.originalUrl
        });
        
        return res.status(400).json({
          success: false,
          message: 'Invalid content type'
        });
      }
    }
    
    next();
  };
};

// Progressive Delay for Suspicious Activity
const suspiciousIPs = new Map();
export const progressiveDelay = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (suspiciousIPs.has(ip)) {
    const data = suspiciousIPs.get(ip);
    const timeDiff = now - data.lastRequest;
    
    // If requests are coming too fast, increase delay
    if (timeDiff < 1000) { // Less than 1 second
      data.suspicionLevel += 1;
      data.delay = Math.min(data.delay * 2, 10000); // Max 10 seconds
      
      setTimeout(() => {
        next();
      }, data.delay);
      
      logger.logSecurity('PROGRESSIVE_DELAY_APPLIED', {
        ip,
        suspicionLevel: data.suspicionLevel,
        delay: data.delay
      });
      
      return;
    } else {
      // Reduce suspicion over time
      if (timeDiff > 60000) { // More than 1 minute
        data.suspicionLevel = Math.max(0, data.suspicionLevel - 1);
        data.delay = Math.max(100, data.delay / 2);
      }
    }
    
    data.lastRequest = now;
  } else {
    suspiciousIPs.set(ip, {
      suspicionLevel: 0,
      delay: 100,
      lastRequest: now
    });
  }
  
  next();
};

// Clean up old IP records periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [ip, data] of suspiciousIPs) {
    if (now - data.lastRequest > maxAge) {
      suspiciousIPs.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

// Main security middleware object
const securityMiddleware = {
  sqlInjectionProtection,
  xssProtection,
  csrfProtection,
  noSQLInjectionProtection,
  requestSizeLimit,
  suspiciousUserAgentDetection,
  honeypotProtection,
  contentTypeValidation,
  progressiveDelay
};

export default securityMiddleware;