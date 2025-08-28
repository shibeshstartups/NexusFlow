import File from '../models/File.js';
import Project from '../models/Project.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import r2StorageService from '../services/r2Storage.js';
import bulkDownloadService from '../services/bulkDownloadService.js';
import backgroundJobService, { JobType } from '../services/backgroundJobService.js';
import folderIntegrityService from '../services/folderIntegrityService.js';
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

/**
 * Upload folder with hierarchical structure preservation
 */
export const uploadFolder = catchAsync(async (req, res, next) => {
  const { projectId, parentFolderId, folderStructure } = req.body;
  const files = req.files || [];

  if (!files || files.length === 0) {
    return next(new AppError('No files provided for folder upload', 400));
  }

  if (!folderStructure) {
    return next(new AppError('Folder structure information is required', 400));
  }

  // Verify project exists and user has access
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  if (!project) {
    return next(new AppError('Project not found or access denied', 404));
  }

  // Verify parent folder if provided
  let parentFolder = null;
  if (parentFolderId) {
    parentFolder = await Folder.findOne({ 
      _id: parentFolderId, 
      project: projectId, 
      owner: req.user._id 
    });
    if (!parentFolder) {
      return next(new AppError('Parent folder not found or access denied', 404));
    }
  }

  try {
    // Parse folder structure from JSON
    const structure = typeof folderStructure === 'string' 
      ? JSON.parse(folderStructure) 
      : folderStructure;

    const uploadedFiles = [];
    const createdFolders = new Map(); // Track created folders
    const errors = [];

    // First, create all folder structure
    await createFolderHierarchy(structure, parentFolder, project, req.user._id, createdFolders);

    // Process each file and place in appropriate folder
    for (const file of files) {
      try {
        // Get folder path from file.fieldname or webkitRelativePath
        const filePath = file.webkitRelativePath || file.originalname;
        const folderPath = path.dirname(filePath).replace(/^\.\//, ''); // Remove leading ./
        const fileName = path.basename(filePath);

        // Find target folder
        let targetFolder = null;
        if (folderPath && folderPath !== '.' && folderPath !== '') {
          const fullFolderPath = parentFolder 
            ? `${parentFolder.fullPath}/${folderPath}` 
            : folderPath;
          
          targetFolder = createdFolders.get(fullFolderPath) || 
                        await findOrCreateFolderByPath(fullFolderPath, project, req.user._id, parentFolder);
          
          if (targetFolder && !createdFolders.has(fullFolderPath)) {
            createdFolders.set(fullFolderPath, targetFolder);
          }
        } else {
          targetFolder = parentFolder;
        }

        // Validate file
        const validation = validateFile(file, req.user);
        if (!validation.isValid) {
          errors.push({
            filename: fileName,
            path: filePath,
            error: validation.error
          });
          continue;
        }

        // Generate R2 key with folder structure
        const r2Key = generateFolderAwareKey(req.user._id, projectId, targetFolder, fileName);
        
        const fileBuffer = file.buffer;
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // Check for duplicate files
        const existingFile = await File.findOne({
          checksum,
          project: projectId,
          isDeleted: { $ne: true }
        });

        if (existingFile && !req.body.allowDuplicates) {
          logger.warn(`Duplicate file skipped: ${fileName}`);
          continue;
        }

        // Upload to R2
        const uploadResult = await r2StorageService.uploadFile(fileBuffer, r2Key, {
          contentType: file.mimetype,
          metadata: {
            userId: req.user._id.toString(),
            projectId: projectId.toString(),
            originalName: fileName,
            folderPath: folderPath,
            checksum: checksum,
            uploadedAt: new Date().toISOString()
          },
          tags: {
            userId: req.user._id.toString(),
            fileType: validation.fileType,
            project: projectId.toString(),
            folder: targetFolder ? targetFolder._id.toString() : 'root'
          },
          isPublic: req.body.isPublic === 'true',
          fileType: validation.fileType
        });

        // Create file document
        const fileData = {
          filename: path.basename(r2Key),
          originalName: fileName,
          displayName: fileName,
          path: r2Key,
          fullPath: uploadResult.location,
          relativePath: r2Key,
          owner: req.user._id,
          project: projectId,
          folder: targetFolder ? targetFolder._id : null,
          client: project.client,
          type: validation.fileType,
          mimeType: file.mimetype,
          extension: path.extname(fileName).toLowerCase(),
          size: fileBuffer.length,
          checksum,
          uploadedBy: req.user._id,
          storage: {
            provider: 'r2',
            key: r2Key,
            bucket: uploadResult.bucket || process.env.CLOUDFLARE_R2_BUCKET_NAME,
            etag: uploadResult.etag,
            url: uploadResult.location,
            directUrl: uploadResult.directUrl,
            cdnUrl: uploadResult.cdnUrl,
            region: 'auto',
            lastSync: new Date(),
            cacheControl: uploadResult.cacheControl,
            useCdn: !!uploadResult.cdnUrl
          },
          tags: Array.isArray(req.body.tags) ? req.body.tags : [],
          category: req.body.category || 'raw',
          analytics: {
            uploadCount: 1,
            downloadCount: 0,
            viewCount: 0,
            lastUploaded: new Date()
          },
          processing: {
            status: 'completed',
            uploadCompleted: true
          }
        };

        const savedFile = await File.create(fileData);
        uploadedFiles.push(savedFile);

        // Update user storage usage
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { storageUsed: fileBuffer.length }
        });

        // Update folder metadata
        if (targetFolder) {
          await updateFolderMetadata(targetFolder._id);
        }

        logger.info('File uploaded successfully in folder structure', {
          fileId: savedFile._id,
          filename: fileName,
          folderPath,
          size: fileBuffer.length,
          user: req.user._id
        });

        // Schedule background processing for thumbnails
        if (validation.fileType === 'image') {
          setImmediate(() => {
            generateThumbnails(savedFile._id).catch(error => {
              logger.error('Thumbnail generation failed:', error);
            });
          });
        }

      } catch (error) {
        logger.error('File upload processing failed:', error);
        errors.push({
          filename: file.originalname || 'unknown',
          error: error.message
        });
      }
    }

    // Update project metadata
    await project.updateMetrics();

    res.status(201).json({
      success: true,
      message: `Folder uploaded successfully. ${uploadedFiles.length} files processed`,
      data: {
        files: uploadedFiles,
        foldersCreated: createdFolders.size,
        totalFiles: uploadedFiles.length,
        ...(errors.length > 0 && { errors })
      }
    });

  } catch (error) {
    logger.error('Folder upload failed:', error);
    return next(new AppError('Folder upload failed', 500));
  }
});

