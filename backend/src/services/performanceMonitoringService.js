import * as Sentry from '@sentry/node';
import * as SentryProfiling from '@sentry/profiling-node';
import promClient from 'prom-client';
import { logger } from '../utils/logger.js';

class PerformanceMonitoringService {
  constructor() {
    this.metrics = {};
    this.isInitialized = false;
    this.collectDefaultMetrics = promClient.collectDefaultMetrics;
    this.register = promClient.register;
  }

  /**
   * Initialize performance monitoring with Sentry and Prometheus
   */
  async initialize() {
    try {
      // Initialize Sentry for error tracking and performance monitoring
      await this.initializeSentry();
      
      // Initialize Prometheus metrics
      await this.initializePrometheus();
      
      // Start collecting system metrics
      this.startSystemMetrics();
      
      this.isInitialized = true;
      logger.info('Performance monitoring service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Initialize Sentry for error tracking and APM
   */
  async initializeSentry() {
    const environment = process.env.NODE_ENV || 'development';
    const sentryDsn = process.env.SENTRY_DSN;

    if (!sentryDsn && environment === 'production') {
      logger.warn('Sentry DSN not configured for production environment');
      return;
    }

    Sentry.init({
      dsn: sentryDsn,
      environment,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: null }),
        new Sentry.Integrations.Mongo(),
        new Sentry.Integrations.Apollo(),
        new SentryProfiling.ProfilingIntegration(),
      ],
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      profilesSampleRate: environment === 'production' ? 0.05 : 1.0,
      beforeSend(event) {
        // Filter out non-critical errors in development
        if (environment === 'development' && event.level === 'warning') {
          return null;
        }
        return event;
      },
      beforeSendTransaction(event) {
        // Sample transactions in production to reduce volume
        if (environment === 'production' && Math.random() > 0.1) {
          return null;
        }
        return event;
      }
    });

    logger.info('Sentry performance monitoring initialized');
  }

  /**
   * Initialize Prometheus metrics collection
   */
  async initializePrometheus() {
    // Clear any existing metrics
    this.register.clear();

    // Collect default system metrics
    this.collectDefaultMetrics({
      register: this.register,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    // HTTP request metrics
    this.metrics.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'user_tier'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.metrics.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_tier']
    });

    // File operation metrics
    this.metrics.fileOperationDuration = new promClient.Histogram({
      name: 'file_operation_duration_seconds',
      help: 'Duration of file operations in seconds',
      labelNames: ['operation', 'file_type', 'storage_provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.metrics.fileOperationsTotal = new promClient.Counter({
      name: 'file_operations_total',
      help: 'Total number of file operations',
      labelNames: ['operation', 'file_type', 'storage_provider', 'status']
    });

    this.metrics.fileSize = new promClient.Histogram({
      name: 'file_size_bytes',
      help: 'Size of files processed in bytes',
      labelNames: ['operation', 'file_type'],
      buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824] // 1KB to 1GB
    });

    // Database metrics
    this.metrics.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['collection', 'operation', 'index_used'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
    });

