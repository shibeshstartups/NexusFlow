import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger.js';

class S3Config {
  constructor() {
    this.client = null;
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Initialize S3 client with configuration
   */
  initialize() {
    try {
      // Validate required environment variables for Cloudflare R2
      const requiredVars = [
        'CLOUDFLARE_R2_ACCESS_KEY_ID',
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        'CLOUDFLARE_R2_ACCOUNT_ID',
        'CLOUDFLARE_R2_BUCKET_NAME'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required Cloudflare R2 environment variables: ${missingVars.join(', ')}`);
      }

      // Cloudflare R2 configuration
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      const region = process.env.CLOUDFLARE_R2_REGION || 'auto'; // R2 uses 'auto' region
      
      this.config = {
        region: region,
        bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        // Cloudflare R2 S3-compatible endpoint
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: false, // R2 supports virtual-hosted-style requests
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
        // Advanced configuration
        maxRetries: parseInt(process.env.CLOUDFLARE_R2_MAX_RETRIES) || 3,
        retryDelayOptions: {
          customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 100; // Exponential backoff
          }
        },
        // R2-specific settings
        signatureVersion: 'v4',
        s3ForcePathStyle: false,
        // CDN configuration
        cdn: {
          enabled: process.env.CLOUDFLARE_CDN_ENABLED === 'true',
          customDomain: process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN,
          devSubdomain: process.env.CLOUDFLARE_R2_DEV_SUBDOMAIN,
          zoneId: process.env.CLOUDFLARE_ZONE_ID,
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
          // Cache settings
          defaultCacheTtl: parseInt(process.env.CLOUDFLARE_CDN_CACHE_TTL) || 86400, // 24 hours
          imageCacheTtl: parseInt(process.env.CLOUDFLARE_CDN_IMAGE_CACHE_TTL) || 604800, // 7 days
          videoCacheTtl: parseInt(process.env.CLOUDFLARE_CDN_VIDEO_CACHE_TTL) || 2592000, // 30 days
          // Performance optimizations
          enableBrotli: process.env.CLOUDFLARE_CDN_BROTLI !== 'false',
          enableMinify: process.env.CLOUDFLARE_CDN_MINIFY === 'true',
          enablePolish: process.env.CLOUDFLARE_CDN_POLISH === 'true',
          // Security
          enableHotlinkProtection: process.env.CLOUDFLARE_CDN_HOTLINK_PROTECTION === 'true'
        }
      };

      // Create S3 client
      this.client = new S3Client(this.config);
      
      this.isInitialized = true;
      logger.info('Cloudflare R2 client initialized successfully', {
        region: this.config.region,
        bucket: this.config.bucket,
        endpoint: this.config.endpoint,
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
        cdnEnabled: this.config.cdn.enabled,
        customDomain: this.config.cdn.customDomain
      });

    } catch (error) {
      logger.error('Failed to initialize Cloudflare R2 client:', error);
      throw error;
    }
  }

  /**
   * Get R2 client instance
   */
  getClient() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.client;
  }

  /**
   * Get R2 configuration
   */
  getConfig() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config;
  }

  /**
   * Get bucket name
   */
  getBucket() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.bucket;
  }

  /**
   * Generate S3 key for file storage
   */
  generateFileKey(userId, projectId, filename) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    // Organize files in a hierarchical structure
    return `users/${userId}/projects/${projectId}/files/${timestamp}-${randomSuffix}-${filename}`;
  }

  /**
   * Generate S3 key for thumbnails
   */
  generateThumbnailKey(userId, projectId, filename, size = 'medium') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const nameWithoutExt = filename.split('.')[0];
    
    return `users/${userId}/projects/${projectId}/thumbnails/${size}/${timestamp}-${randomSuffix}-${nameWithoutExt}.jpg`;
  }

  /**
   * Generate S3 key for temp files during processing
   */
  generateTempKey(userId, filename) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `temp/${userId}/${timestamp}-${randomSuffix}-${filename}`;
  }

  /**
   * Get optimized URL for file access (CDN vs direct R2)
   */
  getOptimizedUrl(key, options = {}) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const {
      useCdn = true,
      fileType = 'other',
      isPublic = false,
      transformations = null
    } = options;

    // Use CDN for public files when enabled
    if (useCdn && this.config.cdn.enabled && isPublic) {
      return this.getCdnUrl(key, { fileType, transformations });
    }

    // Fallback to direct R2 URL
    return this.getDirectUrl(key);
  }

  /**
   * Get CDN URL with optimizations
   */
  getCdnUrl(key, options = {}) {
    const { fileType = 'other', transformations = null } = options;
    
    // Use custom domain if configured
    if (this.config.cdn.customDomain) {
      let url = `https://${this.config.cdn.customDomain}/${key}`;
      
      // Add Cloudflare transformations for images
      if (fileType === 'image' && transformations) {
        url += this.buildTransformationQuery(transformations);
      }
      
      return url;
    }

    // Use R2 dev subdomain if available
    if (this.config.cdn.devSubdomain) {
      let url = `https://${this.config.cdn.devSubdomain}.r2.dev/${key}`;
      
      if (fileType === 'image' && transformations) {
        url += this.buildTransformationQuery(transformations);
      }
      
      return url;
    }

    // Fallback to direct R2 URL
    return this.getDirectUrl(key);
  }

  /**
   * Get direct R2 URL (bypass CDN)
   */
  getDirectUrl(key) {
    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }

  /**
   * Build Cloudflare image transformation query string
   */
  buildTransformationQuery(transformations) {
    const params = [];
    
    if (transformations.width) params.push(`w=${transformations.width}`);
    if (transformations.height) params.push(`h=${transformations.height}`);
    if (transformations.quality) params.push(`q=${transformations.quality}`);
    if (transformations.format) params.push(`f=${transformations.format}`);
    if (transformations.fit) params.push(`fit=${transformations.fit}`);
    if (transformations.blur) params.push(`blur=${transformations.blur}`);
    
    return params.length > 0 ? `?${params.join('&')}` : '';
  }

  /**
   * Validate R2 connection and permissions
   */
  async validateConnection() {
    try {
      const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadBucketCommand({ Bucket: this.getBucket() });
      
      await this.getClient().send(command);
      logger.info('Cloudflare R2 connection validated successfully');
      return true;
    } catch (error) {
      logger.error('Cloudflare R2 connection validation failed:', error);
      throw new Error(`Cloudflare R2 connection failed: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId) {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const prefix = `users/${userId}/`;
      
      const command = new ListObjectsV2Command({
        Bucket: this.getBucket(),
        Prefix: prefix
      });

      const response = await this.getClient().send(command);
      
      let totalSize = 0;
      let fileCount = 0;

      if (response.Contents) {
        fileCount = response.Contents.length;
        totalSize = response.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      }

      return {
        fileCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize)
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get public URL for R2 object (backward compatibility)
   */
  getPublicUrl(key, options = {}) {
    return this.getOptimizedUrl(key, { ...options, isPublic: true });
  }

  /**
   * Get cache TTL based on file type
   */
  getCacheTtl(fileType) {
    if (!this.isInitialized) {
      this.initialize();
    }

    switch (fileType) {
      case 'image':
        return this.config.cdn.imageCacheTtl;
      case 'video':
      case 'audio':
        return this.config.cdn.videoCacheTtl;
      default:
        return this.config.cdn.defaultCacheTtl;
    }
  }

  /**
   * Get cache control header for file type
   */
  getCacheControlHeader(fileType, isPublic = false) {
    const ttl = this.getCacheTtl(fileType);
    const visibility = isPublic ? 'public' : 'private';
    
    return `${visibility}, max-age=${ttl}, s-maxage=${ttl}`;
  }

  /**
   * Get CDN configuration
   */
  getCdnConfig() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.cdn;
  }

  /**
   * Check if CDN is enabled
   */
  isCdnEnabled() {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.config.cdn.enabled;
  }
}

// Singleton instance
const s3Config = new S3Config();

export default s3Config;