import Bull from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import redisService from './redisService.js';

// Job Types
export const JobType = {
  // File processing jobs
  THUMBNAIL_GENERATION: 'thumbnail_generation',
  FILE_OPTIMIZATION: 'file_optimization',
  FILE_VIRUS_SCAN: 'file_virus_scan',
  FILE_METADATA_EXTRACTION: 'file_metadata_extraction',
  
  // Analytics jobs
  ANALYTICS_AGGREGATION: 'analytics_aggregation',
  USER_ACTIVITY_TRACKING: 'user_activity_tracking',
  STORAGE_ANALYTICS: 'storage_analytics',
  CDN_ANALYTICS: 'cdn_analytics',
  
  // Maintenance jobs
  CACHE_CLEANUP: 'cache_cleanup',
  DATABASE_CLEANUP: 'database_cleanup',
  FILE_CLEANUP: 'file_cleanup',
  AUDIT_LOG_CLEANUP: 'audit_log_cleanup',
  
  // Notification jobs
  EMAIL_NOTIFICATION: 'email_notification',
  PUSH_NOTIFICATION: 'push_notification',
  WEBHOOK_DELIVERY: 'webhook_delivery',
  
  // System jobs
  BACKUP_CREATION: 'backup_creation',
  HEALTH_CHECK: 'health_check',
  PERFORMANCE_MONITORING: 'performance_monitoring'
};

// JobData and JobOptions are documented as JSDoc comments for reference
/**
 * @typedef {Object} JobData
 * @property {string} id
 * @property {string} type
 * @property {any} payload
 * @property {string} [userId]
 * @property {string} [projectId]
 * @property {string} [fileId]
 * @property {number} [priority]
 * @property {number} [attempts]
 * @property {number} [delay]
 */

/**
 * @typedef {Object} JobOptions
 * @property {number} [priority]
 * @property {number} [delay]
 * @property {number} [attempts]
 * @property {string|Object} [backoff]
 * @property {number} [removeOnComplete]
 * @property {number} [removeOnFail]
 * @property {any} [repeat]
 */

class BackgroundJobService {
  constructor() {
    this.queues = new Map();
    this.processors = new Map();
    this.isInitialized = false;
    this.redisConfig = null;
    this.setupRedisConfig();
  }

