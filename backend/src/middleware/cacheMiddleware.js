import redisService from '../services/redisService.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, customPrefix = null) => {
  const { method, originalUrl, user } = req;
  const userId = user ? user._id.toString() : 'anonymous';
  const queryString = Object.keys(req.query).length ? JSON.stringify(req.query) : '';
  const bodyString = req.method === 'POST' && req.body ? JSON.stringify(req.body) : '';
  
  // Create hash for long URLs/queries
  const contentHash = crypto
    .createHash('md5')
    .update(`${originalUrl}${queryString}${bodyString}`)
    .digest('hex')
    .substring(0, 12);
  
  const prefix = customPrefix || method.toLowerCase();
  return `${prefix}:${userId}:${contentHash}`;
};

/**
 * Extract cache configuration from route or request
 */
const getCacheConfig = (req, defaultTTL = 300) => {
  // Check for cache configuration in route metadata
  const routeCache = req.route?.cache;
  
  if (routeCache === false) {
    return { enabled: false };
  }
  
  // Default cache configuration
  let config = {
    enabled: true,
    ttl: defaultTTL,
    varyBy: ['user', 'query'],
    invalidateOn: []
  };
  
  // Override with route-specific config
  if (typeof routeCache === 'object') {
    config = { ...config, ...routeCache };
  }
  
  // Dynamic TTL based on data type
  if (req.originalUrl.includes('/files')) {
    config.ttl = 600; // 10 minutes for file listings
  } else if (req.originalUrl.includes('/projects')) {
    config.ttl = 900; // 15 minutes for project data
  } else if (req.originalUrl.includes('/analytics')) {
    config.ttl = 1800; // 30 minutes for analytics
  } else if (req.originalUrl.includes('/stats')) {
    config.ttl = 3600; // 1 hour for statistics
  }
  
  return config;
};

/**
 * Main caching middleware
 */
export const cacheMiddleware = (options = {}) => {
  const {
    defaultTTL = 300,
    skipCacheCondition = null,
    keyGenerator = generateCacheKey,
    onCacheHit = null,
    onCacheMiss = null
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET' && req.method !== 'POST') {
      return next();
    }
    
    // Skip if custom condition is met
    if (skipCacheCondition && skipCacheCondition(req)) {
      return next();
    }
    
    // Get cache configuration
    const cacheConfig = getCacheConfig(req, defaultTTL);
    
    if (!cacheConfig.enabled) {
      return next();
    }
    
    try {
      // Generate cache key
      const cacheKey = keyGenerator(req, options.prefix);
      
      // Try to get cached response
      const cachedResponse = await redisService.get(cacheKey);
      
      if (cachedResponse) {
        // Cache hit
        logger.debug(`Cache hit: ${cacheKey}`);
        
        if (onCacheHit) {
          onCacheHit(req, cacheKey, cachedResponse);
        }
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${cacheConfig.ttl}`
        });
        
        return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
      }
      
      // Cache miss - continue to route handler
      logger.debug(`Cache miss: ${cacheKey}`);
      
      if (onCacheMiss) {
        onCacheMiss(req, cacheKey);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseData = {
            statusCode: res.statusCode,
            data: data
          };
          
          // Cache the response asynchronously
          redisService.set(cacheKey, responseData, cacheConfig.ttl)
            .then(() => {
              logger.debug(`Response cached: ${cacheKey} (TTL: ${cacheConfig.ttl}s)`);
            })
            .catch(error => {
              logger.error(`Failed to cache response: ${cacheKey}`, error);
            });
        }
        
        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${cacheConfig.ttl}`
        });
        
        return originalJson(data);
      };
      
      next();
      
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Conditional caching middleware for specific routes
 */
export const conditionalCache = (condition, cacheOptions = {}) => {
  return (req, res, next) => {
    if (condition(req)) {
      return cacheMiddleware(cacheOptions)(req, res, next);
    }
    next();
  };
};

/**
 * Cache invalidation middleware
 */
