import redisService from '../services/redisService.js';
import { logger } from '../utils/logger.js';

// Rate limit configurations by user plan
const RATE_LIMIT_CONFIGS = {
  free: {
    api: { requests: 100, window: 3600 }, // 100 requests per hour
    upload: { requests: 10, window: 3600, size: 50 * 1024 * 1024 }, // 10 uploads per hour, 50MB max
    download: { requests: 50, window: 3600, bandwidth: 1 * 1024 * 1024 * 1024 }, // 50 downloads per hour, 1GB bandwidth
    share: { requests: 5, window: 3600 } // 5 shares per hour
  },
  creative_pro: {
    api: { requests: 500, window: 3600 }, // 500 requests per hour
    upload: { requests: 50, window: 3600, size: 500 * 1024 * 1024 }, // 50 uploads per hour, 500MB max
    download: { requests: 200, window: 3600, bandwidth: 10 * 1024 * 1024 * 1024 }, // 200 downloads per hour, 10GB bandwidth
    share: { requests: 25, window: 3600 } // 25 shares per hour
  },
  business: {
    api: { requests: 2000, window: 3600 }, // 2000 requests per hour
    upload: { requests: 200, window: 3600, size: 2 * 1024 * 1024 * 1024 }, // 200 uploads per hour, 2GB max
    download: { requests: 1000, window: 3600, bandwidth: 50 * 1024 * 1024 * 1024 }, // 1000 downloads per hour, 50GB bandwidth
    share: { requests: 100, window: 3600 } // 100 shares per hour
  },
  enterprise: {
    api: { requests: 10000, window: 3600 }, // 10000 requests per hour
    upload: { requests: 1000, window: 3600, size: 10 * 1024 * 1024 * 1024 }, // 1000 uploads per hour, 10GB max
    download: { requests: 5000, window: 3600, bandwidth: 500 * 1024 * 1024 * 1024 }, // 5000 downloads per hour, 500GB bandwidth
    share: { requests: 500, window: 3600 } // 500 shares per hour
  }
};

// Dynamic rate limit adjustments based on usage patterns
const DYNAMIC_ADJUSTMENTS = {
  newUser: { factor: 0.5, duration: 7 * 24 * 3600 }, // 50% limits for first week
  highActivity: { factor: 1.2, threshold: 0.8 }, // 20% increase if usage < 80% of limit
  lowActivity: { factor: 0.8, threshold: 0.3 }, // 20% decrease if usage < 30% of limit
  suspicious: { factor: 0.1, duration: 24 * 3600 }, // 10% limits for suspicious activity
  verified: { factor: 1.5, duration: 30 * 24 * 3600 } // 50% increase for verified users
};

class AdvancedRateLimiter {
  constructor() {
    this.redis = redisService;
  }

  /**
   * Create rate limiting middleware
   */
  createLimiter(type = 'api', options = {}) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const clientId = this.getClientId(req, user);
        const result = await this.checkRateLimit(type, clientId, user, req, options);

        // Add rate limit headers
        this.addRateLimitHeaders(res, result);

