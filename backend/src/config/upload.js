import multer from 'multer';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { AppError } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
const tempDir = process.env.TEMP_PATH || './temp';
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const previewsDir = path.join(uploadsDir, 'previews');

[uploadsDir, tempDir, thumbnailsDir, previewsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
      'video/x-ms-wmv',
      'video/webm',
      'video/x-flv'
    ],
    extensions: ['.mp4', '.mpeg', '.mpg', '.mov', '.avi', '.wmv', '.webm', '.flv'],
    maxSize: 5 * 1024 * 1024 * 1024 // 5GB
  },
  audio: {
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/aac',
      'audio/ogg',
      'audio/webm'
    ],
    extensions: ['.mp3', '.wav', '.aac', '.ogg', '.weba'],
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
      'text/rtf'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  archive: {
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip'
    ],
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    maxSize: 1 * 1024 * 1024 * 1024 // 1GB
  }
};

// Determine file type
export const getFileType = (mimetype, filename) => {
  const extension = path.extname(filename).toLowerCase();
  
  for (const [type, config] of Object.entries(fileTypes)) {
    if (config.mimeTypes.includes(mimetype) || config.extensions.includes(extension)) {
      return type;
    }
  }
  
  return 'other';
};

// Validate file
export const validateFile = (file, user) => {
  const fileType = getFileType(file.mimetype, file.originalname);
  const typeConfig = fileTypes[fileType];
  
  // Check if file type is allowed
  if (!typeConfig && fileType === 'other') {
    throw new AppError('File type not allowed', 400);
  }
  
  // Check file size
  const maxSize = typeConfig?.maxSize || 50 * 1024 * 1024; // Default 50MB
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    throw new AppError(`File too large. Maximum size for ${fileType} files is ${maxSizeMB}MB`, 413);
  }
  
  // Check user storage quota
  if (!user.hasStorageCapacity(file.size)) {
    throw new AppError('Storage quota exceeded', 413);
  }
  
  return { fileType, typeConfig };
};

// Generate file checksum
export const generateChecksum = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

