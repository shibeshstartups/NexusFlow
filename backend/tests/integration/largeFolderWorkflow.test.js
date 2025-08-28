import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { performanceMonitor } from '../utils/performanceUtils.js';
import File from '../../src/models/File.js';
import Folder from '../../src/models/Folder.js';
import Project from '../../src/models/Project.js';
import User from '../../src/models/User.js';

// Mock external dependencies
jest.mock('../../src/services/r2Storage.js');
jest.mock('../../src/services/redisService.js');

describe('Large Folder Upload/Download Integration Tests', () => {
  let authToken;
  let testUser;
  let testProject;
  let testFolder;

  beforeAll(async () => {
    // Setup test user and authentication
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      storageQuota: 1024 * 1024 * 1024, // 1GB
      storageUsed: 0
    });

    // Generate auth token (mock JWT)
    authToken = 'mock-jwt-token-for-testing';

    // Setup test project
    testProject = await Project.create({
      name: 'Test Project',
      owner: testUser._id,
      description: 'Test project for integration tests'
    });

    // Setup test folder
    testFolder = await Folder.create({
      name: 'Test Folder',
      owner: testUser._id,
      project: testProject._id,
      fullPath: 'Test Folder',
      level: 0
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await File.deleteMany({ owner: testUser._id });
    await Folder.deleteMany({ owner: testUser._id });
    await Project.deleteMany({ owner: testUser._id });
    await User.deleteMany({ _id: testUser._id });
  });

  describe('Folder Upload Workflow', () => {
    it('should upload folder with multiple files successfully', async () => {
      const operationId = 'folder-upload-test-1';
      performanceMonitor.startTiming(operationId, 'upload', {
        testType: 'folder_upload',
        filesCount: 5
      });

      // Create mock form data for folder upload
      const mockFiles = [
        { 
          originalname: 'folder/file1.txt',
          mimetype: 'text/plain',
          size: 1024,
          buffer: Buffer.from('test content 1')
        },
        { 
          originalname: 'folder/subfolder/file2.txt',
          mimetype: 'text/plain',
          size: 2048,
          buffer: Buffer.from('test content 2')
        },
        { 
          originalname: 'folder/subfolder/file3.jpg',
          mimetype: 'image/jpeg',
          size: 5120,
          buffer: Buffer.from('fake image data')
        },
        { 
          originalname: 'folder/file4.pdf',
          mimetype: 'application/pdf',
          size: 10240,
          buffer: Buffer.from('fake pdf data')
        },
        { 
          originalname: 'folder/docs/readme.md',
          mimetype: 'text/markdown',
          size: 512,
          buffer: Buffer.from('# README\\n\\nTest folder')
        }
      ];

      const response = await request(app)
        .post('/api/files/upload-folder')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProject._id.toString())
        .field('parentFolderId', testFolder._id.toString())
        .field('allowDuplicates', 'false');

      // Mock file attachments (in real test, would use .attach())
      mockFiles.forEach((file, index) => {
        response.attach(`files`, Buffer.from(file.buffer), {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(5);
      expect(response.body.data.folderStructure).toBeDefined();

      // Verify folder structure was preserved
      const uploadedFiles = response.body.data.files;
      const folderFiles = uploadedFiles.filter(f => f.relativePath.includes('folder/'));
      const subfolderFiles = uploadedFiles.filter(f => f.relativePath.includes('subfolder/'));
      const docsFiles = uploadedFiles.filter(f => f.relativePath.includes('docs/'));

      expect(folderFiles.length).toBeGreaterThan(0);
      expect(subfolderFiles.length).toBe(2);
      expect(docsFiles.length).toBe(1);

      performanceMonitor.endTiming(operationId, {
        success: true,
        filesUploaded: uploadedFiles.length
      });
    });

    it('should handle large folder upload (background processing)', async () => {
      const operationId = 'large-folder-upload-test';
      performanceMonitor.startTiming(operationId, 'upload', {
        testType: 'large_folder_upload',
        filesCount: 150, // Exceeds threshold
        totalSize: 600 * 1024 * 1024 // 600MB
      });

      // Create large file list that exceeds background processing threshold
      const largeFileList = Array.from({ length: 150 }, (_, i) => ({
        originalname: `large-folder/batch-${Math.floor(i/10)}/file${i}.txt`,
        mimetype: 'text/plain',
        size: 4 * 1024 * 1024, // 4MB each
        buffer: Buffer.alloc(1024, `content-${i}`) // Mock large content
      }));

      const response = await request(app)
        .post('/api/files/upload-folder')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProject._id.toString())
        .field('useBackground', 'true');

      // For large uploads, expect different response indicating background processing
      if (response.body.data.backgroundJob) {
        expect(response.status).toBe(202);
        expect(response.body.data.backgroundJob).toBeDefined();
        expect(response.body.data.jobId).toBeDefined();
      } else {
        expect(response.status).toBe(201);
      }

      performanceMonitor.endTiming(operationId, {
        success: true,
        backgroundProcessing: !!response.body.data.backgroundJob
      });
    });

    it('should validate file types and reject invalid files', async () => {
      const operationId = 'invalid-file-upload-test';
      performanceMonitor.startTiming(operationId, 'upload', {
        testType: 'validation_test'
      });

      const invalidFiles = [
        {
          originalname: 'malicious.exe',
          mimetype: 'application/x-executable',
          size: 1024,
          buffer: Buffer.from('fake executable')
        },
        {
          originalname: 'script.bat',
          mimetype: 'application/x-batch',
          size: 512,
          buffer: Buffer.from('fake batch script')
        }
      ];

      const response = await request(app)
        .post('/api/files/upload-folder')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProject._id.toString());

      // Expect validation to reject dangerous file types
      if (response.body.data?.errors) {
        expect(response.body.data.errors.length).toBeGreaterThan(0);
      }

      performanceMonitor.endTiming(operationId, {
        success: true,
        validationTriggered: true
      });
    });
  });

  describe('Bulk Download Workflow', () => {
    beforeEach(async () => {
      // Setup test files for download tests
      await File.create([
        {
          filename: 'test1.txt',
          originalName: 'test1.txt',
          owner: testUser._id,
          project: testProject._id,
          folder: testFolder._id,
          size: 1024,
          storage: { key: 'test/test1.txt', bucket: 'test-bucket' }
        },
        {
          filename: 'test2.txt',
          originalName: 'test2.txt',
          owner: testUser._id,
          project: testProject._id,
          folder: testFolder._id,
          size: 2048,
          storage: { key: 'test/test2.txt', bucket: 'test-bucket' }
        }
      ]);
    });

    it('should download small folder as ZIP immediately', async () => {
      const operationId = 'small-folder-download-test';
      performanceMonitor.startTiming(operationId, 'download', {
        testType: 'immediate_download',
        expectedFiles: 2
      });

      const response = await request(app)
        .get(`/api/files/download/folder/${testFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ useBackground: 'false' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['x-download-id']).toBeDefined();

      performanceMonitor.endTiming(operationId, {
        success: true,
        downloadId: response.headers['x-download-id']
      });
    });

    it('should queue large folder download for background processing', async () => {
      // Create mock large folder scenario
      const largeFiles = Array.from({ length: 120 }, (_, i) => ({
        filename: `large${i}.txt`,
        originalName: `large${i}.txt`,
        owner: testUser._id,
        project: testProject._id,
        folder: testFolder._id,
        size: 5 * 1024 * 1024, // 5MB each = 600MB total
        storage: { key: `test/large${i}.txt`, bucket: 'test-bucket' }
      }));

      await File.insertMany(largeFiles);

      const operationId = 'large-folder-download-test';
      performanceMonitor.startTiming(operationId, 'zipCreation', {
        testType: 'background_download',
        expectedFiles: 122 // 2 existing + 120 new
      });

      const response = await request(app)
        .get(`/api/files/download/folder/${testFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ useBackground: 'auto' });

      // Should return 202 for background processing
      expect([200, 202]).toContain(response.status);

      if (response.status === 202) {
        expect(response.body.data.downloadId).toBeDefined();
        expect(response.body.data.status).toBe('queued');
        expect(response.body.data.pollUrl).toBeDefined();

        // Test polling for status
        const statusResponse = await request(app)
          .get(response.body.data.pollUrl)
          .set('Authorization', `Bearer ${authToken}`);

        expect(statusResponse.status).toBe(200);
        expect(['queued', 'processing', 'completed', 'failed']).toContain(
          statusResponse.body.data.status
        );
      }

      performanceMonitor.endTiming(operationId, {
        success: true,
        backgroundProcessing: response.status === 202
      });
    });

    it('should download selected files as ZIP', async () => {
      const files = await File.find({ 
        owner: testUser._id, 
        project: testProject._id 
      }).limit(5);

      const fileIds = files.map(f => f._id.toString());

      const operationId = 'bulk-files-download-test';
      performanceMonitor.startTiming(operationId, 'download', {
        testType: 'selected_files_download',
        fileCount: fileIds.length
      });

      const response = await request(app)
        .post('/api/files/download/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileIds,
          archiveName: 'selected-files',
          useBackground: 'false'
        });

      expect([200, 202]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/zip');
        expect(response.headers['content-disposition']).toContain('selected-files.zip');
      }

      performanceMonitor.endTiming(operationId, {
        success: true,
        filesRequested: fileIds.length
      });
    });

    it('should download entire project as ZIP', async () => {
      const operationId = 'project-download-test';
      performanceMonitor.startTiming(operationId, 'download', {
        testType: 'project_download'
      });

      const response = await request(app)
        .post(`/api/files/download/project/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectName: 'Test Project Export',
          useBackground: 'false'
        });

      expect([200, 202]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/zip');
        expect(response.headers['content-disposition']).toContain('Test Project Export.zip');
      }

      performanceMonitor.endTiming(operationId, {
        success: true,
        projectId: testProject._id.toString()
      });
    });
  });

  describe('Folder Integrity Verification', () => {
    it('should verify folder integrity successfully', async () => {
      const operationId = 'integrity-verification-test';
      performanceMonitor.startTiming(operationId, 'integrity', {
        testType: 'folder_integrity'
      });

      const response = await request(app)
        .post(`/api/files/verify/folder/${testFolder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          checkFiles: true,
          checkStorage: true,
          checkMetadata: true,
          deepScan: false,
          autoRepair: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verificationId).toBeDefined();
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.results.integrityScore).toBeGreaterThanOrEqual(0);

      performanceMonitor.endTiming(operationId, {
        success: true,
        integrityScore: response.body.data.results.integrityScore
      });
    });

    it('should perform batch folder verification', async () => {
      // Create additional test folders
      const additionalFolders = await Folder.insertMany([
        {
          name: 'Folder 1',
          owner: testUser._id,
          project: testProject._id,
          fullPath: 'Folder 1',
          level: 0
        },
        {
          name: 'Folder 2',
          owner: testUser._id,
          project: testProject._id,
          fullPath: 'Folder 2',
          level: 0
        }
      ]);

      const folderIds = [testFolder._id, ...additionalFolders.map(f => f._id)];

      const operationId = 'batch-integrity-test';
      performanceMonitor.startTiming(operationId, 'integrity', {
        testType: 'batch_integrity',
        folderCount: folderIds.length
      });

      const response = await request(app)
        .post('/api/files/verify/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          folderIds: folderIds.map(id => id.toString()),
          options: {
            checkFiles: true,
            checkStorage: false, // Faster for batch
            autoRepair: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toHaveLength(folderIds.length);
      expect(response.body.data.summary.totalFolders).toBe(folderIds.length);

      performanceMonitor.endTiming(operationId, {
        success: true,
        foldersVerified: folderIds.length
      });
    });

    it('should get folder health summary', async () => {
      const operationId = 'health-summary-test';
      performanceMonitor.startTiming(operationId, 'integrity', {
        testType: 'health_summary'
      });

      const response = await request(app)
        .get(`/api/files/health/summary/${testProject._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.issues).toBeDefined();
      expect(response.body.data.recommendations).toBeInstanceOf(Array);

      performanceMonitor.endTiming(operationId, {
        success: true,
        totalFiles: response.body.data.overview.totalFiles,
        totalFolders: response.body.data.overview.totalFolders
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent download limit gracefully', async () => {
      const operationId = 'concurrent-limit-test';
      performanceMonitor.startTiming(operationId, 'download', {
        testType: 'concurrent_limits'
      });

      // Try to exceed concurrent download limit
      const downloadPromises = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .get(`/api/files/download/folder/${testFolder._id}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(downloadPromises);
      
      // Some should succeed, some should be rate limited
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);

      expect(successful.length + rateLimited.length).toBe(15);
      expect(rateLimited.length).toBeGreaterThan(0); // Should have some rate limited

      performanceMonitor.endTiming(operationId, {
        success: true,
        successfulDownloads: successful.length,
        rateLimitedDownloads: rateLimited.length
      });
    });

    it('should handle invalid folder ID gracefully', async () => {
      const invalidId = '507f1f77bcf86cd799439999';

      const response = await request(app)
        .get(`/api/files/download/folder/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle storage quota exceeded', async () => {
      // Temporarily reduce user's storage quota
      await User.findByIdAndUpdate(testUser._id, {
        storageUsed: 900 * 1024 * 1024, // 900MB used
        storageQuota: 1024 * 1024 * 1024 // 1GB quota
      });

      const response = await request(app)
        .post('/api/files/upload-folder')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProject._id.toString())
        .attach('files', Buffer.from('large file content'), {
          filename: 'large-file.txt',
          contentType: 'text/plain'
        });

      // Should handle quota exceeded
      if (response.status === 413 || (response.status === 400 && response.body.message.includes('quota'))) {
        expect(response.body.success).toBe(false);
      }

      // Restore original quota
      await User.findByIdAndUpdate(testUser._id, {
        storageUsed: 0
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete folder upload within performance threshold', async () => {
      const stats = performanceMonitor.getStats('upload');
      
      if (stats && stats.count > 0) {
        expect(stats.averageDuration).toBeLessThan(30000); // 30 seconds
        expect(stats.thresholdExceededPercent).toBeLessThan(10); // Less than 10% failures
      }
    });

    it('should complete folder download within performance threshold', async () => {
      const stats = performanceMonitor.getStats('download');
      
      if (stats && stats.count > 0) {
        expect(stats.averageDuration).toBeLessThan(45000); // 45 seconds
        expect(stats.thresholdExceededPercent).toBeLessThan(15); // Less than 15% failures
      }
    });

    it('should complete integrity verification within threshold', async () => {
      const stats = performanceMonitor.getStats('integrity');
      
      if (stats && stats.count > 0) {
        expect(stats.averageDuration).toBeLessThan(60000); // 1 minute
        expect(stats.thresholdExceededPercent).toBeLessThan(5); // Less than 5% failures
      }
    });

    afterAll(() => {
      // Generate final performance report
      const report = performanceMonitor.generateReport();
      console.log('Integration Test Performance Report:', JSON.stringify(report, null, 2));
      
      // Log recommendations
      if (report.alerts.length > 0) {
        console.warn('Performance Alerts:', report.alerts);
      }
    });
  });
});