        if (result.allowed) {
          // Track successful request
          await this.trackRequest(type, clientId, user, req);
          next();
        } else {
          // Rate limit exceeded
          logger.warn('Rate limit exceeded', {
            type,
            clientId,
            userId: user?._id,
            ip: req.ip,
            remaining: result.remaining,
            resetTime: result.resetTime
          });

          res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            error: {
              type: 'RATE_LIMIT_EXCEEDED',
              limit: result.limit,
              remaining: result.remaining,
              resetTime: result.resetTime,
              retryAfter: result.retryAfter
            }
          });
        }
      } catch (error) {
        logger.error('Rate limiting error:', error);
        // Continue on rate limiting errors to prevent blocking legitimate requests
        next();
      }
    };
  }

  /**
   * Check rate limit for a specific type and client
   */
  async checkRateLimit(type, clientId, user, req, options = {}) {
    const config = this.getRateLimitConfig(type, user, options);
    const key = this.getRateLimitKey(type, clientId);
    const now = Date.now();
    const windowStart = now - (config.window * 1000);

    // Get current request count in window
    const requests = await this.getRequestsInWindow(key, windowStart, now);
    
    // Apply dynamic adjustments
    const adjustedConfig = await this.applyDynamicAdjustments(config, user, requests.length);
    
    // Check bandwidth limits if applicable
    if (config.bandwidth && req.body && req.body.size) {
      const bandwidthUsed = await this.getBandwidthUsage(clientId, windowStart, now);
      if (bandwidthUsed + req.body.size > adjustedConfig.bandwidth) {
        return {
          allowed: false,
          limit: adjustedConfig.bandwidth,
          remaining: Math.max(0, adjustedConfig.bandwidth - bandwidthUsed),
          resetTime: windowStart + (config.window * 1000),
          retryAfter: Math.ceil(config.window / 60)
        };
      }
    }

    // Check request count limits
    const allowed = requests.length < adjustedConfig.requests;
    const remaining = Math.max(0, adjustedConfig.requests - requests.length);
    const resetTime = windowStart + (config.window * 1000);

    return {
      allowed,
      limit: adjustedConfig.requests,
      remaining,
      resetTime,
      retryAfter: allowed ? 0 : Math.ceil((resetTime - now) / 1000 / 60),
      config: adjustedConfig
    };
  }

  /**
   * Get rate limit configuration for user and type
   */
  getRateLimitConfig(type, user, options = {}) {
    const plan = user?.plan || 'free';
    const baseConfig = RATE_LIMIT_CONFIGS[plan]?.[type] || RATE_LIMIT_CONFIGS.free[type];
    
    // Merge with custom options
    return {
      ...baseConfig,
      ...options
    };
  }

  /**
   * Apply dynamic adjustments based on user behavior
   */
  async applyDynamicAdjustments(config, user, currentRequests) {
    if (!user) return config;

    let adjustmentFactor = 1;
    const userId = user._id.toString();

    // Check for new user adjustment
    const userAge = Date.now() - new Date(user.createdAt).getTime();
    if (userAge < DYNAMIC_ADJUSTMENTS.newUser.duration * 1000) {
      adjustmentFactor *= DYNAMIC_ADJUSTMENTS.newUser.factor;
    }

    // Check for verified user boost
    if (user.isEmailVerified && user.plan !== 'free') {
      const verifiedKey = `rate_limit:verified:${userId}`;
      const isVerifiedBoostActive = await this.redis.exists(verifiedKey);
      if (!isVerifiedBoostActive) {
        await this.redis.set(verifiedKey, '1', DYNAMIC_ADJUSTMENTS.verified.duration);
        adjustmentFactor *= DYNAMIC_ADJUSTMENTS.verified.factor;
      }
    }

    // Check for suspicious activity
    const suspiciousKey = `rate_limit:suspicious:${userId}`;
    const isSuspicious = await this.redis.exists(suspiciousKey);
    if (isSuspicious) {
      adjustmentFactor *= DYNAMIC_ADJUSTMENTS.suspicious.factor;
    }

    // Check usage patterns for dynamic adjustment
    const usageRatio = currentRequests / config.requests;
    if (usageRatio < DYNAMIC_ADJUSTMENTS.lowActivity.threshold) {
      adjustmentFactor *= DYNAMIC_ADJUSTMENTS.lowActivity.factor;
    } else if (usageRatio < DYNAMIC_ADJUSTMENTS.highActivity.threshold) {
      adjustmentFactor *= DYNAMIC_ADJUSTMENTS.highActivity.factor;
    }

    return {
      ...config,
      requests: Math.floor(config.requests * adjustmentFactor),
      size: config.size ? Math.floor(config.size * adjustmentFactor) : undefined,
      bandwidth: config.bandwidth ? Math.floor(config.bandwidth * adjustmentFactor) : undefined
    };
  }

  /**
   * Get unique client identifier
   */
  getClientId(req, user) {
    if (user) {
      return `user:${user._id}`;
    }
    
    // For anonymous users, use IP + User-Agent hash
    const identifier = `${req.ip}:${req.get('User-Agent') || 'unknown'}`;
    return `anon:${this.hashString(identifier)}`;
  }

  /**
   * Get rate limit key for Redis
   */
  getRateLimitKey(type, clientId) {
    const window = Math.floor(Date.now() / (3600 * 1000)); // 1-hour windows
    return `rate_limit:${type}:${clientId}:${window}`;
  }

  /**
   * Get requests in current window
   */
  async getRequestsInWindow(key, windowStart, windowEnd) {
    try {
      const requests = await this.redis.get(key) || '[]';
      const requestList = JSON.parse(requests);
      
      // Filter requests within the window
      return requestList.filter(timestamp => 
        timestamp >= windowStart && timestamp <= windowEnd
      );
    } catch (error) {
      logger.error('Error getting requests in window:', error);
      return [];
    }
  }

  /**
   * Track a successful request
   */
  async trackRequest(type, clientId, user, req) {
    const key = this.getRateLimitKey(type, clientId);
    const now = Date.now();
    
    try {
      // Get existing requests
      const existingRequests = await this.redis.get(key) || '[]';
      const requests = JSON.parse(existingRequests);
      
      // Add current request
      requests.push(now);
      
      // Keep only requests within the window (last hour)
      const windowStart = now - (3600 * 1000);
      const filteredRequests = requests.filter(timestamp => timestamp >= windowStart);
      
      // Store updated requests with TTL
      await this.redis.set(key, JSON.stringify(filteredRequests), 3600);
      
      // Track bandwidth usage if applicable
      if (req.body && req.body.size) {
        await this.trackBandwidthUsage(clientId, req.body.size);
      }

      // Track user activity patterns
      if (user) {
        await this.trackUserActivity(user._id, type, now);
      }
    } catch (error) {
      logger.error('Error tracking request:', error);
    }
  }

  /**
   * Track bandwidth usage
   */
  async trackBandwidthUsage(clientId, size) {
    const key = `bandwidth:${clientId}:${Math.floor(Date.now() / (3600 * 1000))}`;
    try {
      await this.redis.incr(key, size);
      await this.redis.expire(key, 3600); // 1 hour TTL
    } catch (error) {
      logger.error('Error tracking bandwidth:', error);
    }
  }

  /**
   * Get bandwidth usage in window
   */
  async getBandwidthUsage(clientId, windowStart, windowEnd) {
    try {
      const keys = [];
      const startHour = Math.floor(windowStart / (3600 * 1000));
      const endHour = Math.floor(windowEnd / (3600 * 1000));
      
      for (let hour = startHour; hour <= endHour; hour++) {
        keys.push(`bandwidth:${clientId}:${hour}`);
      }
      
      let totalBandwidth = 0;
      for (const key of keys) {
        const usage = await this.redis.get(key) || 0;
        totalBandwidth += parseInt(usage);
      }
      
      return totalBandwidth;
    } catch (error) {
      logger.error('Error getting bandwidth usage:', error);
      return 0;
    }
  }

  /**
   * Track user activity patterns
   */
  async trackUserActivity(userId, type, timestamp) {
    const key = `activity:${userId}:${Math.floor(timestamp / (24 * 3600 * 1000))}`;
    try {
      const activity = await this.redis.get(key) || '{}';
      const activityData = JSON.parse(activity);
      
      activityData[type] = (activityData[type] || 0) + 1;
      activityData.lastActivity = timestamp;
      
      await this.redis.set(key, JSON.stringify(activityData), 24 * 3600);
    } catch (error) {
      logger.error('Error tracking user activity:', error);
    }
  }

  /**
   * Flag suspicious activity
   */
  async flagSuspiciousActivity(userId, reason) {
    const key = `rate_limit:suspicious:${userId}`;
    try {
      await this.redis.set(key, reason, DYNAMIC_ADJUSTMENTS.suspicious.duration);
      logger.warn('User flagged for suspicious activity', { userId, reason });
    } catch (error) {
      logger.error('Error flagging suspicious activity:', error);
    }
  }

  /**
   * Add rate limit headers to response
   */
  addRateLimitHeaders(res, result) {
    res.set({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-RetryAfter': result.retryAfter.toString()
    });
  }

  /**
   * Get rate limit status for user
   */
  async getRateLimitStatus(user, type = 'api') {
    const clientId = this.getClientId({ user }, user);
    const config = this.getRateLimitConfig(type, user);
    const key = this.getRateLimitKey(type, clientId);
    const now = Date.now();
    const windowStart = now - (config.window * 1000);

    const requests = await this.getRequestsInWindow(key, windowStart, now);
    const adjustedConfig = await this.applyDynamicAdjustments(config, user, requests.length);

    return {
      type,
      limit: adjustedConfig.requests,
      used: requests.length,
      remaining: Math.max(0, adjustedConfig.requests - requests.length),
      resetTime: windowStart + (config.window * 1000),
      percentage: (requests.length / adjustedConfig.requests) * 100
    };
  }

  /**
   * Hash string for anonymization
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get analytics for rate limiting
   */
  async getAnalytics(period = 'day') {
    try {
      const analytics = {
        totalRequests: 0,
        blockedRequests: 0,
        topUsers: [],
        topIPs: [],
        typeBreakdown: {},
        timestamp: new Date()
      };

      // This would be implemented with proper analytics aggregation
      // For now, return mock data structure

      return analytics;
    } catch (error) {
      logger.error('Error getting rate limit analytics:', error);
      return null;
    }
  }
}

// Create limiter instances for different types
const rateLimiter = new AdvancedRateLimiter();

// Export middleware functions
export const apiRateLimit = rateLimiter.createLimiter('api');
export const uploadRateLimit = rateLimiter.createLimiter('upload');
export const downloadRateLimit = rateLimiter.createLimiter('download');
export const shareRateLimit = rateLimiter.createLimiter('share');

// Export custom limiter creator
export const createCustomRateLimit = (type, options) => {
  return rateLimiter.createLimiter(type, options);
};

// Export utility functions
export const getRateLimitStatus = (user, type) => rateLimiter.getRateLimitStatus(user, type);
export const flagSuspiciousActivity = (userId, reason) => rateLimiter.flagSuspiciousActivity(userId, reason);
export const getRateLimitAnalytics = (period) => rateLimiter.getAnalytics(period);

export default rateLimiter;