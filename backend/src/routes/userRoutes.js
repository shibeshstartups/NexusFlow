import express from 'express';
import {
  getMe,
  updateMe,
  deleteMe,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { userValidation } from '../middleware/validationMiddleware.js';
import { uploadSingle } from '../config/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current user routes
router.get('/me', getMe);
router.patch('/update-me', userValidation.updateProfile, updateMe);
router.delete('/delete-me', deleteMe);
router.patch('/upload-photo', uploadSingle('photo'), resizeUserPhoto, uploadUserPhoto);

// Admin only routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;