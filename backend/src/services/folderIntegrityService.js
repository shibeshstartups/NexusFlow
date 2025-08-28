import File from '../models/File.js';
import Folder from '../models/Folder.js';
import Project from '../models/Project.js';
import r2StorageService from './r2Storage.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorMiddleware.js';
import crypto from 'crypto';

/**
 * Folder Integrity Verification Service
 * Ensures data consistency, verifies file integrity, and handles corruption detection
 */
class FolderIntegrityService {
  constructor() {
    this.verificationQueue = new Map();
    this.repairQueue = new Map();
  }

  /**
   * Verify folder integrity including all files and subfolders
   * @param {string} folderId - Folder ID to verify
   * @param {string} userId - User ID for authentication
   * @param {Object} options - Verification options
   * @returns {Object} - Verification result
   */
  async verifyFolderIntegrity(folderId, userId, options = {}) {
    const verificationId = `verify_${folderId}_${Date.now()}`;
    
    try {
      logger.info('Starting folder integrity verification', { folderId, userId, verificationId });
      
      const {
        checkFiles = true,
        checkStorage = true,
        checkMetadata = true,
        checkPermissions = true,
        deepScan = false,
        autoRepair = false
      } = options;

      // Initialize verification report
      const report = {
        verificationId,
        folderId,
        userId,
        startTime: new Date(),
        status: 'running',
        results: {
          totalFolders: 0,
          totalFiles: 0,
          validFolders: 0,
          validFiles: 0,
          errors: [],
          warnings: [],
          repaired: []
        }
      };

      this.verificationQueue.set(verificationId, report);

      // 1. Verify folder structure
      const folderResult = await this.verifyFolderStructure(folderId, userId, report);
      
      if (checkFiles) {
        // 2. Verify all files in folder hierarchy
        await this.verifyFolderFiles(folderId, userId, report, { checkStorage, checkMetadata, deepScan });
      }
      
      if (checkPermissions) {
        // 3. Verify folder permissions and access
        await this.verifyFolderPermissions(folderId, userId, report);
      }
      
      // 4. Check for orphaned files
      await this.checkOrphanedFiles(folderId, userId, report);
      
      // 5. Auto-repair if requested
      if (autoRepair && report.results.errors.length > 0) {
        await this.autoRepairFolder(folderId, userId, report);
      }
      
      // Finalize report
      report.status = 'completed';
      report.endTime = new Date();
      report.duration = report.endTime - report.startTime;
      report.results.integrityScore = this.calculateIntegrityScore(report.results);
      
      logger.info('Folder integrity verification completed', {
        verificationId,
        duration: report.duration,
        integrityScore: report.results.integrityScore,
        errorsFound: report.results.errors.length
      });
      
      return report;
      
    } catch (error) {
      logger.error('Folder integrity verification failed:', error);
      const report = this.verificationQueue.get(verificationId);
      if (report) {
        report.status = 'failed';
        report.error = error.message;
        report.endTime = new Date();
      }
      throw new AppError(`Integrity verification failed: ${error.message}`, 500);
    }
  }

