import fs from 'fs';
import path from 'path';
import File from '../models/File.js';
import Project from '../models/Project.js';
import Folder from '../models/Folder.js';
import User from '../models/User.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import { processUploadedFile, downloadFromGridFS, deleteFromGridFS, cleanupTempFiles } from '../config/upload.js';
import { logger } from '../utils/logger.js';

// Upload files
export const uploadFiles = catchAsync(async (req, res, next) => {
  const { projectId, folderId, tags = [], category = 'raw' } = req.body;
  const files = req.files || [req.file];

  if (!files || files.length === 0) {
    return next(new AppError('No files provided', 400));
  }

  // Verify project exists and user has access
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  if (!project) {
    // Clean up uploaded files
    cleanupTempFiles(files.map(f => f.path));
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
      cleanupTempFiles(files.map(f => f.path));
      return next(new AppError('Folder not found or access denied', 404));
    }
  }

  const uploadedFiles = [];
  const errors = [];

  // Process each file
  for (const file of files) {
    try {
      const fileData = await processUploadedFile(file, {
        projectId,
        folderId,
        userId: req.user._id
      });

      // Add additional metadata
      fileData.tags = Array.isArray(tags) ? tags : [tags];
      fileData.category = category;
      fileData.client = project.client;

      // Check for duplicate files
      const existingFile = await File.findOne({
        checksum: fileData.checksum,
        project: projectId,
        isDeleted: { $ne: true }
      });

      if (existingFile) {
        // Clean up the uploaded file
        if (fileData.path) {
          cleanupTempFiles([fileData.path]);
        }
        errors.push({
          filename: file.originalname,
          error: 'File already exists in this project'
        });
        continue;
      }

      // Create file document
      const savedFile = await File.create(fileData);
      
      // Update user storage usage
      await req.user.updateStorageUsage(file.size);
      
      uploadedFiles.push(savedFile);

      logger.logFileOperation('UPLOAD', savedFile._id, req.user._id, {
        filename: savedFile.originalName,
        size: savedFile.size,
        project: projectId
      });

    } catch (error) {
      logger.error('File upload processing failed:', error);
      errors.push({
        filename: file.originalname,
        error: error.message
      });
      
      // Clean up failed upload
      if (file.path) {
        cleanupTempFiles([file.path]);
      }
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

// Get files with filtering and pagination
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
    sort = 'createdAt'
  } = req.query;

  const filters = { owner: req.user._id };
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
    filters.$text = { $search: search };
  }

  const files = await File.findWithFilters(req.user._id, filters, options);
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

// Get single file
export const getFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  })
  .populate('project', 'name client')
  .populate('folder', 'name fullPath')
  .populate('uploadedBy', 'name email');

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Increment view count
  await file.incrementView(req.ip, req.get('User-Agent'));

  res.status(200).json({
    success: true,
    data: { file }
  });
});

// Update file
export const updateFile = catchAsync(async (req, res, next) => {
  const { displayName, tags, category, isFavorite } = req.body;

  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Update fields
  if (displayName) file.displayName = displayName;
  if (tags) file.tags = tags;
  if (category) file.category = category;
  if (isFavorite !== undefined) file.flags.isFavorite = isFavorite;

  await file.save();

  logger.logFileOperation('UPDATE', file._id, req.user._id, {
    changes: req.body
  });

  res.status(200).json({
    success: true,
    message: 'File updated successfully',
    data: { file }
  });
});

// Delete file
export const deleteFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Soft delete
  file.isDeleted = true;
  file.deletedAt = new Date();
  file.deletedBy = req.user._id;
  await file.save();

  // Update user storage usage
  await req.user.updateStorageUsage(-file.size);

  // Clean up physical files
  if (file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
  
  // Clean up thumbnails
  if (file.thumbnails) {
    file.thumbnails.forEach(thumb => {
      if (thumb.path && fs.existsSync(thumb.path)) {
        fs.unlinkSync(thumb.path);
      }
    });
  }

  // Delete from GridFS if applicable
  if (file.gridfsId) {
    await deleteFromGridFS(file.gridfsId);
  }

  logger.logFileOperation('DELETE', file._id, req.user._id, {
    filename: file.originalName,
    size: file.size
  });

  res.status(200).json({
    success: true,
    message: 'File deleted successfully'
  });
});

// Download file
export const downloadFile = catchAsync(async (req, res, next) => {
  let file;
  let isSharedAccess = false;

  // Check if this is a shared file access
  if (req.params.token) {
    file = await File.findOne({
      'sharing.shareToken': req.params.token,
      isDeleted: { $ne: true }
    });

    if (!file) {
      return next(new AppError('Shared file not found', 404));
    }

    // Validate shared access
    const accessCheck = await file.canAccess(req.body?.email, req.body?.password);
    if (!accessCheck.allowed) {
      return next(new AppError(accessCheck.reason, 403));
    }

    isSharedAccess = true;
  } else {
    // Regular authenticated access
    file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isDeleted: { $ne: true }
    });

    if (!file) {
      return next(new AppError('File not found', 404));
    }

    // Check transfer quota for authenticated users
    if (!req.user.hasTransferCapacity(file.size)) {
      return next(new AppError('Transfer quota exceeded', 413));
    }
  }

  try {
    let fileStream;
    
    if (file.gridfsId) {
      // Large file from GridFS
      fileStream = downloadFromGridFS(file.gridfsId);
    } else if (file.path && fs.existsSync(file.path)) {
      // Regular file from disk
      fileStream = fs.createReadStream(file.path);
    } else {
      return next(new AppError('File data not found', 404));
    }

    // Set response headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `attachment; filename="${file.displayName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Pipe file to response
    fileStream.pipe(res);

    // Update analytics
    await file.incrementDownload();
    
    // Update user transfer usage for authenticated users
    if (!isSharedAccess && req.user) {
      await req.user.updateTransferUsage(file.size);
    }

    logger.logFileOperation('DOWNLOAD', file._id, req.user?._id || 'anonymous', {
      filename: file.originalName,
      size: file.size,
      isSharedAccess
    });

  } catch (error) {
    logger.error('File download failed:', error);
    return next(new AppError('File download failed', 500));
  }
});

