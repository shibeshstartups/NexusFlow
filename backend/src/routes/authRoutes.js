import express from 'express';
import { 
  register, 
  login, 
  logout, 
  forgotPassword, 
  resetPassword, 
  updatePassword,
  verifyEmail,
  resendVerification,
  refreshToken
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { userValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', userValidation.register, register);
router.post('/login', userValidation.login, login);
router.post('/forgot-password', userValidation.forgotPassword, forgotPassword);
router.patch('/reset-password', userValidation.resetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.post('/logout', logout);
router.patch('/update-password', userValidation.changePassword, updatePassword);

export default router;