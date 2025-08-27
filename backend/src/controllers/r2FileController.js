import File from '../models/File.js';
import Project from '../models/Project.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import r2StorageService from '../services/r2Storage.js';
import s3Config from '../config/s3.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';

/**
 * Upload files to R2 storage
 */
export const uploadFiles = catchAsync(async (req, res, next) => {
  const { projectId, folderId, tags = [], category = 'raw' } = req.body;
  const files = req.files || [req.file];

  if (!files || files.length === 0) {
    return next(new AppError('No files provided', 400));
  }

  // Verify project exists and user has access
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  if (!project) {
    return next(new AppError('Project not found or access denied', 404));
  }

  // Verify folder if provided
  if (folderId) {
    const folder = await Folder.findOne({ 
      _id: folderId, 
      project: projectId, 
      owner: req.user._id 
    });
    if (!folder) {
      return next(new AppError('Folder not found or access denied', 404));
    }
  }

  const uploadedFiles = [];
  const errors = [];

  // Process each file
  for (const file of files) {
    try {
      // Check for duplicate files
      const existingFile = await File.findOne({
        checksum: file.checksum,
        project: projectId,
        isDeleted: { $ne: true }
      });

      if (existingFile) {
        errors.push({
          filename: file.originalname,
          error: 'File already exists in this project'
        });
        continue;
      }

      // Create file document with R2 storage info
      const fileData = {
        filename: file.filename,
        originalName: file.originalname,
        displayName: file.originalname,
        path: file.storage.key, // R2 key as path
        fullPath: file.storage.url, // Optimized URL (CDN or direct)
        relativePath: file.storage.key,
        owner: req.user._id,
        project: projectId,
        folder: folderId || null,
        client: project.client,
        type: file.fileType,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).toLowerCase(),
        size: file.size,
        checksum: file.checksum,
        // R2 storage configuration with CDN optimization
        storage: {
          provider: 'r2',
          key: file.storage.key,
          bucket: file.storage.bucket,
          etag: file.storage.etag,
          url: file.storage.location, // Optimized URL
          directUrl: file.storage.directUrl, // Direct R2 URL
          cdnUrl: file.storage.cdnUrl, // CDN URL if available
          region: 'auto',
          lastSync: new Date(),
          cacheControl: file.storage.cacheControl,
          useCdn: !!file.storage.cdnUrl
        },
        tags: Array.isArray(tags) ? tags : [tags],
        category,
        processing: {
          status: 'pending'
        }
      };

      // Save file to database
      const savedFile = await File.create(fileData);
      
      // Update user storage usage
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { storageUsed: file.size }
      });

      // Update project metrics
      await project.updateMetrics();
      
      uploadedFiles.push(savedFile);

      logger.info('File uploaded to R2 successfully', {
        fileId: savedFile._id,
        filename: savedFile.originalName,
        size: savedFile.size,
        r2Key: savedFile.storage.key,
        project: projectId,
        user: req.user._id
      });

      // Schedule background processing for thumbnails with CDN optimization
      setImmediate(() => {
        generateThumbnails(savedFile._id, savedFile.type === 'image').catch(error => {
          logger.error('Thumbnail generation failed:', error);
        });
      });

    } catch (error) {
      logger.error('File upload processing failed:', error);
      errors.push({
        filename: file.originalname,
        error: error.message
      });
    }
  }

  res.status(201).json({
    success: true,
    message: `${uploadedFiles.length} files uploaded successfully`,
    data: {
      files: uploadedFiles,
      ...(errors.length > 0 && { errors })
    }
  });
});

/**
 * Get files with filtering and pagination
 */
