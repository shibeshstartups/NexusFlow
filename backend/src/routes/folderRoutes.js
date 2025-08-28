import express from 'express';
import {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  getFolderTree,
  shareFolder,
  getSharedFolder
} from '../controllers/folderController.js';
import { downloadFolderAsZip } from '../controllers/r2FileController.js';
import { protect, checkOwnership, optionalAuth, checkTransferQuota } from '../middleware/authMiddleware.js';
import { folderValidation } from '../middleware/validationMiddleware.js';
import Folder from '../models/Folder.js';

const router = express.Router();

// Public routes for shared folders
router.get('/shared/:token', optionalAuth, getSharedFolder);

// Protected routes
router.use(protect);

router.route('/')
  .get(getFolders)
  .post(folderValidation.create, createFolder);

router.route('/:id')
  .get(checkOwnership(Folder), getFolder)
  .patch(checkOwnership(Folder), folderValidation.update, updateFolder)
  .delete(checkOwnership(Folder), deleteFolder);

// Folder operations
router.patch('/:id/move', 
  checkOwnership(Folder),
  folderValidation.move,
  moveFolder
);

router.patch('/:id/share', 
  checkOwnership(Folder),
  shareFolder
);

// Folder download as ZIP
router.get('/:id/download',
  checkOwnership(Folder),
  checkTransferQuota(),
  downloadFolderAsZip
);

// Get folder tree structure
router.get('/tree/:projectId', getFolderTree);

export default router;