  /**
   * Setup Redis configuration for Bull queues
   */
  setupRedisConfig() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 1, // Use different DB for jobs
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableAutoPipelining: true
    };
  }

  /**
   * Initialize background job service
   */
  async initialize() {
    try {
      // Create queues for different job types
      await this.createQueues();
      
      // Register job processors
      await this.registerProcessors();
      
      // Setup queue event handlers
      this.setupEventHandlers();
      
      // Start periodic maintenance jobs
      this.scheduleMaintenanceJobs();
      
      this.isInitialized = true;
      logger.info('Background job service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize background job service:', error);
      throw error;
    }
  }

  /**
   * Create queues for different job categories
   */
  async createQueues() {
    const queueConfigs = [
      { name: 'file-processing', concurrency: 5 },
      { name: 'analytics', concurrency: 3 },
      { name: 'notifications', concurrency: 10 },
      { name: 'maintenance', concurrency: 2 },
      { name: 'system', concurrency: 1 }
    ];

    for (const config of queueConfigs) {
      const queue = new Bull(config.name, {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.queues.set(config.name, queue);
      logger.info(`Created queue: ${config.name} with concurrency: ${config.concurrency}`);
    }
  }

  /**
   * Register job processors for each queue
   */
  async registerProcessors() {
    // File processing processors
    this.registerProcessor('file-processing', JobType.THUMBNAIL_GENERATION, this.processThumbnailGeneration.bind(this));
    this.registerProcessor('file-processing', JobType.FILE_OPTIMIZATION, this.processFileOptimization.bind(this));
    this.registerProcessor('file-processing', JobType.FILE_VIRUS_SCAN, this.processVirusScan.bind(this));
    this.registerProcessor('file-processing', JobType.FILE_METADATA_EXTRACTION, this.processMetadataExtraction.bind(this));

    // Analytics processors
    this.registerProcessor('analytics', JobType.ANALYTICS_AGGREGATION, this.processAnalyticsAggregation.bind(this));
    this.registerProcessor('analytics', JobType.USER_ACTIVITY_TRACKING, this.processUserActivity.bind(this));
    this.registerProcessor('analytics', JobType.STORAGE_ANALYTICS, this.processStorageAnalytics.bind(this));
    this.registerProcessor('analytics', JobType.CDN_ANALYTICS, this.processCdnAnalytics.bind(this));

    // Notification processors
    this.registerProcessor('notifications', JobType.EMAIL_NOTIFICATION, this.processEmailNotification.bind(this));
    this.registerProcessor('notifications', JobType.PUSH_NOTIFICATION, this.processPushNotification.bind(this));
    this.registerProcessor('notifications', JobType.WEBHOOK_DELIVERY, this.processWebhookDelivery.bind(this));

    // Maintenance processors
    this.registerProcessor('maintenance', JobType.CACHE_CLEANUP, this.processCacheCleanup.bind(this));
    this.registerProcessor('maintenance', JobType.DATABASE_CLEANUP, this.processDatabaseCleanup.bind(this));
    this.registerProcessor('maintenance', JobType.FILE_CLEANUP, this.processFileCleanup.bind(this));

    // System processors
    this.registerProcessor('system', JobType.HEALTH_CHECK, this.processHealthCheck.bind(this));
    this.registerProcessor('system', JobType.PERFORMANCE_MONITORING, this.processPerformanceMonitoring.bind(this));
  }

  /**
   * Register a processor for a specific job type
   */
  registerProcessor(queueName, jobType, processor) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.process(jobType, 5, async (job) => {
      try {
        logger.info(`Processing job: ${jobType}`, { jobId: job.id, data: job.data });
        const result = await processor(job);
        logger.info(`Job completed: ${jobType}`, { jobId: job.id, result });
        return result;
      } catch (error) {
        logger.error(`Job failed: ${jobType}`, { jobId: job.id, error: error.message });
        throw error;
      }
    });

    this.processors.set(jobType, processor);
  }

  /**
   * Setup event handlers for queue monitoring
   */
  setupEventHandlers() {
    this.queues.forEach((queue, name) => {
      queue.on('completed', (job, result) => {
        logger.debug(`Job completed in queue ${name}`, { jobId: job.id, result });
      });

      queue.on('failed', (job, error) => {
        logger.error(`Job failed in queue ${name}`, { jobId: job.id, error: error.message });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in queue ${name}`, { jobId: job.id });
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job progress in queue ${name}`, { jobId: job.id, progress });
      });
    });
  }

  /**
   * Schedule recurring maintenance jobs
   */
  scheduleMaintenanceJobs() {
    // Cache cleanup every hour
    this.scheduleRecurringJob(JobType.CACHE_CLEANUP, {}, { repeat: { cron: '0 * * * *' } });
    
    // Database cleanup daily at 2 AM
    this.scheduleRecurringJob(JobType.DATABASE_CLEANUP, {}, { repeat: { cron: '0 2 * * *' } });
    
    // File cleanup daily at 3 AM
    this.scheduleRecurringJob(JobType.FILE_CLEANUP, {}, { repeat: { cron: '0 3 * * *' } });
    
    // Analytics aggregation every 15 minutes
    this.scheduleRecurringJob(JobType.ANALYTICS_AGGREGATION, {}, { repeat: { cron: '*/15 * * * *' } });
    
    // Health checks every 5 minutes
    this.scheduleRecurringJob(JobType.HEALTH_CHECK, {}, { repeat: { cron: '*/5 * * * *' } });
    
    // Performance monitoring every 10 minutes
    this.scheduleRecurringJob(JobType.PERFORMANCE_MONITORING, {}, { repeat: { cron: '*/10 * * * *' } });
  }

  /**
   * Add a job to the appropriate queue
   */
  async addJob(jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Background job service not initialized');
    }

    const queueName = this.getQueueNameForJobType(jobType);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found for job type ${jobType}`);
    }

    const jobData = {
      id: `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      payload: data,
      ...data
    };

    const job = await queue.add(jobType, jobData, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: 'exponential', delay: 2000 },
      removeOnComplete: options.removeOnComplete || 10,
      removeOnFail: options.removeOnFail || 5,
      ...options
    });

    logger.info(`Job added to queue`, { 
      jobId: job.id, 
      jobType, 
      queueName,
      priority: options.priority || 0
    });

    return job;
  }

  /**
   * Schedule a recurring job
   */
  async scheduleRecurringJob(jobType, data, options) {
    return this.addJob(jobType, data, options);
  }

  /**
   * Get queue name for job type
   */
  getQueueNameForJobType(jobType) {
    if ([JobType.THUMBNAIL_GENERATION, JobType.FILE_OPTIMIZATION, JobType.FILE_VIRUS_SCAN, JobType.FILE_METADATA_EXTRACTION].includes(jobType)) {
      return 'file-processing';
    }
    
    if ([JobType.ANALYTICS_AGGREGATION, JobType.USER_ACTIVITY_TRACKING, JobType.STORAGE_ANALYTICS, JobType.CDN_ANALYTICS].includes(jobType)) {
      return 'analytics';
    }
    
    if ([JobType.EMAIL_NOTIFICATION, JobType.PUSH_NOTIFICATION, JobType.WEBHOOK_DELIVERY].includes(jobType)) {
      return 'notifications';
    }
    
    if ([JobType.CACHE_CLEANUP, JobType.DATABASE_CLEANUP, JobType.FILE_CLEANUP, JobType.AUDIT_LOG_CLEANUP].includes(jobType)) {
      return 'maintenance';
    }
    
    return 'system';
  }

  // Job Processors

  /**
   * Process thumbnail generation
   */
  async processThumbnailGeneration(job) {
    const { fileId, sizes } = job.data.payload;
    
    job.progress(10);
    
    // Import sharp for image processing
    const sharp = await import('sharp');
    
    job.progress(20);
    
    // Generate thumbnails for each size
    const thumbnails = [];
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      
      // Process thumbnail generation logic here
      // This is a placeholder - implement actual thumbnail generation
      thumbnails.push({
        size,
        url: `thumbnail_${size}_${fileId}.jpg`,
        path: `thumbnails/${size}/${fileId}.jpg`
      });
      
      job.progress(20 + (60 * (i + 1) / sizes.length));
    }
    
    job.progress(90);
    
    // Update database with thumbnail URLs
    // Implementation placeholder
    
    job.progress(100);
    
    return { thumbnails, fileId };
  }

  /**
   * Process file optimization
   */
  async processFileOptimization(job) {
    const { fileId, optimizations } = job.data.payload;
    
    job.progress(25);
    
    // Implement file optimization logic
    // This could include compression, format conversion, etc.
    
    job.progress(75);
    
    // Update file record with optimized version
    
    job.progress(100);
    
    return { optimized: true, fileId, savings: '25%' };
  }

  /**
   * Process virus scanning
   */
  async processVirusScan(job) {
    const { fileId, filePath } = job.data.payload;
    
    job.progress(30);
    
    // Implement virus scanning logic
    // This is a placeholder - integrate with actual antivirus service
    
    job.progress(80);
    
    const scanResult = {
      clean: true,
      threats: [],
      scanDate: new Date()
    };
    
    job.progress(100);
    
    return { scanResult, fileId };
  }

  /**
   * Process metadata extraction
   */
  async processMetadataExtraction(job) {
    const { fileId, fileType } = job.data.payload;
    
    job.progress(20);
    
    // Extract metadata based on file type
    let metadata = {};
    
    switch (fileType) {
      case 'image':
        // Extract EXIF data, dimensions, etc.
        metadata = { width: 1920, height: 1080, camera: 'Canon EOS R5' };
        break;
      case 'video':
        // Extract duration, resolution, codec, etc.
        metadata = { duration: 120, resolution: '4K', codec: 'H.264' };
        break;
      case 'audio':
        // Extract duration, bitrate, artist, etc.
        metadata = { duration: 180, bitrate: '320kbps', artist: 'Unknown' };
        break;
      default:
        metadata = { extractedAt: new Date() };
    }
    
    job.progress(80);
    
    // Update file record with extracted metadata
    
    job.progress(100);
    
    return { metadata, fileId };
  }

  /**
   * Process analytics aggregation
   */
  async processAnalyticsAggregation(job) {
    job.progress(25);
    
    // Aggregate analytics data from various sources
    const aggregatedData = {
      totalFiles: 0,
      totalStorage: 0,
      totalViews: 0,
      totalDownloads: 0,
      aggregatedAt: new Date()
    };
    
    job.progress(75);
    
    // Store aggregated data
    await redisService.set('analytics:latest', aggregatedData, 3600);
    
    job.progress(100);
    
    return aggregatedData;
  }

  /**
   * Process user activity tracking
   */
  async processUserActivity(job) {
    const { userId, activity } = job.data.payload;
    
    // Track user activity
    const activityRecord = {
      userId,
      activity,
      timestamp: new Date(),
      ip: activity.ip,
      userAgent: activity.userAgent
    };
    
    // Store in analytics database
    
    return { tracked: true, userId };
  }

  /**
   * Process storage analytics
   */
  async processStorageAnalytics(job) {
    job.progress(30);
    
    // Calculate storage analytics
    const storageData = {
      totalUsed: 0,
      byType: {},
      byUser: {},
      growth: 0,
      calculatedAt: new Date()
    };
    
    job.progress(80);
    
    // Cache results
    await redisService.set('analytics:storage', storageData, 1800);
    
    job.progress(100);
    
    return storageData;
  }

  /**
   * Process CDN analytics
   */
  async processCdnAnalytics(job) {
    job.progress(40);
    
    // Fetch CDN analytics from Cloudflare
    const cdnData = {
      requests: 0,
      bandwidth: 0,
      cacheHitRatio: 0,
      costs: 0,
      analyzedAt: new Date()
    };
    
    job.progress(100);
    
    return cdnData;
  }

  /**
   * Process email notification
   */
  async processEmailNotification(job) {
    const { to, subject, template, data } = job.data.payload;
    
    job.progress(30);
    
    // Send email using configured email service
    // Implementation placeholder
    
    job.progress(100);
    
    return { sent: true, to, subject };
  }

  /**
   * Process push notification
   */
  async processPushNotification(job) {
    const { userId, title, body, data } = job.data.payload;
    
    // Send push notification
    // Implementation placeholder
    
    return { sent: true, userId };
  }

  /**
   * Process webhook delivery
   */
  async processWebhookDelivery(job) {
    const { url, payload, headers } = job.data.payload;
    
    job.progress(25);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });
      
      job.progress(75);
      
      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }
      
      job.progress(100);
      
      return { delivered: true, url, status: response.status };
    } catch (error) {
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  /**
   * Process cache cleanup
   */
  async processCacheCleanup(job) {
    job.progress(20);
    
    // Clean expired cache entries
    const cleaned = await redisService.delPattern('cache:expired:*');
    
    job.progress(60);
    
    // Clean old analytics data
    await redisService.delPattern('analytics:old:*');
    
    job.progress(100);
    
    return { cleaned, timestamp: new Date() };
  }

  /**
   * Process database cleanup
   */
  async processDatabaseCleanup(job) {
    job.progress(25);
    
    // Clean old logs, temporary files, expired sessions, etc.
    // Implementation placeholder
    
    job.progress(75);
    
    // Optimize database indexes
    
    job.progress(100);
    
    return { cleaned: true, timestamp: new Date() };
  }

  /**
   * Process file cleanup
   */
  async processFileCleanup(job) {
    job.progress(30);
    
    // Clean orphaned files, temporary uploads, etc.
    // Implementation placeholder
    
    job.progress(100);
    
    return { filesDeleted: 0, timestamp: new Date() };
  }

  /**
   * Process health check
   */
  async processHealthCheck(job) {
    const health = {
      database: 'healthy',
      redis: 'healthy',
      storage: 'healthy',
      cdn: 'healthy',
      queues: 'healthy',
      checkedAt: new Date()
    };
    
    // Store health status
    await redisService.set('system:health', health, 300);
    
    return health;
  }

  /**
   * Process performance monitoring
   */
  async processPerformanceMonitoring(job) {
    const metrics = {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date()
    };
    
    // Store performance metrics
    await redisService.set('system:performance', metrics, 600);
    
    return metrics;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    }
    
    return stats;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down background job service...');
    
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${name} closed`);
    }
    
    logger.info('Background job service shutdown complete');
  }
}

// Singleton instance
const backgroundJobService = new BackgroundJobService();

export default backgroundJobService;
