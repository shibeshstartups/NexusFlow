import archiver from 'archiver';
import { PassThrough } from 'stream';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import r2StorageService from './r2Storage.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorMiddleware.js';
import path from 'path';

/**
 * Bulk Download Service for creating ZIP files from multiple files/folders
 */
class BulkDownloadService {
  constructor() {
    this.activeDownloads = new Map(); // Track active downloads
    this.maxConcurrentDownloads = 10;
  }

  /**
   * Create ZIP stream for folder download
   * @param {string} folderId - Folder ID to download
   * @param {string} userId - User ID for authentication
   * @param {Object} options - Additional options
   * @returns {Object} - ZIP stream and metadata
   */
  async createFolderZipStream(folderId, userId, options = {}) {
    const downloadId = `folder_${folderId}_${Date.now()}`;
    
    try {
      // Verify folder access
      const folder = await Folder.findOne({
        _id: folderId,
        owner: userId,
        isDeleted: { $ne: true }
      });

      if (!folder) {
        throw new AppError('Folder not found or access denied', 404);
      }

      // Get all files in folder and subfolders
      const files = await this.getAllFolderFiles(folderId, userId);
      
      if (files.length === 0) {
        throw new AppError('No files found in folder', 404);
      }

      // Calculate total size for progress tracking
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const estimatedZipSize = Math.ceil(totalSize * 0.8); // Estimate 20% compression

      // Create ZIP stream
      const zipStream = await this.createZipStreamFromFiles(files, {
        folderName: folder.name,
        downloadId,
        ...options
      });

      // Track download
      this.activeDownloads.set(downloadId, {
        type: 'folder',
        folderId,
        userId,
        totalFiles: files.length,
        totalSize,
        estimatedZipSize,
        startTime: new Date(),
        status: 'active'
      });

      return {
        stream: zipStream,
        downloadId,
        filename: `${folder.name}.zip`,
        totalFiles: files.length,
        estimatedSize: estimatedZipSize,
        metadata: {
          folderName: folder.name,
          createdAt: folder.createdAt,
          totalFiles: files.length
        }
      };

    } catch (error) {
      logger.error('Folder ZIP creation failed:', error);
      this.activeDownloads.delete(downloadId);
      throw error;
    }
  }

  /**
   * Create ZIP stream for multiple selected files
   * @param {Array} fileIds - Array of file IDs to download
   * @param {string} userId - User ID for authentication
   * @param {Object} options - Additional options
   * @returns {Object} - ZIP stream and metadata
   */
  async createFilesZipStream(fileIds, userId, options = {}) {
    const downloadId = `files_${fileIds.join('_').substring(0, 20)}_${Date.now()}`;
    
    try {
      // Verify file access
      const files = await File.find({
        _id: { $in: fileIds },
        owner: userId,
        isDeleted: { $ne: true }
      }).populate('folder', 'name fullPath');

      if (files.length === 0) {
        throw new AppError('No files found or access denied', 404);
      }

      if (files.length !== fileIds.length) {
        logger.warn(`Some files not found. Requested: ${fileIds.length}, Found: ${files.length}`);
      }

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const estimatedZipSize = Math.ceil(totalSize * 0.8);

      // Create ZIP stream
      const zipStream = await this.createZipStreamFromFiles(files, {
        archiveName: options.archiveName || 'selected_files',
        downloadId,
        ...options
      });

      // Track download
      this.activeDownloads.set(downloadId, {
        type: 'files',
        fileIds,
        userId,
        totalFiles: files.length,
        totalSize,
        estimatedZipSize,
        startTime: new Date(),
        status: 'active'
      });

      return {
        stream: zipStream,
        downloadId,
        filename: `${options.archiveName || 'selected_files'}.zip`,
        totalFiles: files.length,
        estimatedSize: estimatedZipSize,
        metadata: {
          archiveName: options.archiveName || 'selected_files',
          totalFiles: files.length,
          fileList: files.map(f => f.originalName)
        }
      };

    } catch (error) {
      logger.error('Files ZIP creation failed:', error);
      this.activeDownloads.delete(downloadId);
      throw error;
    }
  }