export const getFiles = catchAsync(async (req, res, next) => {
  const {
    project,
    folder,
    type,
    category,
    tags,
    search,
    dateFrom,
    dateTo,
    sizeMin,
    sizeTo,
    isFavorite,
    page = 1,
    limit = 50,
    sort = '-createdAt'
  } = req.query;

  const filters = { 
    owner: req.user._id,
    isDeleted: { $ne: true }
  };
  
  const options = {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
    sort: {}
  };

  // Parse sort parameter
  if (sort.startsWith('-')) {
    options.sort[sort.substring(1)] = -1;
  } else {
    options.sort[sort] = 1;
  }

  // Build filters
  if (project) filters.project = project;
  if (folder) filters.folder = folder;
  if (type) filters.type = type;
  if (category) filters.category = category;
  if (isFavorite !== undefined) filters['flags.isFavorite'] = isFavorite === 'true';
  if (tags) filters.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  // Date range filter
  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.$lte = new Date(dateTo);
  }

  // Size range filter
  if (sizeMin || sizeTo) {
    filters.size = {};
    if (sizeMin) filters.size.$gte = parseInt(sizeMin);
    if (sizeTo) filters.size.$lte = parseInt(sizeTo);
  }

  // Search filter
  if (search) {
    filters.$or = [
      { originalName: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const files = await File.find(filters, null, options)
    .populate('project', 'name slug')
    .populate('folder', 'name fullPath')
    .select('-storage.etag -checksum'); // Hide sensitive fields

  const total = await File.countDocuments(filters);

  res.status(200).json({
    success: true,
    data: {
      files,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * Get single file details
 */
export const getFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  })
  .populate('project', 'name slug client')
  .populate('folder', 'name fullPath')
  .populate('client', 'name company');

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Increment view count
  await File.findByIdAndUpdate(file._id, {
    $inc: { 'analytics.viewCount': 1 },
    $set: { 'analytics.lastViewed': new Date() }
  });

  res.status(200).json({
    success: true,
    data: { file }
  });
});

/**
 * Download file from R2
 */
export const downloadFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  try {
    // Generate presigned URL for secure download
    const presignedUrl = await r2StorageService.generatePresignedUrl(
      file.storage.key,
      'getObject',
      3600, // 1 hour expiry
      {
        ResponseContentDisposition: `attachment; filename="${file.originalName}"`
      }
    );

    // Update analytics
    await File.findByIdAndUpdate(file._id, {
      $inc: { 'analytics.downloadCount': 1 },
      $set: { 'analytics.lastDownloaded': new Date() }
    });

    logger.info('File download initiated', {
      fileId: file._id,
      filename: file.originalName,
      user: req.user._id
    });

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: presignedUrl.url,
        expiresAt: presignedUrl.expiresAt,
        filename: file.originalName,
        size: file.size,
        contentType: file.mimeType
      }
    });

  } catch (error) {
    logger.error('File download failed:', error);
    return next(new AppError('Failed to generate download link', 500));
  }
});

/**
 * Delete file from R2 and database
 */
export const deleteFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  try {
    // Delete from R2
    await r2StorageService.deleteFile(file.storage.key);

    // Delete thumbnails from R2
    if (file.thumbnails && file.thumbnails.length > 0) {
      const thumbnailKeys = file.thumbnails
        .filter(thumb => thumb.storage && thumb.storage.key)
        .map(thumb => thumb.storage.key);
      
      if (thumbnailKeys.length > 0) {
        await r2StorageService.deleteMultipleFiles(thumbnailKeys);
      }
    }

    // Mark as deleted in database
    await File.findByIdAndUpdate(file._id, {
      isDeleted: true,
      deletedAt: new Date()
    });

    // Update user storage usage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: -file.size }
    });

    // Update project metrics
    const project = await Project.findById(file.project);
    if (project) {
      await project.updateMetrics();
    }

    logger.info('File deleted successfully', {
      fileId: file._id,
      filename: file.originalName,
      size: file.size,
      user: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    logger.error('File deletion failed:', error);
    return next(new AppError('Failed to delete file', 500));
  }
});

/**
 * Generate share link for file
 */
export const shareFile = catchAsync(async (req, res, next) => {
  const { expiresIn = 24, allowDownload = true, password } = req.body;

  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  try {
    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const bcrypt = await import('bcryptjs');
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Update file with sharing info
    await File.findByIdAndUpdate(file._id, {
      'sharing.isPublic': true,
      'sharing.shareToken': shareToken,
      'sharing.shareLink': `${process.env.FRONTEND_URL}/shared/file/${shareToken}`,
      'sharing.allowDownload': allowDownload,
      'sharing.expiresAt': expiresAt,
      'sharing.password': hashedPassword,
      $inc: { 'analytics.shareCount': 1 },
      $set: { 'analytics.lastShared': new Date() }
    });

    logger.info('File share link generated', {
      fileId: file._id,
      shareToken,
      expiresAt,
      user: req.user._id
    });

    res.status(200).json({
      success: true,
      data: {
        shareLink: `${process.env.FRONTEND_URL}/shared/file/${shareToken}`,
        shareToken,
        expiresAt,
        allowDownload
      }
    });

  } catch (error) {
    logger.error('Share link generation failed:', error);
    return next(new AppError('Failed to generate share link', 500));
  }
});

/**
 * Generate thumbnails for uploaded file
 */
