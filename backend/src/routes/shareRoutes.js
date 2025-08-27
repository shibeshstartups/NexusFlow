import express from 'express';
import {
  accessSharedContent,
  downloadSharedFile,
  getSharedProjectFiles,
  getSharedFolderContents,
  validateShareAccess
} from '../controllers/shareController.js';
import { shareValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All sharing routes are public but may require validation

// General shared content access
router.post('/access/:token', 
  shareValidation.access,
  validateShareAccess,
  accessSharedContent
);

// Download shared files
router.get('/download/:token', downloadSharedFile);

// Get shared project files
router.get('/project/:token/files', getSharedProjectFiles);

// Get shared folder contents
router.get('/folder/:token/contents', getSharedFolderContents);

export default router;