  /**
   * Create ZIP stream for project download
   * @param {string} projectId - Project ID to download
   * @param {string} userId - User ID for authentication
   * @param {Object} options - Additional options
   * @returns {Object} - ZIP stream and metadata
   */
  async createProjectZipStream(projectId, userId, options = {}) {
    const downloadId = `project_${projectId}_${Date.now()}`;
    
    try {
      // Get all project files
      const files = await File.find({
        project: projectId,
        owner: userId,
        isDeleted: { $ne: true }
      }).populate('folder', 'name fullPath');

      if (files.length === 0) {
        throw new AppError('No files found in project', 404);
      }

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const estimatedZipSize = Math.ceil(totalSize * 0.8);

      // Group files by folder structure
      const filesByFolder = this.groupFilesByFolderStructure(files);

      // Create ZIP stream with folder structure
      const zipStream = await this.createZipStreamFromFiles(files, {
        archiveName: options.projectName || 'project',
        downloadId,
        preserveFolderStructure: true,
        filesByFolder,
        ...options
      });

      // Track download
      this.activeDownloads.set(downloadId, {
        type: 'project',
        projectId,
        userId,
        totalFiles: files.length,
        totalSize,
        estimatedZipSize,
        startTime: new Date(),
        status: 'active'
      });

      return {
        stream: zipStream,
        downloadId,
        filename: `${options.projectName || 'project'}.zip`,
        totalFiles: files.length,
        estimatedSize: estimatedZipSize,
        metadata: {
          projectName: options.projectName || 'project',
          totalFiles: files.length,
          folderCount: Object.keys(filesByFolder).length
        }
      };

    } catch (error) {
      logger.error('Project ZIP creation failed:', error);
      this.activeDownloads.delete(downloadId);
      throw error;
    }
  }