  /**
   * Verify folder structure consistency
   * @private
   */
  async verifyFolderStructure(folderId, userId, report) {
    try {
      const folder = await Folder.findOne({
        _id: folderId,
        owner: userId,
        isDeleted: { $ne: true }
      }).populate('parentFolder project');

      if (!folder) {
        report.results.errors.push({
          type: 'FOLDER_NOT_FOUND',
          message: `Folder ${folderId} not found or access denied`,
          severity: 'high'
        });
        return false;
      }

      report.results.totalFolders++;

      // Verify folder metadata consistency
      const issues = [];
      
      // Check parent relationship
      if (folder.parentFolder) {
        const parent = await Folder.findById(folder.parentFolder._id);
        if (!parent || parent.isDeleted) {
          issues.push({
            type: 'BROKEN_PARENT_LINK',
            message: `Parent folder reference is broken for folder ${folder.name}`,
            severity: 'high'
          });
        }
      }
      
      // Check project relationship
      if (folder.project) {
        const project = await Project.findById(folder.project._id);
        if (!project || project.isDeleted) {
          issues.push({
            type: 'BROKEN_PROJECT_LINK',
            message: `Project reference is broken for folder ${folder.name}`,
            severity: 'high'
          });
        }
      }
      
      // Verify fullPath consistency
      const expectedPath = await this.calculateExpectedPath(folder);
      if (folder.fullPath !== expectedPath) {
        issues.push({
          type: 'PATH_MISMATCH',
          message: `Folder path mismatch: expected "${expectedPath}", got "${folder.fullPath}"`,
          severity: 'medium',
          expected: expectedPath,
          actual: folder.fullPath
        });
      }
      
      // Verify level consistency
      const expectedLevel = await this.calculateExpectedLevel(folder);
      if (folder.level !== expectedLevel) {
        issues.push({
          type: 'LEVEL_MISMATCH',
          message: `Folder level mismatch: expected ${expectedLevel}, got ${folder.level}`,
          severity: 'low',
          expected: expectedLevel,
          actual: folder.level
        });
      }
      
      if (issues.length === 0) {
        report.results.validFolders++;
      } else {
        report.results.errors.push(...issues);
      }
      
      // Recursively verify subfolders
      const subfolders = await Folder.find({
        parentFolder: folderId,
        owner: userId,
        isDeleted: { $ne: true }
      });
      
      for (const subfolder of subfolders) {
        await this.verifyFolderStructure(subfolder._id, userId, report);
      }
      
      return issues.length === 0;
      
    } catch (error) {
      report.results.errors.push({
        type: 'VERIFICATION_ERROR',
        message: `Error verifying folder structure: ${error.message}`,
        severity: 'high'
      });
      return false;
    }
  }

  /**
   * Verify all files in folder hierarchy
   * @private
   */
  async verifyFolderFiles(folderId, userId, report, options) {
    try {
      const files = await this.getAllFolderFiles(folderId, userId);
      report.results.totalFiles += files.length;
      
      for (const file of files) {
        const fileValid = await this.verifyFileIntegrity(file, report, options);
        if (fileValid) {
          report.results.validFiles++;
        }
      }
      
    } catch (error) {
      report.results.errors.push({
        type: 'FILE_VERIFICATION_ERROR',
        message: `Error verifying folder files: ${error.message}`,
        severity: 'high'
      });
    }
  }