    this.metrics.databaseConnectionsActive = new promClient.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections'
    });

    // Cache metrics
    this.metrics.cacheOperationDuration = new promClient.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
    });

    this.metrics.cacheHitRatio = new promClient.Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio as a percentage',
      labelNames: ['cache_type']
    });

    // Business metrics
    this.metrics.activeUsers = new promClient.Gauge({
      name: 'active_users_total',
      help: 'Number of active users'
    });

    this.metrics.storageUsed = new promClient.Gauge({
      name: 'storage_used_bytes',
      help: 'Total storage used in bytes',
      labelNames: ['user_tier', 'storage_provider']
    });

    this.metrics.backgroundJobsDuration = new promClient.Histogram({
      name: 'background_jobs_duration_seconds',
      help: 'Duration of background jobs in seconds',
      labelNames: ['job_type', 'status'],
      buckets: [1, 5, 10, 30, 60, 300, 600]
    });

    // Rate limiting metrics
    this.metrics.rateLimitHits = new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'user_tier', 'limit_type']
    });

    logger.info('Prometheus metrics initialized');
  }

  /**
   * Start collecting system metrics
   */
  startSystemMetrics() {
    // Update active connections every 30 seconds
    setInterval(async () => {
      try {
        const mongoose = await import('mongoose');
        const connectionState = mongoose.connection.readyState;
        if (connectionState === 1) { // Connected
          this.metrics.databaseConnectionsActive.set(mongoose.connection.db.serverConfig?.connections?.length || 0);
        }
      } catch (error) {
        logger.error('Failed to collect database connection metrics:', error);
      }
    }, 30000);

    // Update cache metrics every 60 seconds
    setInterval(async () => {
      try {
        const redisService = (await import('./redisService.js')).default;
        if (redisService.isConnected) {
          const stats = await redisService.getStats();
          if (stats) {
            // Calculate cache hit ratio from Redis stats
            const hits = stats.stats.keyspace_hits || 0;
            const misses = stats.stats.keyspace_misses || 0;
            const total = hits + misses;
            const hitRatio = total > 0 ? (hits / total) * 100 : 0;
            
            this.metrics.cacheHitRatio.set({ cache_type: 'redis' }, hitRatio);
          }
        }
      } catch (error) {
        logger.error('Failed to collect cache metrics:', error);
      }
    }, 60000);

    logger.info('System metrics collection started');
  }

  /**
   * Middleware to track HTTP request metrics
   */
  getHttpMetricsMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const userTier = req.user?.plan || 'anonymous';

      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        
        this.metrics.httpRequestDuration
          .labels(req.method, route, res.statusCode.toString(), userTier)
          .observe(duration);
        
        this.metrics.httpRequestsTotal
          .labels(req.method, route, res.statusCode.toString(), userTier)
          .inc();
      });

      next();
    };
  }

  /**
   * Track file operation metrics
   */
  trackFileOperation(operation, fileType, storageProvider, duration, status = 'success', fileSize = 0) {
    if (!this.isInitialized) return;

    try {
      this.metrics.fileOperationDuration
        .labels(operation, fileType, storageProvider)
        .observe(duration);

      this.metrics.fileOperationsTotal
        .labels(operation, fileType, storageProvider, status)
        .inc();

      if (fileSize > 0) {
        this.metrics.fileSize
          .labels(operation, fileType)
          .observe(fileSize);
      }
    } catch (error) {
      logger.error('Failed to track file operation metrics:', error);
    }
  }

  /**
   * Track database query metrics
   */
  trackDatabaseQuery(collection, operation, duration, indexUsed = 'unknown') {
    if (!this.isInitialized) return;

    try {
      this.metrics.databaseQueryDuration
        .labels(collection, operation, indexUsed)
        .observe(duration);
    } catch (error) {
      logger.error('Failed to track database query metrics:', error);
    }
  }

  /**
   * Track cache operation metrics
   */
  trackCacheOperation(operation, cacheType, duration) {
    if (!this.isInitialized) return;

    try {
      this.metrics.cacheOperationDuration
        .labels(operation, cacheType)
        .observe(duration);
    } catch (error) {
      logger.error('Failed to track cache operation metrics:', error);
    }
  }

  /**
   * Track background job metrics
   */
  trackBackgroundJob(jobType, duration, status = 'completed') {
    if (!this.isInitialized) return;

    try {
      this.metrics.backgroundJobsDuration
        .labels(jobType, status)
        .observe(duration);
    } catch (error) {
      logger.error('Failed to track background job metrics:', error);
    }
  }

  /**
   * Track rate limit hits
   */
  trackRateLimit(endpoint, userTier, limitType) {
    if (!this.isInitialized) return;

    try {
      this.metrics.rateLimitHits
        .labels(endpoint, userTier, limitType)
        .inc();
    } catch (error) {
      logger.error('Failed to track rate limit metrics:', error);
    }
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(activeUsers, storageByTier) {
    if (!this.isInitialized) return;

    try {
      this.metrics.activeUsers.set(activeUsers);

      Object.entries(storageByTier).forEach(([tier, providers]) => {
        Object.entries(providers).forEach(([provider, size]) => {
          this.metrics.storageUsed.set({ user_tier: tier, storage_provider: provider }, size);
        });
      });
    } catch (error) {
      logger.error('Failed to update business metrics:', error);
    }
  }

  /**
   * Capture custom error with context
   */
  captureError(error, context = {}) {
    try {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'storage-platform');
        scope.setLevel('error');
        
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        
        Sentry.captureException(error);
      });
    } catch (sentryError) {
      logger.error('Failed to capture error in Sentry:', sentryError);
    }
  }

  /**
   * Create performance transaction
   */
  createTransaction(name, operation) {
    try {
      return Sentry.startTransaction({ name, op: operation });
    } catch (error) {
      logger.error('Failed to create Sentry transaction:', error);
      return null;
    }
  }

  /**
   * Get metrics for Prometheus endpoint
   */
  async getMetrics() {
    if (!this.isInitialized) {
      return 'Performance monitoring not initialized';
    }

    try {
      return await this.register.metrics();
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      return 'Error retrieving metrics';
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary() {
    try {
      const metrics = await this.register.getMetricsAsJSON();
      
      // Calculate key performance indicators
      const httpRequestsMetric = metrics.find(m => m.name === 'http_requests_total');
      const httpDurationMetric = metrics.find(m => m.name === 'http_request_duration_seconds');
      const cacheHitRatioMetric = metrics.find(m => m.name === 'cache_hit_ratio');
      
      return {
        timestamp: new Date().toISOString(),
        httpRequests: {
          total: httpRequestsMetric?.values?.reduce((sum, v) => sum + v.value, 0) || 0,
          avgDuration: httpDurationMetric?.values?.find(v => v.metricName.includes('_sum'))?.value || 0
        },
        cache: {
          hitRatio: cacheHitRatioMetric?.values?.[0]?.value || 0
        },
        system: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage()
        }
      };
    } catch (error) {
      logger.error('Failed to get performance summary:', error);
      return null;
    }
  }

  /**
   * Health check for monitoring service
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        sentry: false,
        prometheus: false
      }
    };

    try {
      // Check Sentry
      health.services.sentry = Sentry.getCurrentHub().getClient() !== undefined;
      
      // Check Prometheus
      health.services.prometheus = this.register !== undefined;
      
      if (!health.services.sentry || !health.services.prometheus) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      await Sentry.close(2000);
      this.register.clear();
      logger.info('Performance monitoring service shut down gracefully');
    } catch (error) {
      logger.error('Error during performance monitoring shutdown:', error);
    }
  }
}

// Singleton instance
const performanceMonitoringService = new PerformanceMonitoringService();

export default performanceMonitoringService;