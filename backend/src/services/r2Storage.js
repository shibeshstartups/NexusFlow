import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import s3Config from '../config/s3.js';
import cloudflareCdnService from './cloudflareCdn.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';

class R2StorageService {
  constructor() {
    this.client = null;
    this.bucket = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    this.client = s3Config.getClient();
    this.bucket = s3Config.getBucket();
    
    // Validate connection
    await s3Config.validateConnection();
    logger.info('Cloudflare R2 Storage Service initialized successfully');
  }

  /**
   * Upload file to Cloudflare R2 with CDN optimization
   */
  async uploadFile(fileBuffer, key, options = {}) {
    try {
      const {
        contentType = 'application/octet-stream',
        metadata = {},
        tags = {},
        contentDisposition,
        contentEncoding,
        isPublic = false,
        fileType = 'other'
      } = options;

      // Get optimized cache control header
      const cacheControl = s3Config.getCacheControlHeader(fileType, isPublic);

      // For large files, use multipart upload
      if (fileBuffer.length > 100 * 1024 * 1024) { // 100MB
        return await this.uploadLargeFile(fileBuffer, key, options);
      }

      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          fileType,
          isPublic: isPublic.toString(),
          uploadedAt: new Date().toISOString()
        },
        CacheControl: cacheControl
      };

      // Add optional parameters
      if (contentDisposition) uploadParams.ContentDisposition = contentDisposition;
      if (contentEncoding) uploadParams.ContentEncoding = contentEncoding;
      if (Object.keys(tags).length > 0) uploadParams.Tagging = this.formatTags(tags);

      const command = new PutObjectCommand(uploadParams);
      const result = await this.client.send(command);
      
      // Generate optimized URL (CDN if public, direct if private)
      const optimizedUrl = s3Config.getOptimizedUrl(key, {
        useCdn: isPublic,
        fileType,
        isPublic
      });
      
      logger.info('File uploaded to R2 successfully', {
        key,
        size: fileBuffer.length,
        etag: result.ETag,
        isPublic,
        useCdn: isPublic && s3Config.isCdnEnabled(),
        cacheControl
      });

