import multer from 'multer';
import r2StorageService from '../services/r2Storage.js';
import s3Config from './s3.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';

// File type configuration
const fileTypes = {
  image: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp',
      'image/svg+xml'
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.svg'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  video: {
    mimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-flv',
      'video/x-ms-wmv'
    ],
    extensions: ['.mp4', '.mpeg', '.mov', '.avi', '.webm', '.flv', '.wmv'],
    maxSize: 5 * 1024 * 1024 * 1024 // 5GB
  },
  audio: {
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/flac'
    ],
    extensions: ['.mp3', '.wav', '.aac', '.ogg', '.webm', '.flac'],
    maxSize: 500 * 1024 * 1024 // 500MB
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  archive: {
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/gzip',
      'application/x-tar'
    ],
    extensions: ['.zip', '.rar', '.7z', '.gz', '.tar'],
    maxSize: 1024 * 1024 * 1024 // 1GB
  }
};

/**
 * Validate file type and size
 */
const validateFile = (file, user) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  // Find matching file type
  let fileType = 'other';
  let typeConfig = null;

  for (const [type, config] of Object.entries(fileTypes)) {
    if (config.mimeTypes.includes(mimeType) || config.extensions.includes(extension)) {
      fileType = type;
      typeConfig = config;
      break;
    }
  }

  // Check file size
  if (typeConfig && file.size > typeConfig.maxSize) {
    throw new AppError(
      `File size ${formatBytes(file.size)} exceeds maximum allowed size of ${formatBytes(typeConfig.maxSize)} for ${fileType} files`,
      400
    );
  }

  // Check user storage quota
  if (user && user.storageUsed + file.size > user.storageQuota) {
    throw new AppError(
      `Upload would exceed your storage quota. Available: ${formatBytes(user.storageQuota - user.storageUsed)}`,
      400
    );
  }

  return { fileType, typeConfig };
};

/**
 * Calculate file checksum
 */
const calculateChecksum = (buffer) => {
  return new Promise((resolve) => {
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    resolve(hash.digest('hex'));
  });
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * R2 Storage configuration for multer
 */
const r2Storage = {
  async _handleFile(req, file, callback) {
    try {
      // Validate authentication
      if (!req.user) {
        return callback(new AppError('Authentication required', 401));
      }

      // Validate file
      const validation = validateFile(file, req.user);
      file.fileType = validation.fileType;
      file.typeConfig = validation.typeConfig;

      // Collect file data
      const chunks = [];
      let totalSize = 0;

      file.stream.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });

      file.stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          // Generate R2 key
          const r2Key = s3Config.generateFileKey(
            req.user._id,
            req.body.projectId || 'default',
            file.originalname
          );

          // Calculate checksum
          const checksum = await calculateChecksum(buffer);

          // Upload to R2 with CDN optimization
          const uploadResult = await r2StorageService.uploadFile(buffer, r2Key, {
            contentType: file.mimetype,
            metadata: {
              userId: req.user._id.toString(),
              projectId: req.body.projectId || 'default',
              originalName: file.originalname,
              checksum: checksum,
              uploadedAt: new Date().toISOString()
            },
            tags: {
              userId: req.user._id.toString(),
              fileType: file.fileType,
              project: req.body.projectId || 'default'
            },
            isPublic: req.body.isPublic === 'true', // Check if file should be public
            fileType: file.fileType
          });

          // Return file info with CDN optimization
          callback(null, {
            filename: path.basename(r2Key),
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: buffer.length,
            checksum: checksum,
            storage: {
              provider: 'r2',
              key: r2Key,
              bucket: s3Config.getBucket(),
              etag: uploadResult.etag,
              url: uploadResult.location, // Optimized URL (CDN if public)
              directUrl: uploadResult.directUrl, // Direct R2 URL
              cdnUrl: uploadResult.cdnUrl, // CDN URL if available
              cacheControl: uploadResult.cacheControl
            },
            fileType: file.fileType,
            typeConfig: file.typeConfig
          });

        } catch (error) {
          logger.error('R2 upload processing failed:', error);
          callback(new AppError(`Upload failed: ${error.message}`, 500));
        }
      });

      file.stream.on('error', (error) => {
        logger.error('File stream error:', error);
        callback(new AppError(`File stream error: ${error.message}`, 500));
      });

    } catch (error) {
      logger.error('R2 upload handler error:', error);
      callback(error);
    }
  },

  _removeFile(req, file, callback) {
    // R2 cleanup is handled separately if needed
    callback(null);
  }
};

/**
 * File filter for validation
 */
const fileFilter = (req, file, cb) => {
  try {
    if (!req.user) {
      return cb(new AppError('Authentication required', 401), false);
    }
    
    const validation = validateFile(file, req.user);
    file.fileType = validation.fileType;
    file.typeConfig = validation.typeConfig;
    
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

/**
 * Create multer configuration for R2
 */
const createR2MulterConfig = (options = {}) => {
  const {
    maxFileSize = 5 * 1024 * 1024 * 1024, // 5GB
    maxFiles = 50
  } = options;
  
  return multer({
    storage: r2Storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fieldSize: 1024 * 1024 // 1MB for field data
    }
  });
};

// Export upload configurations
export const uploadSingle = (fieldName = 'file') => {
  const upload = createR2MulterConfig({ maxFiles: 1 });
  return upload.single(fieldName);
};

export const uploadMultiple = (fieldName = 'files', maxCount = 50) => {
  const upload = createR2MulterConfig();
  return upload.array(fieldName, maxCount);
};

export const uploadFields = (fields) => {
  const upload = createR2MulterConfig();
  return upload.fields(fields);
};

// Utility functions
export { validateFile, calculateChecksum, formatBytes };

// Initialize R2 service
export const initializeR2Service = async () => {
  try {
    await r2StorageService.initialize();
    logger.info('R2 upload service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize R2 upload service:', error);
    throw error;
  }
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  initializeR2Service,
  validateFile,
  calculateChecksum,
  formatBytes
};