  /**
   * Verify individual file integrity
   * @private
   */
  async verifyFileIntegrity(file, report, options) {
    const issues = [];
    
    try {
      // 1. Verify file metadata
      if (options.checkMetadata) {
        if (!file.originalName || !file.filename) {
          issues.push({
            type: 'MISSING_METADATA',
            fileId: file._id,
            message: `File ${file._id} has missing name metadata`,
            severity: 'medium'
          });
        }
        
        if (!file.storage || !file.storage.key) {
          issues.push({
            type: 'MISSING_STORAGE_KEY',
            fileId: file._id,
            message: `File ${file._id} has missing storage key`,
            severity: 'high'
          });
        }
      }
      
      // 2. Verify storage existence and integrity
      if (options.checkStorage && file.storage && file.storage.key) {
        try {
          const storageMetadata = await r2StorageService.getFileMetadata(file.storage.key);
          
          if (!storageMetadata) {
            issues.push({
              type: 'STORAGE_FILE_MISSING',
              fileId: file._id,
              message: `Storage file missing for ${file.originalName}`,
              severity: 'high',
              storageKey: file.storage.key
            });
          } else {
            // Verify size consistency
            if (storageMetadata.size !== file.size) {
              issues.push({
                type: 'SIZE_MISMATCH',
                fileId: file._id,
                message: `File size mismatch: DB=${file.size}, Storage=${storageMetadata.size}`,
                severity: 'high',
                dbSize: file.size,
                storageSize: storageMetadata.size
              });
            }
          }
        } catch (storageError) {
          issues.push({
            type: 'STORAGE_ACCESS_ERROR',
            fileId: file._id,
            message: `Cannot access storage for ${file.originalName}: ${storageError.message}`,
            severity: 'high'
          });
        }
      }
      
      // 3. Deep integrity check (checksum verification)
      if (options.deepScan && file.checksum && file.storage && file.storage.key) {
        try {
          const fileData = await r2StorageService.downloadFile(file.storage.key);
          const calculatedChecksum = crypto.createHash('md5').update(fileData.buffer).digest('hex');
          
          if (calculatedChecksum !== file.checksum) {
            issues.push({
              type: 'CHECKSUM_MISMATCH',
              fileId: file._id,
              message: `File checksum mismatch: ${file.originalName}`,
              severity: 'critical',
              storedChecksum: file.checksum,
              calculatedChecksum
            });
          }
        } catch (checksumError) {
          issues.push({
            type: 'CHECKSUM_VERIFICATION_ERROR',
            fileId: file._id,
            message: `Cannot verify checksum for ${file.originalName}: ${checksumError.message}`,
            severity: 'medium'
          });
        }
      }
      
      if (issues.length > 0) {
        report.results.errors.push(...issues);
        return false;
      }
      
      return true;
      
    } catch (error) {
      report.results.errors.push({
        type: 'FILE_INTEGRITY_ERROR',
        fileId: file._id,
        message: `Error verifying file integrity: ${error.message}`,
        severity: 'high'
      });
      return false;
    }
  }

  /**
   * Verify folder permissions and access
   * @private
   */
  async verifyFolderPermissions(folderId, userId, report) {
    try {
      const folder = await Folder.findById(folderId);
      
      if (!folder) {
        report.results.errors.push({
          type: 'FOLDER_ACCESS_ERROR',
          message: `Cannot access folder for permission verification`,
          severity: 'high'
        });
        return;
      }
      
      // Verify ownership
      if (folder.owner.toString() !== userId) {
        report.results.errors.push({
          type: 'OWNERSHIP_MISMATCH',
          message: `Folder ownership mismatch for ${folder.name}`,
          severity: 'high',
          expected: userId,
          actual: folder.owner.toString()
        });
      }
      
      // Verify project permissions
      if (folder.project) {
        const project = await Project.findById(folder.project);
        if (project && project.owner.toString() !== userId) {
          report.results.warnings.push({
            type: 'PROJECT_PERMISSION_WARNING',
            message: `Folder belongs to project with different owner`,
            severity: 'low'
          });
        }
      }
      
    } catch (error) {
      report.results.errors.push({
        type: 'PERMISSION_VERIFICATION_ERROR',
        message: `Error verifying permissions: ${error.message}`,
        severity: 'medium'
      });
    }
  }