      return {
        success: true,
        key,
        etag: result.ETag,
        location: optimizedUrl,
        directUrl: s3Config.getDirectUrl(key),
        cdnUrl: isPublic ? s3Config.getCdnUrl(key, { fileType }) : null,
        size: fileBuffer.length,
        cacheControl
      };

    } catch (error) {
      logger.error('R2 upload failed:', error);
      throw new Error(`R2 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload large file using multipart upload with CDN optimization
   */
  async uploadLargeFile(fileBuffer, key, options = {}) {
    try {
      const {
        contentType = 'application/octet-stream',
        metadata = {},
        tags = {},
        contentDisposition,
        contentEncoding,
        isPublic = false,
        fileType = 'other'
      } = options;

      // Get optimized cache control header
      const cacheControl = s3Config.getCacheControlHeader(fileType, isPublic);

      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          fileType,
          isPublic: isPublic.toString(),
          uploadedAt: new Date().toISOString()
        },
        CacheControl: cacheControl
      };

      // Add optional parameters
      if (contentDisposition) uploadParams.ContentDisposition = contentDisposition;
      if (contentEncoding) uploadParams.ContentEncoding = contentEncoding;
      if (Object.keys(tags).length > 0) uploadParams.Tagging = this.formatTags(tags);

      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        // Configure multipart upload for R2
        partSize: 100 * 1024 * 1024, // 100MB per part (R2 recommended)
        leavePartsOnError: false
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        logger.info(`R2 Upload progress: ${percentage}%`, {
          key,
          loaded: progress.loaded,
          total: progress.total
        });
      });

      const result = await upload.done();
      
      // Generate optimized URL
      const optimizedUrl = s3Config.getOptimizedUrl(key, {
        useCdn: isPublic,
        fileType,
        isPublic
      });
      
      logger.info('Large file uploaded to R2 successfully', {
        key,
        size: fileBuffer.length,
        etag: result.ETag,
        isPublic,
        useCdn: isPublic && s3Config.isCdnEnabled()
      });

      return {
        success: true,
        key,
        etag: result.ETag,
        location: optimizedUrl,
        directUrl: s3Config.getDirectUrl(key),
        cdnUrl: isPublic ? s3Config.getCdnUrl(key, { fileType }) : null,
        size: fileBuffer.length,
        cacheControl
      };

    } catch (error) {
      logger.error('R2 large file upload failed:', error);
      throw new Error(`R2 large file upload failed: ${error.message}`);
    }
  }

  /**
   * Download file from R2
   */
  async downloadFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info('File downloaded from R2 successfully', {
        key,
        size: buffer.length,
        contentType: response.ContentType
      });

      return {
        buffer,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
        cacheControl: response.CacheControl
      };

    } catch (error) {
      logger.error('R2 download failed:', error);
      throw new Error(`R2 download failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata without downloading
   */
  async getFileMetadata(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);

      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
        cacheControl: response.CacheControl
      };

    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      logger.error('Failed to get R2 file metadata:', error);
      throw new Error(`Failed to get R2 file metadata: ${error.message}`);
    }
  }

  /**
   * Delete file from R2 and purge from CDN
   */
  async deleteFile(key, options = {}) {
    try {
      const { fileType = 'other', purgeCdn = true } = options;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      
      // Purge from CDN if enabled
      if (purgeCdn && s3Config.isCdnEnabled()) {
        try {
          await cloudflareCdnService.purgeFileKeys([key], [fileType]);
          logger.info('File purged from CDN successfully', { key });
        } catch (cdnError) {
          logger.warn('CDN purge failed, but file deleted from R2', {
            key,
            error: cdnError.message
          });
        }
      }
      
      logger.info('File deleted from R2 successfully', { key });
      
      return { success: true, key, cdnPurged: purgeCdn && s3Config.isCdnEnabled() };

    } catch (error) {
      logger.error('R2 delete failed:', error);
      throw new Error(`R2 delete failed: ${error.message}`);
    }
  }

  /**
   * Copy file within R2
   */
  async copyFile(sourceKey, destinationKey, options = {}) {
    try {
      const {
        metadata = {},
        tags = {}
      } = options;

      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        Metadata: metadata,
        MetadataDirective: Object.keys(metadata).length > 0 ? 'REPLACE' : 'COPY',
        TaggingDirective: Object.keys(tags).length > 0 ? 'REPLACE' : 'COPY',
        Tagging: this.formatTags(tags)
      });

      const result = await this.client.send(command);
      
      logger.info('File copied in R2 successfully', {
        sourceKey,
        destinationKey,
        etag: result.CopyObjectResult.ETag
      });

      return {
        success: true,
        sourceKey,
        destinationKey,
        etag: result.CopyObjectResult.ETag
      };

    } catch (error) {
      logger.error('R2 copy failed:', error);
      throw new Error(`R2 copy failed: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for secure file access
   */
  async generatePresignedUrl(key, operation = 'getObject', expiresIn = 3600, options = {}) {
    try {
      let command;

      switch (operation) {
        case 'getObject':
          command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ...options
          });
          break;
        
        case 'putObject':
          command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ...options
          });
          break;
        
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const url = await getSignedUrl(this.client, command, { 
        expiresIn,
        signableHeaders: new Set(['host'])
      });

      logger.info('R2 presigned URL generated successfully', {
        key,
        operation,
        expiresIn
      });

      return {
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        key,
        operation
      };

    } catch (error) {
      logger.error('Failed to generate R2 presigned URL:', error);
      throw new Error(`Failed to generate R2 presigned URL: ${error.message}`);
    }
  }

  /**
   * List files with prefix
   */
  async listFiles(prefix = '', maxKeys = 1000, continuationToken = null) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken
      });

      const response = await this.client.send(command);

      const files = (response.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      }));

      return {
        files,
        isTruncated: response.IsTruncated,
        nextContinuationToken: response.NextContinuationToken,
        keyCount: response.KeyCount
      };

    } catch (error) {
      logger.error('Failed to list R2 files:', error);
      throw new Error(`Failed to list R2 files: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from R2 and purge from CDN
   */
  async deleteMultipleFiles(keys, options = {}) {
    try {
      const { fileTypes = [], purgeCdn = true } = options;
      
      const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
      
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false
        }
      });

      const result = await this.client.send(command);
      
      // Purge from CDN if enabled
      if (purgeCdn && s3Config.isCdnEnabled() && keys.length > 0) {
        try {
          await cloudflareCdnService.purgeFileKeys(keys, fileTypes);
          logger.info('Multiple files purged from CDN successfully', {
            count: keys.length
          });
        } catch (cdnError) {
          logger.warn('CDN purge failed for multiple files, but files deleted from R2', {
            count: keys.length,
            error: cdnError.message
          });
        }
      }
      
      logger.info('Multiple files deleted from R2 successfully', {
        deletedCount: result.Deleted?.length || 0,
        errorCount: result.Errors?.length || 0
      });

      return {
        success: true,
        deleted: result.Deleted || [],
        errors: result.Errors || [],
        cdnPurged: purgeCdn && s3Config.isCdnEnabled()
      };

    } catch (error) {
      logger.error('R2 bulk delete failed:', error);
      throw new Error(`R2 bulk delete failed: ${error.message}`);
    }
  }

  /**
   * Get storage statistics for user
   */
  async getUserStorageStats(userId) {
    try {
      const prefix = `users/${userId}/`;
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {
          images: 0,
          videos: 0,
          documents: 0,
          others: 0
        }
      };

      let continuationToken = null;
      
      do {
        const result = await this.listFiles(prefix, 1000, continuationToken);
        
        result.files.forEach(file => {
          stats.totalFiles++;
          stats.totalSize += file.size;
          
          // Categorize by file extension
          const ext = path.extname(file.key).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            stats.filesByType.images++;
          } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
            stats.filesByType.videos++;
          } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
            stats.filesByType.documents++;
          } else {
            stats.filesByType.others++;
          }
        });

        continuationToken = result.nextContinuationToken;
      } while (continuationToken);

      return {
        ...stats,
        totalSizeFormatted: this.formatBytes(stats.totalSize)
      };

    } catch (error) {
      logger.error('Failed to get user storage stats:', error);
      throw error;
    }
  }

  /**
   * Format tags for R2
   */
  formatTags(tags) {
    if (!tags || Object.keys(tags).length === 0) return '';
    
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Generate unique filename with timestamp
   */
  generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const nameWithoutExt = path.basename(originalFilename, extension);
    
    return `${timestamp}-${randomString}-${nameWithoutExt}${extension}`;
  }

  /**
   * Validate file type and size
   */
  validateFile(file, maxSize = 5 * 1024 * 1024 * 1024) { // 5GB default
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Archives
      'application/zip', 'application/x-rar-compressed',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit of ${this.formatBytes(maxSize)}`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not supported`);
    }

    return true;
  }

  /**
   * Get CDN performance analytics
   */
  async getCdnAnalytics(since = '2024-01-01') {
    try {
      if (!s3Config.isCdnEnabled()) {
        return {
          enabled: false,
          message: 'CDN not enabled'
        };
      }

      const analytics = await cloudflareCdnService.getCacheAnalytics(since);
      const recommendations = await cloudflareCdnService.getOptimizationRecommendations();

      return {
        enabled: true,
        analytics,
        recommendations,
        period: `Since ${since}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get CDN analytics:', error);
      throw error;
    }
  }

  /**
   * Optimize file URLs for CDN delivery
   */
  getOptimizedFileUrl(key, options = {}) {
    const {
      fileType = 'other',
      isPublic = false,
      transformations = null,
      preferCdn = true
    } = options;

    return s3Config.getOptimizedUrl(key, {
      useCdn: preferCdn && isPublic,
      fileType,
      isPublic,
      transformations
    });
  }

  /**
   * Generate responsive image URLs with CDN transformations
   */
  generateResponsiveImageUrls(key, fileType = 'image') {
    if (!s3Config.isCdnEnabled()) {
      return {
        enabled: false,
        original: s3Config.getDirectUrl(key)
      };
    }

    const sizes = [
      { name: 'thumbnail', width: 150, height: 150, quality: 85 },
      { name: 'small', width: 300, quality: 90 },
      { name: 'medium', width: 600, quality: 85 },
      { name: 'large', width: 1200, quality: 80 },
      { name: 'xlarge', width: 1920, quality: 75 }
    ];

    const urls = {
      enabled: true,
      original: s3Config.getCdnUrl(key, { fileType })
    };

    sizes.forEach(size => {
      urls[size.name] = s3Config.getCdnUrl(key, {
        fileType,
        transformations: {
          width: size.width,
          height: size.height,
          quality: size.quality,
          format: 'webp' // Modern format for better compression
        }
      });
    });

    return urls;
  }

  /**
   * Purge CDN cache for specific files
   */
  async purgeCdnCache(keys, fileTypes = []) {
    try {
      if (!s3Config.isCdnEnabled()) {
        return {
          enabled: false,
          message: 'CDN not enabled'
        };
      }

      const result = await cloudflareCdnService.purgeFileKeys(keys, fileTypes);
      
      logger.info('CDN cache purged successfully', {
        keys: keys.length,
        fileTypes
      });

      return {
        enabled: true,
        ...result
      };

    } catch (error) {
      logger.error('CDN cache purge failed:', error);
      throw error;
    }
  }

  /**
   * Get bandwidth optimization recommendations
   */
  async getBandwidthOptimization() {
    try {
      const stats = await this.getUserStorageStats();
      const cdnAnalytics = await this.getCdnAnalytics();
      
      const recommendations = [];

      // File type optimization
      if (stats.filesByType.images > 0) {
        recommendations.push({
          type: 'image_optimization',
          priority: 'high',
          message: `${stats.filesByType.images} images could benefit from CDN transformations`,
          action: 'Enable automatic WebP conversion and responsive sizing',
          estimatedSavings: '30-70% bandwidth reduction'
        });
      }

      if (stats.filesByType.videos > 0) {
        recommendations.push({
          type: 'video_optimization',
          priority: 'medium',
          message: `${stats.filesByType.videos} videos could benefit from adaptive streaming`,
          action: 'Consider video compression and CDN edge caching',
          estimatedSavings: '20-50% bandwidth reduction'
        });
      }

      // CDN caching optimization
      if (cdnAnalytics.enabled && cdnAnalytics.analytics.cacheHitRatio < 80) {
        recommendations.push({
          type: 'cache_optimization',
          priority: 'high',
          message: 'Cache hit ratio can be improved',
          action: 'Extend cache TTL for static assets',
          estimatedSavings: `${(80 - cdnAnalytics.analytics.cacheHitRatio).toFixed(1)}% additional cache hits`
        });
      }

      return {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSizeFormatted,
        cdnEnabled: s3Config.isCdnEnabled(),
        recommendations,
        currentOptimization: cdnAnalytics.enabled ? {
          cacheHitRatio: cdnAnalytics.analytics.cacheHitRatio,
          bandwidthSaved: cdnAnalytics.recommendations.summary?.bandwidthSavings || '0 Bytes'
        } : null
      };

    } catch (error) {
      logger.error('Failed to get bandwidth optimization:', error);
      throw error;
    }
  }

  /**
   * Download file as stream from R2 (for ZIP creation)
   */
  async downloadFileStream(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);
      
      logger.debug('File stream downloaded from R2 successfully', {
        key,
        contentType: response.ContentType
      });

      return response.Body;

    } catch (error) {
      logger.error('R2 stream download failed:', error);
      throw new Error(`R2 stream download failed: ${error.message}`);
    }
  }

  /**
   * Setup CDN optimization for new uploads
   */
  async setupCdnOptimization() {
    try {
      if (!s3Config.isCdnEnabled()) {
        return {
          enabled: false,
          message: 'CDN not enabled in configuration'
        };
      }

      // Update Cloudflare cache rules for optimal performance
      const cacheRules = await cloudflareCdnService.updateCacheRules();
      
      logger.info('CDN optimization setup completed', {
        rulesCreated: cacheRules.rulesCreated
      });

      return {
        enabled: true,
        message: 'CDN optimization configured successfully',
        cacheRules: cacheRules.rulesCreated,
        config: {
          imageCacheTtl: s3Config.getCacheTtl('image'),
          videoCacheTtl: s3Config.getCacheTtl('video'),
          defaultCacheTtl: s3Config.getCacheTtl('other')
        }
      };

    } catch (error) {
      logger.error('CDN optimization setup failed:', error);
      throw error;
    }
  }
}

// Singleton instance
const r2StorageService = new R2StorageService();

export default r2StorageService;