/**
 * Bulk download folder as ZIP
 */
export const downloadFolderAsZip = catchAsync(async (req, res, next) => {
  const { folderId } = req.params;
  const { useBackground = 'auto' } = req.query;

  // Check if user can start download
  if (!bulkDownloadService.canUserStartDownload(req.user._id.toString())) {
    return next(new AppError('Too many concurrent downloads. Please try again later.', 429));
  }

  try {
    // Get folder metadata to determine if background processing is needed
    const folder = await Folder.findOne({
      _id: folderId,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!folder) {
      return next(new AppError('Folder not found or access denied', 404));
    }

    // Get all files in folder to calculate size
    const files = await bulkDownloadService.getAllFolderFiles(folderId, req.user._id.toString());
    
    if (files.length === 0) {
      return next(new AppError('No files found in folder', 404));
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;
    
    // Thresholds for background processing
    const BACKGROUND_SIZE_THRESHOLD = 500 * 1024 * 1024; // 500MB
    const BACKGROUND_FILES_THRESHOLD = 100; // 100 files
    
    const shouldUseBackground = useBackground === 'true' || 
      (useBackground === 'auto' && (totalSize > BACKGROUND_SIZE_THRESHOLD || totalFiles > BACKGROUND_FILES_THRESHOLD));

    if (shouldUseBackground) {
      // Use background job for large operations
      const downloadId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Queue background job
      const job = await backgroundJobService.addJob(
        JobType.FOLDER_ZIP_CREATION,
        {
          folderId,
          userId: req.user._id.toString(),
          downloadId,
          options: {}
        },
        {
          priority: 5,
          attempts: 3,
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      // Return job information for client to poll
      res.status(202).json({
        success: true,
        message: 'ZIP creation queued for background processing',
        data: {
          downloadId,
          jobId: job.id,
          status: 'queued',
          totalFiles,
          estimatedSize: Math.ceil(totalSize * 0.8),
          pollUrl: `/api/files/download/status/${downloadId}`,
          estimatedCompletionTime: Math.ceil(totalSize / (10 * 1024 * 1024))
        }
      });

    } else {
      // Process immediately for smaller operations
      const result = await bulkDownloadService.createFolderZipStream(
        folderId,
        req.user._id.toString(),
        {
          onProgress: (progress) => {
            // Real-time progress updates could be sent via WebSocket here
            logger.debug('Download progress:', progress);
          }
        }
      );

      // Set response headers for ZIP download
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Download-ID': result.downloadId,
        'X-Total-Files': result.totalFiles.toString(),
        'X-Estimated-Size': result.estimatedSize.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      });

      // Handle stream errors
      result.stream.on('error', (error) => {
        logger.error('ZIP stream error:', error);
        if (!res.headersSent) {
          return next(new AppError('Download failed', 500));
        }
      });

      // Pipe ZIP stream to response
      result.stream.pipe(res);

      // Log download initiation
      logger.info('Folder ZIP download started (immediate)', {
        folderId,
        downloadId: result.downloadId,
        totalFiles: result.totalFiles,
        estimatedSize: result.estimatedSize,
        user: req.user._id
      });
    }

  } catch (error) {
    logger.error('Folder ZIP download failed:', error);
    return next(error);
  }
});

/**
 * Bulk download selected files as ZIP
 */
export const downloadFilesAsZip = catchAsync(async (req, res, next) => {
  const { fileIds, archiveName = 'selected_files', useBackground = 'auto' } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return next(new AppError('File IDs array is required', 400));
  }

  // Check if user can start download
  if (!bulkDownloadService.canUserStartDownload(req.user._id.toString())) {
    return next(new AppError('Too many concurrent downloads. Please try again later.', 429));
  }

  try {
    // Get file metadata to determine if background processing is needed
    const files = await File.find({
      _id: { $in: fileIds },
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (files.length === 0) {
      return next(new AppError('No files found or access denied', 404));
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;
    
    // Thresholds for background processing
    const BACKGROUND_SIZE_THRESHOLD = 500 * 1024 * 1024; // 500MB
    const BACKGROUND_FILES_THRESHOLD = 100; // 100 files
    
    const shouldUseBackground = useBackground === true || 
      (useBackground === 'auto' && (totalSize > BACKGROUND_SIZE_THRESHOLD || totalFiles > BACKGROUND_FILES_THRESHOLD));

    if (shouldUseBackground) {
      // Use background job for large operations
      const downloadId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Queue background job
      const job = await backgroundJobService.addJob(
        JobType.BULK_ZIP_CREATION,
        {
          fileIds,
          userId: req.user._id.toString(),
          downloadId,
          options: { archiveName }
        },
        {
          priority: 5, // High priority for user-initiated downloads
          attempts: 3,
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      // Return job information for client to poll
      res.status(202).json({
        success: true,
        message: 'ZIP creation queued for background processing',
        data: {
          downloadId,
          jobId: job.id,
          status: 'queued',
          totalFiles,
          estimatedSize: Math.ceil(totalSize * 0.8), // Estimated ZIP size
          pollUrl: `/api/files/download/status/${downloadId}`,
          estimatedCompletionTime: Math.ceil(totalSize / (10 * 1024 * 1024)) // Rough estimate in seconds
        }
      });

    } else {
      // Process immediately for smaller operations
      const result = await bulkDownloadService.createFilesZipStream(
        fileIds,
        req.user._id.toString(),
        {
          archiveName,
          onProgress: (progress) => {
            logger.debug('Download progress:', progress);
          }
        }
      );

      // Set response headers for ZIP download
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Download-ID': result.downloadId,
        'X-Total-Files': result.totalFiles.toString(),
        'X-Estimated-Size': result.estimatedSize.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      });

      // Handle stream errors
      result.stream.on('error', (error) => {
        logger.error('ZIP stream error:', error);
        if (!res.headersSent) {
          return next(new AppError('Download failed', 500));
        }
      });

      // Pipe ZIP stream to response
      result.stream.pipe(res);

      logger.info('Files ZIP download started (immediate)', {
        fileIds: fileIds.length,
        downloadId: result.downloadId,
        totalFiles: result.totalFiles,
        estimatedSize: result.estimatedSize,
        user: req.user._id
      });
    }

  } catch (error) {
    logger.error('Files ZIP download failed:', error);
    return next(error);
  }
});

/**
 * Bulk download entire project as ZIP
 */
export const downloadProjectAsZip = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const { projectName, useBackground = 'auto' } = req.body;

  // Verify project access
  const project = await Project.findOne({
    _id: projectId,
    owner: req.user._id
  });

  if (!project) {
    return next(new AppError('Project not found or access denied', 404));
  }

  // Check if user can start download
  if (!bulkDownloadService.canUserStartDownload(req.user._id.toString())) {
    return next(new AppError('Too many concurrent downloads. Please try again later.', 429));
  }

  try {
    // Get all project files to calculate size
    const files = await File.find({
      project: projectId,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (files.length === 0) {
      return next(new AppError('No files found in project', 404));
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;
    
    // Thresholds for background processing
    const BACKGROUND_SIZE_THRESHOLD = 500 * 1024 * 1024; // 500MB
    const BACKGROUND_FILES_THRESHOLD = 100; // 100 files
    
    const shouldUseBackground = useBackground === true || 
      (useBackground === 'auto' && (totalSize > BACKGROUND_SIZE_THRESHOLD || totalFiles > BACKGROUND_FILES_THRESHOLD));

    if (shouldUseBackground) {
      // Use background job for large operations
      const downloadId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Queue background job
      const job = await backgroundJobService.addJob(
        JobType.PROJECT_ZIP_CREATION,
        {
          projectId,
          userId: req.user._id.toString(),
          downloadId,
          options: { projectName: projectName || project.name }
        },
        {
          priority: 5,
          attempts: 3,
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      // Return job information for client to poll
      res.status(202).json({
        success: true,
        message: 'ZIP creation queued for background processing',
        data: {
          downloadId,
          jobId: job.id,
          status: 'queued',
          totalFiles,
          estimatedSize: Math.ceil(totalSize * 0.8),
          pollUrl: `/api/files/download/status/${downloadId}`,
          estimatedCompletionTime: Math.ceil(totalSize / (10 * 1024 * 1024))
        }
      });

    } else {
      // Process immediately for smaller operations
      const result = await bulkDownloadService.createProjectZipStream(
        projectId,
        req.user._id.toString(),
        {
          projectName: projectName || project.name,
          onProgress: (progress) => {
            logger.debug('Download progress:', progress);
          }
        }
      );

      // Set response headers for ZIP download
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Download-ID': result.downloadId,
        'X-Total-Files': result.totalFiles.toString(),
        'X-Estimated-Size': result.estimatedSize.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      });

      // Handle stream errors
      result.stream.on('error', (error) => {
        logger.error('ZIP stream error:', error);
        if (!res.headersSent) {
          return next(new AppError('Download failed', 500));
        }
      });

      // Pipe ZIP stream to response
      result.stream.pipe(res);

      logger.info('Project ZIP download started (immediate)', {
        projectId,
        downloadId: result.downloadId,
        totalFiles: result.totalFiles,
        estimatedSize: result.estimatedSize,
        user: req.user._id
      });
    }

  } catch (error) {
    logger.error('Project ZIP download failed:', error);
    return next(error);
  }
});

/**
 * Get bulk download status
 */
export const getBulkDownloadStatus = catchAsync(async (req, res, next) => {
  const { downloadId } = req.params;
  
  // First check active downloads
  let status = bulkDownloadService.getDownloadStatus(downloadId);
  
  // If not found in active downloads, check Redis for background job results
  if (!status) {
    const redisService = (await import('../services/redisService.js')).default;
    const backgroundResult = await redisService.get(`bulk_download:${downloadId}`);
    
    if (backgroundResult) {
      status = {
        userId: req.user._id.toString(), // We'll verify ownership differently
        status: backgroundResult.status,
        totalFiles: backgroundResult.totalFiles || 0,
        totalSize: backgroundResult.totalSize || 0,
        estimatedZipSize: backgroundResult.estimatedSize || 0,
        startTime: backgroundResult.startTime || backgroundResult.completedAt || backgroundResult.failedAt,
        lastUpdate: backgroundResult.completedAt || backgroundResult.failedAt || new Date(),
        filename: backgroundResult.filename,
        error: backgroundResult.error,
        metadata: backgroundResult.metadata
      };
    }
  }
  
  if (!status) {
    return next(new AppError('Download not found', 404));
  }
  
  // Verify user owns this download
  if (status.userId !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }
  
  // For completed background jobs, provide download URL
  let downloadUrl = null;
  if (status.status === 'completed' && status.filename) {
    // Generate a temporary signed URL for downloading the completed ZIP
    // This would need to be implemented based on how you store completed ZIPs
    downloadUrl = `/api/files/download/completed/${downloadId}`;
  }
  
  res.status(200).json({
    success: true,
    data: {
      downloadId,
      status: status.status,
      totalFiles: status.totalFiles,
      totalSize: status.totalSize,
      estimatedZipSize: status.estimatedZipSize,
      startTime: status.startTime,
      lastUpdate: status.lastUpdate,
      filename: status.filename,
      downloadUrl,
      error: status.error,
      metadata: status.metadata,
      progress: status.status === 'active' ? {
        percentage: Math.round((status.processedFiles || 0) / (status.totalFiles || 1) * 100),
        processedFiles: status.processedFiles || 0,
        estimatedTimeRemaining: status.estimatedTimeRemaining
      } : null
    }
  });
});

/**
 * Helper function to create folder hierarchy
 */
const createFolderHierarchy = async (structure, parentFolder, project, userId, createdFolders) => {
  const createFolder = async (folderData, parent) => {
    const folderPath = parent 
      ? `${parent.fullPath}/${folderData.name}`
      : folderData.name;
    
    // Check if folder already exists
    let existingFolder = createdFolders.get(folderPath);
    if (existingFolder) {
      return existingFolder;
    }

    existingFolder = await Folder.findOne({
      name: folderData.name,
      parentFolder: parent ? parent._id : null,
      project: project._id,
      owner: userId,
      isDeleted: { $ne: true }
    });

    if (existingFolder) {
      createdFolders.set(folderPath, existingFolder);
      return existingFolder;
    }

    // Create new folder
    const newFolder = await Folder.create({
      name: folderData.name,
      parentFolder: parent ? parent._id : null,
      project: project._id,
      owner: userId,
      fullPath: folderPath,
      level: parent ? parent.level + 1 : 0
    });

    createdFolders.set(folderPath, newFolder);
    logger.debug(`Created folder: ${folderPath}`);

    // Recursively create subfolders
    if (folderData.children && folderData.children.length > 0) {
      for (const child of folderData.children) {
        await createFolder(child, newFolder);
      }
    }

    return newFolder;
  };

  // Create folders from structure
  if (Array.isArray(structure)) {
    for (const folderData of structure) {
      await createFolder(folderData, parentFolder);
    }
  } else if (structure.name) {
    await createFolder(structure, parentFolder);
  }
};

/**
 * Helper function to find or create folder by path
 */
const findOrCreateFolderByPath = async (fullPath, project, userId, parentFolder) => {
  const pathParts = fullPath.split('/').filter(part => part.length > 0);
  let currentFolder = parentFolder;
  let currentPath = parentFolder ? parentFolder.fullPath : '';

  for (const folderName of pathParts) {
    currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    
    // Try to find existing folder
    let folder = await Folder.findOne({
      name: folderName,
      parentFolder: currentFolder ? currentFolder._id : null,
      project: project._id,
      owner: userId,
      isDeleted: { $ne: true }
    });

    if (!folder) {
      // Create new folder
      folder = await Folder.create({
        name: folderName,
        parentFolder: currentFolder ? currentFolder._id : null,
        project: project._id,
        owner: userId,
        fullPath: currentPath,
        level: currentFolder ? currentFolder.level + 1 : 0
      });
      logger.debug(`Created folder by path: ${currentPath}`);
    }

    currentFolder = folder;
  }

  return currentFolder;
};

/**
 * Verify folder integrity
 */
export const verifyFolderIntegrity = catchAsync(async (req, res, next) => {
  const { folderId } = req.params;
  const {
    checkFiles = true,
    checkStorage = true,
    checkMetadata = true,
    checkPermissions = true,
    deepScan = false,
    autoRepair = false
  } = req.body;

  // Verify folder ownership
  const folder = await Folder.findOne({
    _id: folderId,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!folder) {
    return next(new AppError('Folder not found or access denied', 404));
  }

  try {
    const verificationResult = await folderIntegrityService.verifyFolderIntegrity(
      folderId,
      req.user._id.toString(),
      {
        checkFiles,
        checkStorage,
        checkMetadata,
        checkPermissions,
        deepScan,
        autoRepair
      }
    );

    logger.info('Folder integrity verification completed', {
      folderId,
      userId: req.user._id,
      verificationId: verificationResult.verificationId,
      integrityScore: verificationResult.results.integrityScore,
      errorsFound: verificationResult.results.errors.length
    });

    res.status(200).json({
      success: true,
      data: verificationResult
    });

  } catch (error) {
    logger.error('Folder integrity verification failed:', error);
    return next(error);
  }
});

/**
 * Get folder integrity verification status
 */
export const getVerificationStatus = catchAsync(async (req, res, next) => {
  const { verificationId } = req.params;
  
  const status = folderIntegrityService.getVerificationStatus(verificationId);
  
  if (!status) {
    return next(new AppError('Verification not found', 404));
  }
  
  // Verify user owns this verification
  if (status.userId !== req.user._id.toString()) {
    return next(new AppError('Access denied', 403));
  }
  
  res.status(200).json({
    success: true,
    data: status
  });
});

/**
 * Batch verify multiple folders
 */
export const batchVerifyFolders = catchAsync(async (req, res, next) => {
  const { folderIds, options = {} } = req.body;

  if (!Array.isArray(folderIds) || folderIds.length === 0) {
    return next(new AppError('Folder IDs array is required', 400));
  }

  if (folderIds.length > 10) {
    return next(new AppError('Maximum 10 folders can be verified at once', 400));
  }

  // Verify all folders belong to user
  const folders = await Folder.find({
    _id: { $in: folderIds },
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (folders.length !== folderIds.length) {
    return next(new AppError('Some folders not found or access denied', 404));
  }

  try {
    const verificationPromises = folderIds.map(folderId =>
      folderIntegrityService.verifyFolderIntegrity(
        folderId,
        req.user._id.toString(),
        options
      )
    );

    const results = await Promise.allSettled(verificationPromises);
    
    const successfulVerifications = [];
    const failedVerifications = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulVerifications.push({
          folderId: folderIds[index],
          result: result.value
        });
      } else {
        failedVerifications.push({
          folderId: folderIds[index],
          error: result.reason.message
        });
      }
    });

    logger.info('Batch folder verification completed', {
      userId: req.user._id,
      totalFolders: folderIds.length,
      successful: successfulVerifications.length,
      failed: failedVerifications.length
    });

    res.status(200).json({
      success: true,
      data: {
        successful: successfulVerifications,
        failed: failedVerifications,
        summary: {
          totalFolders: folderIds.length,
          successfulCount: successfulVerifications.length,
          failedCount: failedVerifications.length,
          averageIntegrityScore: successfulVerifications.length > 0
            ? Math.round(successfulVerifications.reduce((sum, v) => sum + v.result.results.integrityScore, 0) / successfulVerifications.length)
            : 0
        }
      }
    });

  } catch (error) {
    logger.error('Batch folder verification failed:', error);
    return next(error);
  }
});

/**
 * Get folder health summary
 */
export const getFolderHealthSummary = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  try {
    // Get all folders in project
    const folders = await Folder.find({
      project: projectId || null,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    // Get all files
    const files = await File.find({
      project: projectId || null,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    // Basic health checks
    const orphanedFiles = await File.aggregate([
      {
        $match: {
          owner: req.user._id,
          project: projectId || null,
          isDeleted: { $ne: true },
          folder: { $ne: null }
        }
      },
      {
        $lookup: {
          from: 'folders',
          localField: 'folder',
          foreignField: '_id',
          as: 'folderDoc'
        }
      },
      {
        $match: {
          $or: [
            { folderDoc: { $size: 0 } },
            { 'folderDoc.isDeleted': true }
          ]
        }
      }
    ]);

    // Calculate storage summary
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const averageFileSize = files.length > 0 ? totalSize / files.length : 0;

    // Find large files (>100MB)
    const largeFiles = files.filter(file => file.size > 100 * 1024 * 1024);
    
    // Find old files (>1 year)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const oldFiles = files.filter(file => file.createdAt < oneYearAgo);

    const healthSummary = {
      overview: {
        totalFolders: folders.length,
        totalFiles: files.length,
        totalSize,
        averageFileSize: Math.round(averageFileSize)
      },
      issues: {
        orphanedFiles: orphanedFiles.length,
        largeFiles: largeFiles.length,
        oldFiles: oldFiles.length
      },
      recommendations: []
    };

    // Generate recommendations
    if (orphanedFiles.length > 0) {
      healthSummary.recommendations.push({
        type: 'CLEANUP_ORPHANS',
        priority: 'high',
        message: `${orphanedFiles.length} orphaned files found. Run integrity verification with auto-repair.`,
        action: 'cleanup'
      });
    }

    if (largeFiles.length > 10) {
      healthSummary.recommendations.push({
        type: 'OPTIMIZE_STORAGE',
        priority: 'medium',
        message: `${largeFiles.length} large files detected. Consider compressing or archiving old files.`,
        action: 'optimize'
      });
    }

    if (oldFiles.length > 100) {
      healthSummary.recommendations.push({
        type: 'ARCHIVE_OLD_FILES',
        priority: 'low',
        message: `${oldFiles.length} old files found. Consider archiving files older than 1 year.`,
        action: 'archive'
      });
    }

    res.status(200).json({
      success: true,
      data: healthSummary
    });

  } catch (error) {
    logger.error('Failed to get folder health summary:', error);
    return next(error);
  }
});

/**
 * Helper function to generate folder-aware R2 key
 */
const generateFolderAwareKey = (userId, projectId, folder, filename) => {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-_]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  
  if (folder && folder.fullPath) {
    return `users/${userId}/projects/${projectId}/folders/${folder.fullPath}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
  } else {
    return `users/${userId}/projects/${projectId}/files/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
  }
};

/**
 * Helper function to update folder metadata
 */
const updateFolderMetadata = async (folderId) => {
  try {
    const files = await File.find({ 
      folder: folderId, 
      isDeleted: { $ne: true } 
    });
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const fileTypes = [...new Set(files.map(file => file.type))];
    
    await Folder.findByIdAndUpdate(folderId, {
      'metadata.totalFiles': files.length,
      'metadata.totalSize': totalSize,
      'metadata.fileTypes': fileTypes,
      'metadata.lastFileAdded': new Date()
    });
  } catch (error) {
    logger.error('Failed to update folder metadata:', error);
  }
};

/**
 * Helper function to validate file for upload
 */
const validateFile = (file, user) => {
  const { validateFile: r2ValidateFile, getFileType } = require('../config/r2Upload.js');
  
  try {
    const validation = r2ValidateFile(file, user);
    return {
      isValid: true,
      fileType: validation.fileType,
      typeConfig: validation.typeConfig
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

export default {
  uploadFiles,
  uploadFolder,
  getFiles,
  getFile,
  downloadFile,
  downloadFolderAsZip,
  downloadFilesAsZip,
  downloadProjectAsZip,
  getBulkDownloadStatus,
  deleteFile,
  shareFile,
  getUserStorageStats,
  getCdnAnalytics,
  getResponsiveImages,
  purgeCdnCache,
  setupCdnOptimization
};
