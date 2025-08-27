import express from 'express';
import {
  uploadFiles,
  getFiles,
  getFile,
  deleteFile,
  downloadFile,
  shareFile,
  getUserStorageStats,
  getCdnAnalytics,
  getResponsiveImages,
  purgeCdnCache,
  setupCdnOptimization
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

export default router;