// Storage configuration for regular files (< 100MB)
const regularStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory
    const userDir = path.join(uploadsDir, req.user._id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${extension}`);
  }
});

// GridFS configuration for large files (>= 100MB)
let gridFSBucket;
mongoose.connection.once('open', () => {
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});

// File filter
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

// Configure multer for different scenarios
const createMulterConfig = (options = {}) => {
  const {
    maxFileSize = 5 * 1024 * 1024 * 1024, // 5GB
    maxFiles = 50,
    useGridFS = false
  } = options;
  
  return multer({
    storage: useGridFS ? multer.memoryStorage() : regularStorage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fieldSize: 1024 * 1024 // 1MB for field data
    }
  });
};

// Single file upload
export const uploadSingle = (fieldName = 'file') => {
  const upload = createMulterConfig({ maxFiles: 1 });
  return upload.single(fieldName);
};

// Multiple files upload
export const uploadMultiple = (fieldName = 'files', maxCount = 50) => {
  const upload = createMulterConfig();
  return upload.array(fieldName, maxCount);
};

// Mixed files upload (multiple fields)
export const uploadFields = (fields) => {
  const upload = createMulterConfig();
  return upload.fields(fields);
};

// Large file upload using GridFS
export const uploadLargeFile = (fieldName = 'file') => {
  const upload = createMulterConfig({ 
    useGridFS: true,
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024 * 1024 // 5GB
  });
  return upload.single(fieldName);
};

// Process uploaded file
export const processUploadedFile = async (file, options = {}) => {
  const {
    projectId,
    folderId,
    userId,
    generateThumbnails = true,
    extractMetadata = true
  } = options;
  
  try {
    const fileType = getFileType(file.mimetype, file.originalname);
    let filePath = file.path;
    let gridfsId = null;
    
    // Handle large files with GridFS
    if (file.size >= 100 * 1024 * 1024 && file.buffer) { // 100MB threshold
      gridfsId = await uploadToGridFS(file, userId);
      filePath = null; // File is stored in GridFS, not on disk
    }
    
    // Generate checksum
    let checksum;
    if (filePath) {
      checksum = await generateChecksum(filePath);
    } else {
      checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    }
    
    // Create file document
    const fileData = {
      filename: file.filename || `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`,
      originalName: file.originalname,
      displayName: file.originalname,
      path: filePath,
      relativePath: filePath ? path.relative(uploadsDir, filePath) : null,
      owner: userId,
      project: projectId,
      folder: folderId,
      type: fileType,
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
      size: file.size,
      checksum,
      gridfsId,
      uploadedBy: userId,
      processing: {
        status: 'pending'
      }
    };
    
    // Extract metadata
    if (extractMetadata) {
      fileData.metadata = await extractFileMetadata(file, fileType);
    }
    
    // Generate thumbnails
    if (generateThumbnails && (fileType === 'image' || fileType === 'video')) {
      try {
        fileData.thumbnails = await generateThumbnails(file, fileType, userId);
        fileData.processing.thumbnailGenerated = true;
      } catch (error) {
        logger.error('Thumbnail generation failed:', error);
      }
    }
    
    fileData.processing.status = 'completed';
    fileData.processing.metadataExtracted = extractMetadata;
    
    return fileData;
    
  } catch (error) {
    logger.error('File processing failed:', error);
    throw new AppError('File processing failed: ' + error.message, 500);
  }
};

// Upload file to GridFS
const uploadToGridFS = (file, userId) => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      return reject(new Error('GridFS not initialized'));
    }
    
    const uploadStream = gridFSBucket.openUploadStream(file.originalname, {
      metadata: {
        userId: userId.toString(),
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadDate: new Date()
      }
    });
    
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    
    uploadStream.end(file.buffer);
  });
};

// Extract file metadata
const extractFileMetadata = async (file, fileType) => {
  const metadata = {};
  
  try {
    switch (fileType) {
      case 'image':
        if (file.path) {
          const imageInfo = await sharp(file.path).metadata();
          metadata.dimensions = {
            width: imageInfo.width,
            height: imageInfo.height
          };
          // Extract EXIF data if available
          if (imageInfo.exif) {
            // You can use exif-reader or similar library to parse EXIF
            metadata.exif = {
              // Add EXIF data parsing here
            };
          }
        }
        break;
        
      case 'video':
        if (file.path) {
          metadata.video = await extractVideoMetadata(file.path);
        }
        break;
        
      case 'audio':
        if (file.path) {
          metadata.audio = await extractAudioMetadata(file.path);
        }
        break;
        
      default:
        // For other file types, basic metadata is sufficient
        break;
    }
  } catch (error) {
    logger.error('Metadata extraction failed:', error);
  }
  
  return metadata;
};

// Extract video metadata using ffprobe
const extractVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({
          duration: parseFloat(metadata.format.duration),
          bitrate: parseInt(metadata.format.bit_rate),
          ...(videoStream && {
            dimensions: {
              width: videoStream.width,
              height: videoStream.height
            },
            framerate: eval(videoStream.r_frame_rate), // Convert fraction to decimal
            codec: videoStream.codec_name
          }),
          ...(audioStream && {
            audioCodec: audioStream.codec_name,
            sampleRate: audioStream.sample_rate
          })
        });
      }
    });
  });
};

// Extract audio metadata
const extractAudioMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({
          duration: parseFloat(metadata.format.duration),
          bitrate: parseInt(metadata.format.bit_rate),
          ...(audioStream && {
            codec: audioStream.codec_name,
            sampleRate: audioStream.sample_rate,
            channels: audioStream.channels
          }),
          // Extract tags if available
          ...(metadata.format.tags && {
            title: metadata.format.tags.title,
            artist: metadata.format.tags.artist,
            album: metadata.format.tags.album,
            genre: metadata.format.tags.genre
          })
        });
      }
    });
  });
};

// Generate thumbnails
const generateThumbnails = async (file, fileType, userId) => {
  const thumbnails = [];
  const sizes = [
    { name: 'small', size: 150 },
    { name: 'medium', size: 300 },
    { name: 'large', size: 600 }
  ];
  
  const userThumbnailDir = path.join(thumbnailsDir, userId.toString());
  if (!fs.existsSync(userThumbnailDir)) {
    fs.mkdirSync(userThumbnailDir, { recursive: true });
  }
  
  try {
    if (fileType === 'image' && file.path) {
      for (const sizeConfig of sizes) {
        const thumbnailPath = path.join(
          userThumbnailDir,
          `${path.parse(file.filename).name}_${sizeConfig.name}.jpg`
        );
        
        const info = await sharp(file.path)
          .resize(sizeConfig.size, sizeConfig.size, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toFile(thumbnailPath);
        
        thumbnails.push({
          size: sizeConfig.name,
          path: thumbnailPath,
          filename: path.basename(thumbnailPath),
          dimensions: {
            width: info.width,
            height: info.height
          }
        });
      }
    } else if (fileType === 'video' && file.path) {
      // Generate video thumbnails using ffmpeg
      for (const sizeConfig of sizes) {
        const thumbnailPath = path.join(
          userThumbnailDir,
          `${path.parse(file.filename).name}_${sizeConfig.name}.jpg`
        );
        
        await generateVideoThumbnail(file.path, thumbnailPath, sizeConfig.size);
        
        // Get thumbnail dimensions
        const info = await sharp(thumbnailPath).metadata();
        
        thumbnails.push({
          size: sizeConfig.name,
          path: thumbnailPath,
          filename: path.basename(thumbnailPath),
          dimensions: {
            width: info.width,
            height: info.height
          }
        });
      }
    }
  } catch (error) {
    logger.error('Thumbnail generation error:', error);
    throw error;
  }
  
  return thumbnails;
};

// Generate video thumbnail
const generateVideoThumbnail = (videoPath, outputPath, size) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', resolve)
      .on('error', reject)
      .screenshots({
        timestamps: ['5%'], // Take screenshot at 5% of video duration
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${size}x${size}`
      });
  });
};

// Download file from GridFS
export const downloadFromGridFS = (fileId) => {
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized');
  }
  
  return gridFSBucket.openDownloadStream(fileId);
};

// Delete file from GridFS
export const deleteFromGridFS = async (fileId) => {
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized');
  }
  
  try {
    await gridFSBucket.delete(fileId);
    return true;
  } catch (error) {
    logger.error('GridFS file deletion failed:', error);
    return false;
  }
};

// Clean up temporary files
export const cleanupTempFiles = (filePaths) => {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }
  
  filePaths.forEach(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.error('Failed to cleanup temp file:', error);
      }
    }
  });
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadLargeFile,
  processUploadedFile,
  validateFile,
  getFileType,
  generateChecksum,
  downloadFromGridFS,
  deleteFromGridFS,
  cleanupTempFiles,
  fileTypes
};