export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      // Invalidate cache after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user ? req.user._id.toString() : 'anonymous';
          
          for (const pattern of patterns) {
            let resolvedPattern = pattern;
            
            // Replace placeholders in pattern
            resolvedPattern = resolvedPattern.replace(':userId', userId);
            
            if (req.params.id) {
              resolvedPattern = resolvedPattern.replace(':id', req.params.id);
            }
            if (req.params.projectId) {
              resolvedPattern = resolvedPattern.replace(':projectId', req.params.projectId);
            }
            if (req.params.fileId) {
              resolvedPattern = resolvedPattern.replace(':fileId', req.params.fileId);
            }
            
            await redisService.delPattern(resolvedPattern);
            logger.debug(`Cache invalidated: ${resolvedPattern}`);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Specific cache middleware for file operations
 */
export const fileCacheMiddleware = cacheMiddleware({
  prefix: 'files',
  defaultTTL: 600, // 10 minutes
  skipCacheCondition: (req) => {
    // Skip caching for uploads and sensitive operations
    return req.path.includes('/upload') || 
           req.path.includes('/share') ||
           req.method === 'DELETE';
  },
  onCacheHit: (req, key, data) => {
    logger.info(`File cache hit: ${req.originalUrl}`);
  }
});

/**
 * Specific cache middleware for project operations
 */
export const projectCacheMiddleware = cacheMiddleware({
  prefix: 'projects',
  defaultTTL: 900, // 15 minutes
  skipCacheCondition: (req) => {
    return req.method !== 'GET';
  }
});

/**
 * Analytics and statistics cache middleware
 */
export const analyticsCacheMiddleware = cacheMiddleware({
  prefix: 'analytics',
  defaultTTL: 1800, // 30 minutes
  keyGenerator: (req) => {
    const userId = req.user ? req.user._id.toString() : 'anonymous';
    const period = req.query.period || 'day';
    const type = req.query.type || 'all';
    return `analytics:${userId}:${period}:${type}`;
  }
});

/**
 * CDN cache middleware for public content
 */
export const cdnCacheMiddleware = cacheMiddleware({
  prefix: 'cdn',
  defaultTTL: 3600, // 1 hour
  skipCacheCondition: (req) => {
    // Only cache public, non-sensitive CDN operations
    return !req.path.includes('/public') && !req.path.includes('/optimize');
  }
});

/**
 * Cache warming utility
 */
export const warmCache = async (routes = []) => {
  logger.info('Starting cache warming...');
  
  for (const route of routes) {
    try {
      const { url, method = 'GET', headers = {}, data = null } = route;
      
      // Simulate request for cache warming
      const mockReq = {
        method,
        originalUrl: url,
        query: {},
        user: route.user || null,
        body: data
      };
      
      const cacheKey = generateCacheKey(mockReq);
      const exists = await redisService.exists(cacheKey);
      
      if (!exists && route.dataProvider) {
        const responseData = await route.dataProvider();
        await redisService.set(cacheKey, {
          statusCode: 200,
          data: responseData
        }, route.ttl || 600);
        
        logger.debug(`Cache warmed: ${cacheKey}`);
      }
    } catch (error) {
      logger.error(`Cache warming failed for route ${route.url}:`, error);
    }
  }
  
  logger.info('Cache warming completed');
};

/**
 * Cache statistics middleware
 */
export const cacheStatsMiddleware = () => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original methods
    const originalJson = res.json.bind(res);
    let cacheStatus = 'MISS';
    
    // Override res.json to capture cache status
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      cacheStatus = res.get('X-Cache') || 'MISS';
      
      // Log cache statistics
      logger.debug('Cache stats:', {
        url: req.originalUrl,
        method: req.method,
        cacheStatus,
        responseTime,
        timestamp: new Date().toISOString()
      });
      
      // Increment cache metrics
      redisService.incr(`cache:stats:${cacheStatus.toLowerCase()}`);
      redisService.incr(`cache:stats:total`);
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Get cache performance metrics
 */
export const getCacheMetrics = async () => {
  try {
    const [hits, misses, total] = await Promise.all([
      redisService.get('cache:stats:hit') || 0,
      redisService.get('cache:stats:miss') || 0,
      redisService.get('cache:stats:total') || 0
    ]);
    
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : 0;
    
    return {
      hits: parseInt(hits),
      misses: parseInt(misses), 
      total: parseInt(total),
      hitRate: parseFloat(hitRate),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get cache metrics:', error);
    return null;
  }
};

export default {
  cacheMiddleware,
  conditionalCache,
  invalidateCache,
  fileCacheMiddleware,
  projectCacheMiddleware,
  analyticsCacheMiddleware,
  cdnCacheMiddleware,
  warmCache,
  cacheStatsMiddleware,
  getCacheMetrics
};