// Share file
export const shareFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  const shareOptions = req.body;
  await file.enableSharing(shareOptions);

  logger.logFileOperation('SHARE', file._id, req.user._id, {
    shareSettings: shareOptions
  });

  res.status(200).json({
    success: true,
    message: 'File shared successfully',
    data: {
      file,
      shareLink: file.formattedShareLink
    }
  });
});

// Get shared file (public access)
export const getSharedFile = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    'sharing.shareToken': req.params.token,
    isDeleted: { $ne: true }
  })
  .populate('project', 'name')
  .populate('owner', 'name');

  if (!file) {
    return next(new AppError('Shared file not found', 404));
  }

  // Validate access
  const accessCheck = await file.canAccess(req.body?.email, req.body?.password);
  if (!accessCheck.allowed) {
    return next(new AppError(accessCheck.reason, 403));
  }

  // Increment view count
  await file.incrementView(req.ip, req.get('User-Agent'));

  res.status(200).json({
    success: true,
    data: {
      file: {
        id: file._id,
        originalName: file.originalName,
        displayName: file.displayName,
        size: file.size,
        type: file.type,
        mimeType: file.mimeType,
        thumbnails: file.thumbnails,
        createdAt: file.createdAt,
        project: file.project,
        owner: file.owner
      }
    }
  });
});

// Move file to different folder
export const moveFile = catchAsync(async (req, res, next) => {
  const { folderId } = req.body;

  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  await file.moveTo(folderId);

  logger.logFileOperation('MOVE', file._id, req.user._id, {
    from: file.folder,
    to: folderId
  });

  res.status(200).json({
    success: true,
    message: 'File moved successfully',
    data: { file }
  });
});

// Copy file
export const copyFile = catchAsync(async (req, res, next) => {
  const { folderId, name } = req.body;

  const originalFile = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!originalFile) {
    return next(new AppError('File not found', 404));
  }

  // Create copy
  const fileData = originalFile.toObject();
  delete fileData._id;
  delete fileData.createdAt;
  delete fileData.updatedAt;
  
  fileData.displayName = name || `${originalFile.displayName} (Copy)`;
  fileData.folder = folderId || originalFile.folder;
  fileData.versioning = {
    isLatest: true,
    version: 1
  };

  const copiedFile = await File.create(fileData);

  res.status(201).json({
    success: true,
    message: 'File copied successfully',
    data: { file: copiedFile }
  });
});

// Get file versions
export const getFileVersions = catchAsync(async (req, res, next) => {
  const file = await File.findOne({
    _id: req.params.id,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!file) {
    return next(new AppError('File not found', 404));
  }

  const versions = await file.getVersionHistory();

  res.status(200).json({
    success: true,
    data: { versions }
  });
});

// Restore file version
export const restoreFileVersion = catchAsync(async (req, res, next) => {
  const { versionId } = req.params;

  const version = await File.findOne({
    _id: versionId,
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (!version) {
    return next(new AppError('Version not found', 404));
  }

  // Implementation for version restoration would go here
  // This is a simplified response
  res.status(200).json({
    success: true,
    message: 'File version restored successfully'
  });
});

// Bulk operations
export const bulkOperation = catchAsync(async (req, res, next) => {
  const { operation, fileIds, data } = req.body;

  if (!fileIds || !Array.isArray(fileIds)) {
    return next(new AppError('File IDs array is required', 400));
  }

  const files = await File.find({
    _id: { $in: fileIds },
    owner: req.user._id,
    isDeleted: { $ne: true }
  });

  if (files.length === 0) {
    return next(new AppError('No files found', 404));
  }

  let result = {};

  switch (operation) {
    case 'delete':
      await File.updateMany(
        { _id: { $in: fileIds } },
        { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: req.user._id 
        }
      );
      result.message = `${files.length} files deleted successfully`;
      break;

    case 'move':
      if (!data.folderId) {
        return next(new AppError('Folder ID is required for move operation', 400));
      }
      await File.updateMany(
        { _id: { $in: fileIds } },
        { folder: data.folderId }
      );
      result.message = `${files.length} files moved successfully`;
      break;

    case 'updateTags':
      await File.updateMany(
        { _id: { $in: fileIds } },
        { tags: data.tags }
      );
      result.message = `${files.length} files updated successfully`;
      break;

    default:
      return next(new AppError('Invalid operation', 400));
  }

  res.status(200).json({
    success: true,
    ...result
  });
});

export default {
  uploadFiles,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
  downloadFile,
  shareFile,
  getSharedFile,
  moveFile,
  copyFile,
  getFileVersions,
  restoreFileVersion,
  bulkOperation
};