const generateThumbnails = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    if (!file || file.type !== 'image') return;

    const sharp = await import('sharp');
    const originalData = await r2StorageService.downloadFile(file.storage.key);
    
    const sizes = [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 600 }
    ];

    const thumbnails = [];

    for (const size of sizes) {
      try {
        const thumbnailBuffer = await sharp.default(originalData.buffer)
          .resize(size.width, size.height, { 
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        const thumbnailKey = s3Config.generateThumbnailKey(
          file.owner,
          file.project,
          file.originalName,
          size.name
        );

        const uploadResult = await r2StorageService.uploadFile(
          thumbnailBuffer,
          thumbnailKey,
          {
            contentType: 'image/jpeg',
            metadata: {
              originalFile: file._id.toString(),
              size: size.name,
              type: 'thumbnail'
            }
          }
        );

        thumbnails.push({
          size: size.name,
          storage: {
            key: thumbnailKey,
            url: uploadResult.location,
            etag: uploadResult.etag
          },
          dimensions: {
            width: size.width,
            height: size.height
          },
          fileSize: thumbnailBuffer.length
        });

      } catch (error) {
        logger.error(`Failed to generate ${size.name} thumbnail:`, error);
      }
    }

    // Update file with thumbnails
    await File.findByIdAndUpdate(fileId, {
      thumbnails,
      'processing.thumbnailGenerated': true,
      'processing.status': 'completed'
    });

    logger.info('Thumbnails generated successfully', {
      fileId,
      thumbnailCount: thumbnails.length
    });

  } catch (error) {
    logger.error('Thumbnail generation failed:', error);
    await File.findByIdAndUpdate(fileId, {
      'processing.status': 'failed',
      'processing.error': error.message
    });
  }
};

/**
 * Get user storage statistics with CDN analytics
 */
export const getUserStorageStats = catchAsync(async (req, res, next) => {
  try {
    const stats = await r2StorageService.getUserStorageStats(req.user._id);
    const cdnAnalytics = await r2StorageService.getCdnAnalytics();
    const bandwidthOptimization = await r2StorageService.getBandwidthOptimization();
    
    const dbStats = await File.aggregate([
      { $match: { owner: req.user._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          byType: {
            $push: {
              type: '$type',
              size: '$size'
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        r2Stats: stats,
        dbStats: dbStats[0] || { totalFiles: 0, totalSize: 0 },
        user: {
          storageUsed: req.user.storageUsed,
          storageQuota: req.user.storageQuota,
          storageUsagePercentage: (req.user.storageUsed / req.user.storageQuota) * 100
        },
        cdn: cdnAnalytics,
        optimization: bandwidthOptimization
      }
    });

  } catch (error) {
    logger.error('Failed to get storage stats:', error);
    return next(new AppError('Failed to get storage statistics', 500));
  }
});

/**
 * Get CDN analytics and performance metrics
 */
export const getCdnAnalytics = catchAsync(async (req, res, next) => {
  try {
    const { since = '2024-01-01' } = req.query;
    const analytics = await r2StorageService.getCdnAnalytics(since);
    
    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Failed to get CDN analytics:', error);
    return next(new AppError('Failed to get CDN analytics', 500));
  }
});

/**
 * Get responsive image URLs for a file
 */
export const getResponsiveImages = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true },
    type: 'image'
  });

  if (!file) {
    return next(new AppError('Image file not found', 404));
  }

  try {
    const responsiveUrls = r2StorageService.generateResponsiveImageUrls(
      file.storage.key, 
      file.type
    );

    res.status(200).json({
      success: true,
      data: {
        fileId: file._id,
        filename: file.originalName,
        urls: responsiveUrls
      }
    });

  } catch (error) {
    logger.error('Failed to generate responsive URLs:', error);
    return next(new AppError('Failed to generate responsive image URLs', 500));
  }
});

/**
 * Purge CDN cache for specific files
 */
export const purgeCdnCache = catchAsync(async (req, res, next) => {
  const { fileIds } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return next(new AppError('File IDs array is required', 400));
  }

  try {
    const files = await File.find({
      _id: { $in: fileIds },
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (files.length === 0) {
      return next(new AppError('No files found', 404));
    }

    const keys = files.map(file => file.storage.key);
    const fileTypes = files.map(file => file.type);

    const result = await r2StorageService.purgeCdnCache(keys, fileTypes);

    res.status(200).json({
      success: true,
      message: 'CDN cache purged successfully',
      data: {
        purgedFiles: files.length,
        ...result
      }
    });

  } catch (error) {
    logger.error('CDN cache purge failed:', error);
    return next(new AppError('Failed to purge CDN cache', 500));
  }
});

/**
 * Setup CDN optimization
 */
export const setupCdnOptimization = catchAsync(async (req, res, next) => {
  try {
    const result = await r2StorageService.setupCdnOptimization();

    res.status(200).json({
      success: true,
      message: 'CDN optimization setup completed',
      data: result
    });

  } catch (error) {
    logger.error('CDN optimization setup failed:', error);
    return next(new AppError('Failed to setup CDN optimization', 500));
  }
});

export default {
  uploadFiles,
  getFiles,
  getFile,
  downloadFile,
  deleteFile,
  shareFile,
  getUserStorageStats,
  getCdnAnalytics,
  getResponsiveImages,
  purgeCdnCache,
  setupCdnOptimization
};
