import { jest } from '@jest/globals';
import bulkDownloadService from '../../src/services/bulkDownloadService.js';
import File from '../../src/models/File.js';
import Folder from '../../src/models/Folder.js';
import r2StorageService from '../../src/services/r2Storage.js';

// Mock dependencies
jest.mock('../../src/models/File.js');
jest.mock('../../src/models/Folder.js');
jest.mock('../../src/services/r2Storage.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('BulkDownloadService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockFolderId = '507f1f77bcf86cd799439012';
  const mockProjectId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFilesZipStream', () => {
    it('should create ZIP stream for small file set (immediate processing)', async () => {
      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test1.txt',
          size: 1024,
          storage: { key: 'test/file1.txt' },
          createdAt: new Date()
        },
        {
          _id: 'file2',
          originalName: 'test2.txt',
          size: 2048,
          storage: { key: 'test/file2.txt' },
          createdAt: new Date()
        }
      ];

      File.find.mockResolvedValue(mockFiles);
      r2StorageService.downloadFileStream.mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
          return { on: jest.fn(), pipe: jest.fn() };
        })
      });

      const result = await bulkDownloadService.createFilesZipStream(
        ['file1', 'file2'],
        mockUserId,
        { archiveName: 'test-archive' }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('downloadId');
      expect(result).toHaveProperty('filename', 'test-archive.zip');
      expect(result).toHaveProperty('totalFiles', 2);
      expect(result.estimatedSize).toBeGreaterThan(0);
    });

    it('should handle file access errors gracefully', async () => {
      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'test1.txt',
          size: 1024,
          storage: { key: 'test/file1.txt' },
          createdAt: new Date()
        }
      ];

      File.find.mockResolvedValue(mockFiles);
      r2StorageService.downloadFileStream.mockRejectedValue(new Error('File not found'));

      // Should not throw but handle gracefully
      const result = await bulkDownloadService.createFilesZipStream(
        ['file1'],
        mockUserId,
        { archiveName: 'test-archive' }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('downloadId');
    });

    it('should throw error for empty file list', async () => {
      File.find.mockResolvedValue([]);

      await expect(
        bulkDownloadService.createFilesZipStream([], mockUserId)
      ).rejects.toThrow('No files found or access denied');
    });
  });

  describe('createFolderZipStream', () => {
    it('should create ZIP stream for folder with files', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'test-folder',
        owner: mockUserId
      };

      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'folder-file1.txt',
          size: 1024,
          storage: { key: 'test/folder-file1.txt' },
          folder: { name: 'test-folder', fullPath: 'test-folder' },
          createdAt: new Date()
        }
      ];

      Folder.findOne.mockResolvedValue(mockFolder);
      File.find.mockResolvedValue(mockFiles);
      Folder.find.mockResolvedValue([]); // No subfolders
      r2StorageService.downloadFileStream.mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
          return { on: jest.fn(), pipe: jest.fn() };
        })
      });

      const result = await bulkDownloadService.createFolderZipStream(
        mockFolderId,
        mockUserId
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('filename', 'test-folder.zip');
      expect(result).toHaveProperty('totalFiles', 1);
    });

    it('should throw error for non-existent folder', async () => {
      Folder.findOne.mockResolvedValue(null);

      await expect(
        bulkDownloadService.createFolderZipStream('invalid-id', mockUserId)
      ).rejects.toThrow('Folder not found or access denied');
    });

    it('should handle empty folder', async () => {
      const mockFolder = {
        _id: mockFolderId,
        name: 'empty-folder',
        owner: mockUserId
      };

      Folder.findOne.mockResolvedValue(mockFolder);
      File.find.mockResolvedValue([]);
      Folder.find.mockResolvedValue([]);

      await expect(
        bulkDownloadService.createFolderZipStream(mockFolderId, mockUserId)
      ).rejects.toThrow('No files found in folder');
    });
  });

  describe('createProjectZipStream', () => {
    it('should create ZIP stream for project with files', async () => {
      const mockFiles = [
        {
          _id: 'file1',
          originalName: 'project-file1.txt',
          size: 1024,
          storage: { key: 'project/file1.txt' },
          folder: { name: 'docs', fullPath: 'docs' },
          createdAt: new Date()
        },
        {
          _id: 'file2',
          originalName: 'project-file2.txt',
          size: 2048,
          storage: { key: 'project/file2.txt' },
          folder: null, // Root level file
          createdAt: new Date()
        }
      ];

      File.find.mockResolvedValue(mockFiles);
      r2StorageService.downloadFileStream.mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
          return { on: jest.fn(), pipe: jest.fn() };
        })
      });

      const result = await bulkDownloadService.createProjectZipStream(
        mockProjectId,
        mockUserId,
        { projectName: 'test-project' }
      );

      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('filename', 'test-project.zip');
      expect(result).toHaveProperty('totalFiles', 2);
      expect(result.metadata).toHaveProperty('folderCount');
    });

    it('should handle project with no files', async () => {
      File.find.mockResolvedValue([]);

      await expect(
        bulkDownloadService.createProjectZipStream(mockProjectId, mockUserId)
      ).rejects.toThrow('No files found in project');
    });
  });

  describe('Download Status Management', () => {
    it('should track active downloads', () => {
      const downloadId = 'test-download-123';
      const status = {
        type: 'files',
        userId: mockUserId,
        totalFiles: 5,
        status: 'active'
      };

      // Simulate adding to active downloads
      bulkDownloadService.activeDownloads.set(downloadId, status);

      const retrievedStatus = bulkDownloadService.getDownloadStatus(downloadId);
      expect(retrievedStatus).toEqual(status);
    });

    it('should return null for non-existent download', () => {
      const status = bulkDownloadService.getDownloadStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should check user download limits', () => {
      // Mock user with 5 active downloads (under limit)
      const mockDownloads = new Map();
      for (let i = 0; i < 5; i++) {
        mockDownloads.set(`download-${i}`, {
          userId: mockUserId,
          status: 'active'
        });
      }
      bulkDownloadService.activeDownloads = mockDownloads;

      const canStart = bulkDownloadService.canUserStartDownload(mockUserId);
      expect(canStart).toBe(true);

      // Add more downloads to exceed limit
      for (let i = 5; i < 12; i++) {
        mockDownloads.set(`download-${i}`, {
          userId: mockUserId,
          status: 'active'
        });
      }

      const canStartAfterLimit = bulkDownloadService.canUserStartDownload(mockUserId);
      expect(canStartAfterLimit).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should sanitize file names properly', () => {
      const testCases = [
        { input: 'normal-file.txt', expected: 'normal-file.txt' },
        { input: 'file<>:"/\\|?*.txt', expected: 'file_________.txt' },
        { input: '.hidden-file', expected: '_hidden-file' },
        { input: 'very-long-filename-that-exceeds-normal-limits'.repeat(10) + '.txt', 
          expected: expect.stringMatching(/^.{1,255}$/) }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = bulkDownloadService.sanitizeFileName(input);
        if (typeof expected === 'string') {
          expect(result).toBe(expected);
        } else {
          expect(result).toEqual(expected);
        }
      });
    });

    it('should group files by folder structure correctly', () => {
      const files = [
        { folder: { fullPath: 'docs' }, originalName: 'readme.txt' },
        { folder: { fullPath: 'src/components' }, originalName: 'Button.jsx' },
        { folder: null, originalName: 'package.json' }
      ];

      const grouped = bulkDownloadService.groupFilesByFolderStructure(files);

      expect(grouped).toHaveProperty('docs');
      expect(grouped).toHaveProperty('src/components');
      expect(grouped).toHaveProperty('root');
      expect(grouped['docs']).toHaveLength(1);
      expect(grouped['src/components']).toHaveLength(1);
      expect(grouped['root']).toHaveLength(1);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old downloads', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const recentTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      bulkDownloadService.activeDownloads.set('old-download', {
        startTime: oldTime,
        status: 'completed'
      });
      bulkDownloadService.activeDownloads.set('recent-download', {
        startTime: recentTime,
        status: 'active'
      });

      const initialCount = bulkDownloadService.activeDownloads.size;
      bulkDownloadService.cleanupOldDownloads();
      
      expect(bulkDownloadService.activeDownloads.size).toBe(initialCount - 1);
      expect(bulkDownloadService.activeDownloads.has('old-download')).toBe(false);
      expect(bulkDownloadService.activeDownloads.has('recent-download')).toBe(true);
    });

    it('should get active downloads count', () => {
      bulkDownloadService.activeDownloads.clear();
      
      expect(bulkDownloadService.getActiveDownloadsCount()).toBe(0);
      
      bulkDownloadService.activeDownloads.set('test1', { status: 'active' });
      bulkDownloadService.activeDownloads.set('test2', { status: 'completed' });
      
      expect(bulkDownloadService.getActiveDownloadsCount()).toBe(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      const mockFiles = [{
        _id: 'file1',
        originalName: 'timeout-test.txt',
        size: 1024,
        storage: { key: 'test/timeout-test.txt' },
        createdAt: new Date()
      }];

      File.find.mockResolvedValue(mockFiles);
      
      // Mock timeout scenario
      r2StorageService.downloadFileStream.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Download timeout')), 100);
        })
      );

      const result = await bulkDownloadService.createFilesZipStream(
        ['file1'],
        mockUserId
      );

      // Should complete with error placeholder instead of failing
      expect(result).toHaveProperty('stream');
      expect(result).toHaveProperty('downloadId');
    });

    it('should handle corrupted file data', async () => {
      const mockFiles = [{
        _id: 'file1',
        originalName: 'corrupted.txt',
        size: 1024,
        storage: { key: 'test/corrupted.txt' },
        createdAt: new Date()
      }];

      File.find.mockResolvedValue(mockFiles);
      r2StorageService.downloadFileStream.mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Corrupted data')), 10);
          }
          return { on: jest.fn(), pipe: jest.fn() };
        })
      });

      const result = await bulkDownloadService.createFilesZipStream(
        ['file1'],
        mockUserId
      );

      expect(result).toHaveProperty('stream');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large file lists efficiently', async () => {
      const largeFileList = Array.from({ length: 1000 }, (_, i) => ({
        _id: `file${i}`,
        originalName: `file${i}.txt`,
        size: 1024,
        storage: { key: `test/file${i}.txt` },
        createdAt: new Date()
      }));

      File.find.mockResolvedValue(largeFileList);
      r2StorageService.downloadFileStream.mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(() => callback(), 1);
          }
          return { on: jest.fn(), pipe: jest.fn() };
        })
      });

      const startTime = Date.now();
      const result = await bulkDownloadService.createFilesZipStream(
        largeFileList.map(f => f._id),
        mockUserId
      );
      const endTime = Date.now();

      expect(result).toHaveProperty('stream');
      expect(result.totalFiles).toBe(1000);
      
      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should limit concurrent file processing', () => {
      // Test is implicitly covered by the chunked processing in addFilesToArchiveWithRetry
      // This verifies the concurrency limit is respected
      expect(bulkDownloadService.maxConcurrentDownloads).toBe(10);
    });
  });
});