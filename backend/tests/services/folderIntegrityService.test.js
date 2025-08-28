import { jest } from '@jest/globals';
import folderIntegrityService from '../../src/services/folderIntegrityService.js';
import File from '../../src/models/File.js';
import Folder from '../../src/models/Folder.js';
import Project from '../../src/models/Project.js';
import r2StorageService from '../../src/services/r2Storage.js';

// Mock dependencies
jest.mock('../../src/models/File.js');
jest.mock('../../src/models/Folder.js');
jest.mock('../../src/models/Project.js');
jest.mock('../../src/services/r2Storage.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('FolderIntegrityService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockFolderId = '507f1f77bcf86cd799439012';
  const mockProjectId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyFolderIntegrity', () => {
    it('should complete verification for valid folder', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0,
        parentFolder: null,
        project: mockProjectId
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test.txt',
          filename: 'test.txt',
          size: 1024,
          storage: { key: 'test/file1.txt' },
          checksum: 'abc123'
        }
      ];

      const mockProject = {
        _id: mockProjectId,
        name: 'test-project',
        owner: mockUserId
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]); // No subfolders
      File.find.mockResolvedValue(mockFiles);
      Project.findById.mockResolvedValue(mockProject);
      r2StorageService.getFileMetadata.mockResolvedValue({
        size: 1024,
        contentType: 'text/plain'
      });

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId
      );

      expect(result.status).toBe('completed');
      expect(result.results.totalFolders).toBe(1);
      expect(result.results.totalFiles).toBe(1);
      expect(result.results.validFolders).toBe(1);
      expect(result.results.validFiles).toBe(1);
      expect(result.results.errors).toHaveLength(0);
      expect(result.results.integrityScore).toBeGreaterThan(90);
    });

    it('should detect folder not found error', async () => {
      Folder.findOne.mockResolvedValue(null);

      const result = await folderIntegrityService.verifyFolderIntegrity(
        'invalid-folder-id',
        mockUserId
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'FOLDER_NOT_FOUND',
          severity: 'high'
        })
      );
    });

    it('should detect broken parent folder links', async () => {
      const mockParentId = '507f1f77bcf86cd799439020';
      const mockFolder = {
        _id: mockFolderId,
        name: 'child-folder',
        owner: mockUserId,
        parentFolder: { _id: mockParentId },
        fullPath: 'parent/child-folder',
        level: 1
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.findById.mockResolvedValue(null); // Parent not found
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'BROKEN_PARENT_LINK',
          severity: 'high'
        })
      );
    });

    it('should detect path mismatch issues', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'wrong/path/test-folder', // Incorrect path
        level: 0,
        parentFolder: null
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'PATH_MISMATCH',
          severity: 'medium'
        })
      );
    });

    it('should detect storage file missing errors', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0,
        parentFolder: null
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'missing.txt',
          filename: 'missing.txt',
          size: 1024,
          storage: { key: 'test/missing.txt' }
        }
      ];

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue(mockFiles);
      r2StorageService.getFileMetadata.mockResolvedValue(null); // File not found in storage

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { checkStorage: true }
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'STORAGE_FILE_MISSING',
          severity: 'high'
        })
      );
    });

    it('should detect size mismatch errors', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test.txt',
          size: 1024, // Database shows 1024
          storage: { key: 'test/file1.txt' }
        }
      ];

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue(mockFiles);
      r2StorageService.getFileMetadata.mockResolvedValue({
        size: 2048 // Storage shows 2048 - mismatch!
      });

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { checkStorage: true }
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'SIZE_MISMATCH',
          severity: 'high'
        })
      );
    });

    it('should detect checksum mismatch in deep scan', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test.txt',
          size: 1024,
          storage: { key: 'test/file1.txt' },
          checksum: 'expected-checksum'
        }
      ];

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue(mockFiles);
      r2StorageService.getFileMetadata.mockResolvedValue({ size: 1024 });
      r2StorageService.downloadFile.mockResolvedValue({
        buffer: Buffer.from('test content')
      });

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { deepScan: true }
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'CHECKSUM_MISMATCH',
          severity: 'critical'
        })
      );
    });

    it('should detect orphaned files', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);
      
      // Mock orphaned files in aggregate query
      File.aggregate.mockResolvedValue([
        {
          _id: 'orphan1',
          originalName: 'orphaned.txt',
          folder: 'non-existent-folder-id'
        }
      ]);

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'ORPHANED_FILE',
          severity: 'medium'
        })
      );
    });
  });

  describe('Auto-repair functionality', () => {
    it('should repair path mismatch automatically', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'wrong-path',
        level: 0,
        parentFolder: null
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);
      Folder.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { autoRepair: true }
      );

      expect(result.results.repaired).toContainEqual(
        expect.objectContaining({
          type: 'PATH_REPAIR'
        })
      );
      
      expect(Folder.updateOne).toHaveBeenCalledWith(
        { _id: mockFolderId },
        { $set: { fullPath: 'test-folder' } }
      );
    });

    it('should repair orphaned files by moving to root', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);
      File.aggregate.mockResolvedValue([
        {
          _id: 'orphan1',
          originalName: 'orphaned.txt',
          folder: 'non-existent-folder-id'
        }
      ]);
      File.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { autoRepair: true }
      );

      expect(result.results.repaired).toContainEqual(
        expect.objectContaining({
          type: 'ORPHAN_REPAIR'
        })
      );
      
      expect(File.updateOne).toHaveBeenCalledWith(
        { _id: 'orphan1' },
        { $unset: { folder: 1 } }
      );
    });
  });

  describe('Integrity Score Calculation', () => {
    it('should calculate perfect score for no errors', () => {
      const results = {
        totalFolders: 2,
        totalFiles: 3,
        validFolders: 2,
        validFiles: 3,
        errors: []
      };

      const score = folderIntegrityService.calculateIntegrityScore(results);
      expect(score).toBe(100);
    });

    it('should penalize critical errors heavily', () => {
      const results = {
        totalFolders: 1,
        totalFiles: 2,
        validFolders: 1,
        validFiles: 1, // One invalid file
        errors: [
          { severity: 'critical' }
        ]
      };

      const score = folderIntegrityService.calculateIntegrityScore(results);
      expect(score).toBeLessThan(80); // Should be significantly penalized
    });

    it('should handle empty folders gracefully', () => {
      const results = {
        totalFolders: 0,
        totalFiles: 0,
        validFolders: 0,
        validFiles: 0,
        errors: []
      };

      const score = folderIntegrityService.calculateIntegrityScore(results);
      expect(score).toBe(100);
    });
  });

  describe('Path and Level Calculations', () => {
    it('should calculate expected path for nested folders', async () => {
      const parentFolder = {
        _id: 'parent-id',
        name: 'parent',
        parentFolder: null
      };

      const childFolder = {
        _id: 'child-id',
        name: 'child',
        parentFolder: 'parent-id'
      };

      Folder.findById.mockImplementation((id) => {
        if (id === 'parent-id') return Promise.resolve(parentFolder);
        return Promise.resolve(null);
      });

      const expectedPath = await folderIntegrityService.calculateExpectedPath(childFolder);
      expect(expectedPath).toBe('parent/child');
    });

    it('should calculate expected level for nested folders', async () => {
      const parentFolder = {
        _id: 'parent-id',
        level: 1,
        parentFolder: 'grandparent-id'
      };

      const childFolder = {
        _id: 'child-id',
        name: 'child',
        parentFolder: 'parent-id'
      };

      Folder.findById.mockImplementation((id) => {
        if (id === 'parent-id') return Promise.resolve(parentFolder);
        return Promise.resolve(null);
      });

      const expectedLevel = await folderIntegrityService.calculateExpectedLevel(childFolder);
      expect(expectedLevel).toBe(2);
    });
  });

  describe('Status Management', () => {
    it('should store and retrieve verification status', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue([]);

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId
      );

      const status = folderIntegrityService.getVerificationStatus(result.verificationId);
      expect(status).toBeTruthy();
      expect(status.verificationId).toBe(result.verificationId);
      expect(status.status).toBe('completed');
    });

    it('should return null for non-existent verification', () => {
      const status = folderIntegrityService.getVerificationStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should cleanup old verifications', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      const recentTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      folderIntegrityService.verificationQueue.set('old-verification', {
        startTime: oldTime
      });
      folderIntegrityService.verificationQueue.set('recent-verification', {
        startTime: recentTime
      });

      folderIntegrityService.cleanupOldVerifications();

      expect(folderIntegrityService.verificationQueue.has('old-verification')).toBe(false);
      expect(folderIntegrityService.verificationQueue.has('recent-verification')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      Folder.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        folderIntegrityService.verifyFolderIntegrity(mockFolderId, mockUserId)
      ).rejects.toThrow('Integrity verification failed');
    });

    it('should handle storage service errors', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId,
        fullPath: 'test-folder',
        level: 0
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test.txt',
          size: 1024,
          storage: { key: 'test/file1.txt' }
        }
      ];

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue(mockFiles);
      r2StorageService.getFileMetadata.mockRejectedValue(new Error('Storage access denied'));

      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { checkStorage: true }
      );

      expect(result.results.errors).toContainEqual(
        expect.objectContaining({
          type: 'STORAGE_ACCESS_ERROR',
          severity: 'high'
        })
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle large folder structures efficiently', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'large-folder',
        owner: mockUserId,
        fullPath: 'large-folder',
        level: 0
      };

      // Create large file list
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        _id: `file${i}`,
        originalName: `file${i}.txt`,
        size: 1024,
        storage: { key: `test/file${i}.txt` }
      }));

      Folder.findOne.mockResolvedValue(mockFolder);
      Folder.find.mockResolvedValue([]);
      File.find.mockResolvedValue(largeFileList);
      r2StorageService.getFileMetadata.mockResolvedValue({ size: 1024 });

      const startTime = Date.now();
      const result = await folderIntegrityService.verifyFolderIntegrity(
        mockFolderId,
        mockUserId,
        { checkStorage: true }
      );
      const endTime = Date.now();

      expect(result.status).toBe('completed');
      expect(result.results.totalFiles).toBe(1000);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });
  });
});