  /**
   * Create ZIP stream from files array with enhanced error handling
   * @private
   */
  async createZipStreamFromFiles(files, options = {}) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 6 }, // Balanced compression level
        forceLocalTime: true,
        comment: `Generated by NexusFlow on ${new Date().toISOString()}`
      });

      const passThrough = new PassThrough();
      
      // Enhanced error tracking
      const errorLog = {
        corruptedFiles: [],
        missingFiles: [],
        networkErrors: [],
        totalErrors: 0
      };
      
      let processedFiles = 0;
      let processedBytes = 0;
      let hasErrors = false;
      
      // Pipe archive to passthrough stream
      archive.pipe(passThrough);

      // Enhanced progress tracking with error reporting
      archive.on('progress', (progress) => {
        if (options.onProgress) {
          options.onProgress({
            downloadId: options.downloadId,
            processedFiles,
            totalFiles: files.length,
            processedBytes: progress.fs.processedBytes || processedBytes,
            totalBytes: progress.fs.totalBytes || 0,
            percentage: Math.round((processedFiles / files.length) * 100),
            errors: errorLog.totalErrors,
            hasErrors
          });
        }
      });

      archive.on('error', (error) => {
        logger.error('Archive creation error:', error);
        
        // Update download status with error information
        this.updateDownloadStatus(options.downloadId, 'failed', {
          error: error.message,
          errorLog,
          failedAt: new Date()
        });
        
        this.cleanupDownload(options.downloadId);
        reject(new AppError(`Archive creation failed: ${error.message}`, 500));
      });

      archive.on('warning', (warning) => {
        logger.warn('Archive warning:', warning);
        hasErrors = true;
        errorLog.totalErrors++;
        
        // Continue processing despite warnings
        if (warning.code === 'ENOENT') {
          errorLog.missingFiles.push(warning.data);
        } else {
          errorLog.networkErrors.push(warning);
        }
      });

      archive.on('end', () => {
        const totalBytes = archive.pointer();
        logger.info(`Archive created successfully. Total bytes: ${totalBytes}, Errors: ${errorLog.totalErrors}`);
        
        // Update status with completion info including any errors
        this.updateDownloadStatus(options.downloadId, 'completed', {
          totalBytes,
          errorLog,
          completedAt: new Date(),
          hasErrors
        });
      });

      // Add files to archive with enhanced error handling
      this.addFilesToArchiveWithRetry(archive, files, options, errorLog)
        .then(() => {
          // Always finalize, even if some files failed
          archive.finalize();
          resolve(passThrough);
        })
        .catch((error) => {
          logger.error('Fatal error adding files to archive:', error);
          this.updateDownloadStatus(options.downloadId, 'failed', {
            error: error.message,
            errorLog,
            failedAt: new Date()
          });
          this.cleanupDownload(options.downloadId);
          reject(error);
        });
    });
  }

  /**
   * Add files to archive with proper folder structure
   * @private
   */
  async addFilesToArchive(archive, files, options = {}) {
    const { preserveFolderStructure = false, filesByFolder = null } = options;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Get file stream from R2
        const fileStream = await r2StorageService.downloadFileStream(file.storage.key);
        
        // Determine file path in archive
        let archivePath = this.sanitizeFileName(file.originalName);
        
        if (preserveFolderStructure && file.folder) {
          const folderPath = file.folder.fullPath || file.folder.name || '';
          archivePath = path.posix.join(folderPath, archivePath);
        }

        // Add file to archive
        archive.append(fileStream, { 
          name: archivePath,
          date: file.createdAt || new Date()
        });

        // Update progress
        if (options.onProgress) {
          options.onProgress({
            downloadId: options.downloadId,
            processedFiles: i + 1,
            totalFiles: files.length,
            currentFile: file.originalName,
            percentage: Math.round(((i + 1) / files.length) * 100)
          });
        }

        logger.debug(`Added file to archive: ${archivePath}`);

      } catch (error) {
        logger.error(`Failed to add file ${file.originalName} to archive:`, error);
        
        // Add error placeholder file instead of failing entire archive
        archive.append(
          `Error downloading file: ${error.message}`, 
          { 
            name: `ERROR_${this.sanitizeFileName(file.originalName)}.txt`,
            date: new Date()
          }
        );
      }
    }
  }

  /**
   * Add files to archive with retry logic and enhanced error handling
   * @private
   */
  async addFilesToArchiveWithRetry(archive, files, options = {}, errorLog = null) {
    const { 
      preserveFolderStructure = false, 
      filesByFolder = null,
      maxRetries = 3,
      retryDelay = 1000
    } = options;
    
    const processFile = async (file, retryCount = 0) => {
      try {
        // Validate file before processing
        if (!file || !file.storage || !file.storage.key) {
          throw new Error('Invalid file metadata');
        }

        // Check if file exists in storage first
        const fileExists = await r2StorageService.getFileMetadata(file.storage.key);
        if (!fileExists) {
          throw new Error('File not found in storage');
        }

        // Get file stream from R2 with timeout
        const fileStream = await Promise.race([
          r2StorageService.downloadFileStream(file.storage.key),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Download timeout')), 30000)
          )
        ]);
        
        // Determine file path in archive
        let archivePath = this.sanitizeFileName(file.originalName);
        
        if (preserveFolderStructure && file.folder) {
          const folderPath = file.folder.fullPath || file.folder.name || '';
          archivePath = path.posix.join(folderPath, archivePath);
        }

        // Ensure unique paths in case of duplicates
        let uniquePath = archivePath;
        let counter = 1;
        while (archive._entries && archive._entries.some(entry => entry.name === uniquePath)) {
          const ext = path.extname(archivePath);
          const basename = path.basename(archivePath, ext);
          const dirname = path.dirname(archivePath);
          uniquePath = path.posix.join(
            dirname === '.' ? '' : dirname,
            `${basename}_${counter}${ext}`
          );
          counter++;
        }

        // Add file to archive with error handling on stream
        return new Promise((resolve, reject) => {
          let streamErrorHandled = false;
          
          fileStream.on('error', (streamError) => {
            if (!streamErrorHandled) {
              streamErrorHandled = true;
              reject(new Error(`Stream error: ${streamError.message}`));
            }
          });
          
          fileStream.on('end', () => {
            resolve();
          });
          
          archive.append(fileStream, { 
            name: uniquePath,
            date: file.createdAt || new Date()
          });
        });
        
      } catch (error) {
        if (retryCount < maxRetries) {
          logger.warn(`Retrying file ${file.originalName}, attempt ${retryCount + 1}/${maxRetries}:`, error.message);
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount)));
          
          return processFile(file, retryCount + 1);
        } else {
          // Final failure - log and create error placeholder
          logger.error(`Final failure for file ${file.originalName}:`, error);
          
          if (errorLog) {
            errorLog.totalErrors++;
            errorLog.corruptedFiles.push({
              filename: file.originalName,
              error: error.message,
              fileId: file._id
            });
          }
          
          // Create error placeholder file
          const errorContent = [
            `Failed to include file: ${file.originalName}`,
            `Error: ${error.message}`,
            `File ID: ${file._id}`,
            `Original Size: ${file.size} bytes`,
            `Storage Key: ${file.storage?.key || 'unknown'}`,
            `Timestamp: ${new Date().toISOString()}`,
            '',
            'This file could not be included in the archive due to the error above.',
            'Please check the file integrity and try downloading it individually.'
          ].join('\n');
          
          const errorPath = `_ERRORS/FAILED_${this.sanitizeFileName(file.originalName)}.txt`;
          
          archive.append(errorContent, { 
            name: errorPath,
            date: new Date()
          });
          
          // Don't throw - continue with other files
          return null;
        }
      }
    };
    
    // Process files with controlled concurrency
    const concurrencyLimit = 5;
    const chunks = [];
    for (let i = 0; i < files.length; i += concurrencyLimit) {
      chunks.push(files.slice(i, i + concurrencyLimit));
    }
    
    let processedCount = 0;
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        const result = await processFile(file);
        processedCount++;
        
        // Update progress
        if (options.onProgress) {
          options.onProgress({
            downloadId: options.downloadId,
            processedFiles: processedCount,
            totalFiles: files.length,
            currentFile: file.originalName,
            percentage: Math.round((processedCount / files.length) * 100),
            errors: errorLog?.totalErrors || 0
          });
        }
        
        return result;
      });
      
      // Wait for current chunk to complete before starting next
      await Promise.allSettled(chunkPromises);
    }
    
    logger.info(`Archive processing completed. Total files: ${files.length}, Errors: ${errorLog?.totalErrors || 0}`);
  }

  /**
   * Get all files in folder and subfolders recursively
   * @public - Made public for use in controllers
   */
  async getAllFolderFiles(folderId, userId) {
    const files = [];
    
    // Get direct files in folder
    const directFiles = await File.find({
      folder: folderId,
      owner: userId,
      isDeleted: { $ne: true }
    }).populate('folder', 'name fullPath');
    
    files.push(...directFiles);

    // Get subfolders and their files recursively
    const subfolders = await Folder.find({
      parentFolder: folderId,
      owner: userId,
      isDeleted: { $ne: true }
    });

    for (const subfolder of subfolders) {
      const subfolderFiles = await this.getAllFolderFiles(subfolder._id, userId);
      files.push(...subfolderFiles);
    }

    return files;
  }

  /**
   * Group files by folder structure for organized ZIP
   * @private
   */
  groupFilesByFolderStructure(files) {
    const grouped = {};
    
    files.forEach(file => {
      const folderPath = file.folder?.fullPath || 'root';
      if (!grouped[folderPath]) {
        grouped[folderPath] = [];
      }
      grouped[folderPath].push(file);
    });

    return grouped;
  }

  /**
   * Sanitize filename for ZIP archive
   * @private
   */
  sanitizeFileName(filename) {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Remove invalid chars
      .replace(/^\./, '_') // Replace leading dot
      .substring(0, 255); // Limit length
  }

  /**
   * Get download status
   */
  getDownloadStatus(downloadId) {
    return this.activeDownloads.get(downloadId) || null;
  }

  /**
   * Update download status
   * @private
   */
  updateDownloadStatus(downloadId, status, additionalData = {}) {
    const download = this.activeDownloads.get(downloadId);
    if (download) {
      download.status = status;
      download.lastUpdate = new Date();
      Object.assign(download, additionalData);
    }
  }

  /**
   * Cleanup download tracking
   * @private
   */
  cleanupDownload(downloadId) {
    if (downloadId && this.activeDownloads.has(downloadId)) {
      this.activeDownloads.delete(downloadId);
      logger.debug(`Cleaned up download: ${downloadId}`);
    }
  }

  /**
   * Cleanup old downloads (older than 1 hour)
   */
  cleanupOldDownloads() {
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    for (const [downloadId, download] of this.activeDownloads.entries()) {
      if (download.startTime < cutoffTime) {
        this.activeDownloads.delete(downloadId);
        logger.debug(`Cleaned up old download: ${downloadId}`);
      }
    }
  }

  /**
   * Get active downloads count
   */
  getActiveDownloadsCount() {
    return this.activeDownloads.size;
  }

  /**
   * Check if user has too many concurrent downloads
   */
  canUserStartDownload(userId) {
    const userDownloads = Array.from(this.activeDownloads.values())
      .filter(download => download.userId === userId && download.status === 'active');
    
    return userDownloads.length < this.maxConcurrentDownloads;
  }
}

// Create singleton instance
const bulkDownloadService = new BulkDownloadService();

// Cleanup old downloads every 30 minutes
setInterval(() => {
  bulkDownloadService.cleanupOldDownloads();
}, 30 * 60 * 1000);

export default bulkDownloadService;
