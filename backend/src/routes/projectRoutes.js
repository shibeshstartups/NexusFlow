import express from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  shareProject,
  getSharedProject,
  getProjectFiles,
  getProjectFolders,
  getProjectStats
} from '../controllers/projectController.js';
import { protect, checkOwnership, optionalAuth } from '../middleware/authMiddleware.js';
import { projectValidation } from '../middleware/validationMiddleware.js';
import {
  projectCacheMiddleware,
  analyticsCacheMiddleware,
  invalidateCache,
  cacheStatsMiddleware
} from '../middleware/cacheMiddleware.js';
import Project from '../models/Project.js';

const router = express.Router();

// Public routes for shared projects
router.get('/shared/:token', 
  optionalAuth, 
  projectCacheMiddleware,
  getSharedProject
);

// Protected routes
router.use(protect);
router.use(cacheStatsMiddleware());

router.route('/')
  .get(
    projectCacheMiddleware,
    getProjects
  )
  .post(
    projectValidation.create,
    invalidateCache([
      'projects:*:*',
      'analytics:*:*'
    ]),
    createProject
  );

router.route('/:id')
  .get(
    checkOwnership(Project),
    projectCacheMiddleware,
    getProject
  )
  .patch(
    checkOwnership(Project),
    projectValidation.update,
    invalidateCache([
      'project:*:*',
      'projects:*:*',
      'analytics:*:*'
    ]),
    updateProject
  )
  .delete(
    checkOwnership(Project),
    invalidateCache([
      'project:*:*',
      'projects:*:*',
      'files:*:*',
      'analytics:*:*'
    ]),
    deleteProject
  );

// Project sharing
router.patch('/:id/share',
  checkOwnership(Project),
  projectValidation.sharing,
  invalidateCache([
    'project:*:*',
    'projects:*:*'
  ]),
  shareProject
);

// Project content
router.get('/:id/files', 
  checkOwnership(Project),
  projectCacheMiddleware,
  getProjectFiles
);

router.get('/:id/folders', 
  checkOwnership(Project),
  projectCacheMiddleware,
  getProjectFolders
);

router.get('/:id/stats', 
  checkOwnership(Project),
  analyticsCacheMiddleware,
  getProjectStats
);

export default router;