  /**
   * Check for orphaned files (files with invalid folder references)
   * @private
   */
  async checkOrphanedFiles(folderId, userId, report) {
    try {
      // Find files that reference non-existent folders
      const orphanedFiles = await File.aggregate([
        {
          $match: {
            owner: userId,
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
      
      for (const orphaned of orphanedFiles) {
        report.results.errors.push({
          type: 'ORPHANED_FILE',
          fileId: orphaned._id,
          message: `File "${orphaned.originalName}" references non-existent folder`,
          severity: 'medium',
          referencedFolder: orphaned.folder
        });
      }
      
    } catch (error) {
      report.results.errors.push({
        type: 'ORPHAN_CHECK_ERROR',
        message: `Error checking for orphaned files: ${error.message}`,
        severity: 'medium'
      });
    }
  }

  /**
   * Auto-repair detected issues
   * @private
   */
  async autoRepairFolder(folderId, userId, report) {
    const repairedItems = [];
    
    try {
      for (const error of report.results.errors) {
        switch (error.type) {
          case 'PATH_MISMATCH':
            if (error.expected && error.actual) {
              await Folder.updateOne(
                { _id: folderId },
                { $set: { fullPath: error.expected } }
              );
              repairedItems.push({
                type: 'PATH_REPAIR',
                message: `Fixed path mismatch for folder`,
                oldValue: error.actual,
                newValue: error.expected
              });
            }
            break;
            
          case 'LEVEL_MISMATCH':
            if (typeof error.expected === 'number') {
              await Folder.updateOne(
                { _id: folderId },
                { $set: { level: error.expected } }
              );
              repairedItems.push({
                type: 'LEVEL_REPAIR',
                message: `Fixed level mismatch for folder`,
                oldValue: error.actual,
                newValue: error.expected
              });
            }
            break;
            
          case 'ORPHANED_FILE':
            // Move orphaned files to root folder or designated recovery folder
            await File.updateOne(
              { _id: error.fileId },
              { $unset: { folder: 1 } }
            );
            repairedItems.push({
              type: 'ORPHAN_REPAIR',
              message: `Moved orphaned file to root`,
              fileId: error.fileId
            });
            break;
        }
      }
      
      report.results.repaired = repairedItems;
      
      logger.info('Auto-repair completed', {
        folderId,
        repairedCount: repairedItems.length
      });
      
    } catch (repairError) {
      logger.error('Auto-repair failed:', repairError);
      report.results.warnings.push({
        type: 'REPAIR_ERROR',
        message: `Auto-repair failed: ${repairError.message}`,
        severity: 'medium'
      });
    }
  }

  /**
   * Get all files in folder recursively
   * @private
   */
  async getAllFolderFiles(folderId, userId) {
    const files = [];
    
    // Get direct files
    const directFiles = await File.find({
      folder: folderId,
      owner: userId,
      isDeleted: { $ne: true }
    });
    
    files.push(...directFiles);
    
    // Get files from subfolders recursively
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
   * Calculate expected folder path
   * @private
   */
  async calculateExpectedPath(folder) {
    if (!folder.parentFolder) {
      return folder.name;
    }
    
    const parent = await Folder.findById(folder.parentFolder);
    if (!parent) {
      return folder.name;
    }
    
    const parentPath = await this.calculateExpectedPath(parent);
    return `${parentPath}/${folder.name}`;
  }

  /**
   * Calculate expected folder level
   * @private
   */
  async calculateExpectedLevel(folder) {
    if (!folder.parentFolder) {
      return 0;
    }
    
    const parent = await Folder.findById(folder.parentFolder);
    if (!parent) {
      return 0;
    }
    
    return parent.level + 1;
  }

  /**
   * Calculate integrity score based on verification results
   * @private
   */
  calculateIntegrityScore(results) {
    const totalItems = results.totalFolders + results.totalFiles;
    if (totalItems === 0) return 100;
    
    const validItems = results.validFolders + results.validFiles;
    const criticalErrors = results.errors.filter(e => e.severity === 'critical').length;
    const highErrors = results.errors.filter(e => e.severity === 'high').length;
    const mediumErrors = results.errors.filter(e => e.severity === 'medium').length;
    
    let score = (validItems / totalItems) * 100;
    
    // Penalize based on error severity
    score -= (criticalErrors * 20);
    score -= (highErrors * 10);
    score -= (mediumErrors * 5);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get verification status
   */
  getVerificationStatus(verificationId) {
    return this.verificationQueue.get(verificationId) || null;
  }

  /**
   * Cleanup old verification reports
   */
  cleanupOldVerifications() {
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    for (const [id, verification] of this.verificationQueue.entries()) {
      if (verification.startTime < cutoffTime) {
        this.verificationQueue.delete(id);
      }
    }
  }
}

// Singleton instance
const folderIntegrityService = new FolderIntegrityService();

// Cleanup old verifications every hour
setInterval(() => {
  folderIntegrityService.cleanupOldVerifications();
}, 60 * 60 * 1000);

export default folderIntegrityService;
