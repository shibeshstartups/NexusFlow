import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

class RedisService {
  constructor() {
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize Redis connection with clustering and failover support
   */
  async initialize() {
    try {
      const redisConfig = this.getRedisConfig();
      
      // Create main client
      this.client = this.createRedisClient(redisConfig);
      
      // Create pub/sub clients for real-time features
      this.pubClient = this.createRedisClient(redisConfig);
      this.subClient = this.createRedisClient(redisConfig);
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Redis service initialized successfully', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });
      
    } catch (error) {
      logger.error('Failed to initialize Redis service:', error);
      
      if (process.env.NODE_ENV === 'production') {
        throw error;
      } else {
        // In development, continue without Redis
        logger.warn('Continuing without Redis in development mode');
        this.isConnected = false;
      }
    }
  }

  /**
   * Get Redis configuration from environment
   */
  getRedisConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      family: 4, // IPv4
      keepAlive: 30000,
      connectTimeout: 10000,
      lazyConnect: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      // Connection pool settings
      maxMemoryPolicy: 'allkeys-lru',
      // Clustering support for production
      ...(isProduction && process.env.REDIS_CLUSTER_ENABLED === 'true' && {
        cluster: {
          enabledValidation: false,
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          }
        }
      })
    };
  }

  /**
   * Create Redis client with error handling
   */
  createRedisClient(config) {
    if (process.env.REDIS_CLUSTER_ENABLED === 'true') {
      // Use cluster if configured
      const clusterNodes = process.env.REDIS_CLUSTER_NODES 
        ? process.env.REDIS_CLUSTER_NODES.split(',')
        : [`${config.host}:${config.port}`];
      
      return new Redis.Cluster(clusterNodes, {
        redisOptions: config,
        ...config.cluster
      });
    }
    
    return new Redis(config);
  }

  /**
   * Setup event handlers for connection monitoring
   */
  setupEventHandlers() {
    // Main client events
    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis ready for operations');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms...`);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max Redis reconnection attempts reached');
        this.client.disconnect();
      }
    });

    // Pub/Sub client events
    this.subClient.on('message', (channel, message) => {
      this.handlePubSubMessage(channel, message);
    });

    this.subClient.on('pmessage', (pattern, channel, message) => {
      this.handlePubSubPattern(pattern, channel, message);
    });
  }

  /**
   * Test Redis connection
   */
  async testConnection() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    
    await this.client.ping();
    logger.info('Redis connection test successful');
  }

  /**
   * Cache management methods
   */
  
  /**
   * Set cache with TTL
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      logger.debug('Redis not connected, skipping cache set');
      return false;
    }
    
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cached value
   */
  async get(key) {
    if (!this.isConnected) {
      logger.debug('Redis not connected, skipping cache get');
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }
      
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple cache entries by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }
    
    try {
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.client.del(...keys);
      logger.debug(`Cache pattern deleted: ${pattern} (${result} keys)`);
      return result;
    } catch (error) {
      logger.error(`Cache pattern delete failed for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists check failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key, ttl) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    if (!this.isConnected || keys.length === 0) {
      return [];
    }
    
    try {
      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget failed:', error);
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, ttl = 3600) {
    if (!this.isConnected || Object.keys(keyValuePairs).length === 0) {
      return false;
    }
    
    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        
        if (ttl > 0) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      
      await pipeline.exec();
      logger.debug(`Cache mset: ${Object.keys(keyValuePairs).length} keys`);
      return true;
    } catch (error) {
      logger.error('Cache mset failed:', error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, amount = 1) {
    if (!this.isConnected) {
      return 0;
    }
    
    try {
      const result = amount === 1 
        ? await this.client.incr(key) 
        : await this.client.incrby(key, amount);
      return result;
    } catch (error) {
      logger.error(`Cache incr failed for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Pub/Sub methods
   */
  
  /**
   * Publish message to channel
   */
  async publish(channel, message) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const serializedMessage = JSON.stringify(message);
      await this.pubClient.publish(channel, serializedMessage);
      logger.debug(`Published to channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Publish failed for channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel, callback) {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.subClient.subscribe(channel);
      this.subClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            logger.error('Failed to parse pub/sub message:', error);
          }
        }
      });
      
      logger.debug(`Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Subscribe failed for channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * Handle pub/sub messages
   */
  handlePubSubMessage(channel, message) {
    try {
      const parsedMessage = JSON.parse(message);
      logger.debug(`Received message on channel ${channel}:`, parsedMessage);
      
      // Handle specific channel messages
      switch (channel) {
        case 'cache:invalidate':
          this.handleCacheInvalidation(parsedMessage);
          break;
        case 'file:update':
          this.handleFileUpdate(parsedMessage);
          break;
        case 'project:update':
          this.handleProjectUpdate(parsedMessage);
          break;
        default:
          logger.debug(`Unhandled channel: ${channel}`);
      }
    } catch (error) {
      logger.error('Error handling pub/sub message:', error);
    }
  }

  /**
   * Handle pattern-based pub/sub messages
   */
  handlePubSubPattern(pattern, channel, message) {
    logger.debug(`Pattern message: ${pattern} -> ${channel}`);
    this.handlePubSubMessage(channel, message);
  }

  /**
   * Cache invalidation handler
   */
  async handleCacheInvalidation(data) {
    const { pattern, keys } = data;
    
    if (pattern) {
      await this.delPattern(pattern);
    }
    
    if (keys && Array.isArray(keys)) {
      await Promise.all(keys.map(key => this.del(key)));
    }
  }

  /**
   * File update handler
   */
  async handleFileUpdate(data) {
    const { fileId, projectId, userId } = data;
    
    // Invalidate file-related caches
    await this.delPattern(`file:${fileId}:*`);
    await this.delPattern(`files:project:${projectId}:*`);
    await this.delPattern(`files:user:${userId}:*`);
  }

  /**
   * Project update handler
   */
  async handleProjectUpdate(data) {
    const { projectId, userId } = data;
    
    // Invalidate project-related caches
    await this.delPattern(`project:${projectId}:*`);
    await this.delPattern(`projects:user:${userId}:*`);
  }

  /**
   * Get Redis statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return null;
    }
    
    try {
      const info = await this.client.info();
      const memory = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      return {
        connected: this.isConnected,
        info: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
        stats: this.parseRedisInfo(stats),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      return null;
    }
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return result;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }
      
      logger.info('Redis connections closed gracefully');
    } catch (error) {
      logger.error('Error during Redis shutdown:', error);
    }
  }

  /**
   * Flush all data (use with caution)
   */
  async flushAll() {
    if (!this.isConnected || process.env.NODE_ENV === 'production') {
      return false;
    }
    
    try {
      await this.client.flushall();
      logger.warn('Redis cache flushed (all data cleared)');
      return true;
    } catch (error) {
      logger.error('Failed to flush Redis cache:', error);
      return false;
    }
  }
}

// Singleton instance
const redisService = new RedisService();

export default redisService;