import express from 'express';
import {
  uploadFiles,
  uploadFolder,
  getFiles,
  getFile,
  deleteFile,
  downloadFile,
  downloadFolderAsZip,
  downloadFilesAsZip,
  downloadProjectAsZip,
  getBulkDownloadStatus,
  shareFile,
  getUserStorageStats,
  getCdnAnalytics,
  getResponsiveImages,
  purgeCdnCache,
  setupCdnOptimization,
  verifyFolderIntegrity,
  getVerificationStatus,
  batchVerifyFolders,
  getFolderHealthSummary
} from '../controllers/r2FileController.js';
import { protect, checkStorageQuota, checkTransferQuota } from '../middleware/authMiddleware.js';
import { uploadMultiple } from '../config/r2Upload.js';
import {
  fileCacheMiddleware,
  analyticsCacheMiddleware,
  cdnCacheMiddleware,
  invalidateCache,
  cacheStatsMiddleware
} from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Protected routes - all file operations require authentication
router.use(protect);
router.use(cacheStatsMiddleware());

// File operations
router.route('/')
  .get(
    fileCacheMiddleware,
    getFiles
  )
  .post(
    checkStorageQuota(),
    invalidateCache([
      'files:*:*', 
      'projects:*:*',
      'analytics:*:*'
    ]),
    uploadMultiple('files'),
    uploadFiles
  );

// Folder upload with structure preservation
router.post('/upload-folder',
  checkStorageQuota(),
  invalidateCache([
    'files:*:*',
    'folders:*:*', 
    'projects:*:*',
    'analytics:*:*'
  ]),
  uploadMultiple('files'),
  uploadFolder
);

// Individual file operations
router.route('/:id')
  .get(
    fileCacheMiddleware,
    getFile
  )
  .delete(
    invalidateCache([
      'files:*:*',
      'file:*:*',
      'projects:*:*',
      'analytics:*:*'
    ]),
    deleteFile
  );

// File download (with transfer quota check)
router.get('/:id/download',
  checkTransferQuota(),
  fileCacheMiddleware,
  downloadFile
);

// Bulk download endpoints
router.post('/download/bulk',
  checkTransferQuota(),
  downloadFilesAsZip
);

router.get('/download/folder/:folderId',
  checkTransferQuota(),
  downloadFolderAsZip
);

router.post('/download/project/:projectId',
  checkTransferQuota(),
  downloadProjectAsZip
);

router.get('/download/status/:downloadId',
  getBulkDownloadStatus
);

// File sharing
router.patch('/:id/share',
  invalidateCache([
    'file:*:*',
    'files:*:*'
  ]),
  shareFile
);

// User storage statistics with CDN analytics
router.get('/stats/storage', 
  analyticsCacheMiddleware,
  getUserStorageStats
);

// CDN analytics and optimization
router.get('/cdn/analytics', 
  analyticsCacheMiddleware,
  getCdnAnalytics
);

router.post('/cdn/purge', 
  invalidateCache([
    'cdn:*:*',
    'files:*:*'
  ]),
  purgeCdnCache
);

router.post('/cdn/optimize', 
  invalidateCache([
    'cdn:*:*'
  ]),
  setupCdnOptimization
);

// Responsive image URLs
router.get('/:id/responsive', 
  cdnCacheMiddleware,
  getResponsiveImages
);

// Folder integrity verification routes
router.post('/verify/folder/:folderId',
  verifyFolderIntegrity
);

router.get('/verify/status/:verificationId',
  getVerificationStatus
);

router.post('/verify/batch',
  batchVerifyFolders
);

router.get('/health/summary/:projectId?',
  getFolderHealthSummary
);

export default router;