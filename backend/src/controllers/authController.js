import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import { 
  createSendToken, 
  generatePasswordResetToken, 
  generateEmailVerificationToken 
} from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

// Initialize Google OAuth client
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// Register new user
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Generate email verification token
  const { verificationToken, hashedToken, expires } = generateEmailVerificationToken();

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: expires
  });

  // TODO: Send verification email
  // await sendVerificationEmail(email, verificationToken);

  logger.logAuth('USER_REGISTERED', newUser._id, {
    email: newUser.email,
    name: newUser.name,
    ip: req.ip
  });

  // Send token
  createSendToken(newUser, 201, res, 'User registered successfully. Please check your email to verify your account.');
});

// Login user
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    logger.logAuth('LOGIN_FAILED', user?._id, {
      email,
      reason: 'Invalid credentials',
      ip: req.ip
    });
    return next(new AppError('Incorrect email or password', 401));
  }

  // Check if user account is active
  if (!user.isActive) {
    logger.logAuth('LOGIN_FAILED', user._id, {
      email,
      reason: 'Account inactive',
      ip: req.ip
    });
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // Send token
  createSendToken(user, 200, res, 'Logged in successfully');
});

// Logout user
export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  logger.logAuth('LOGOUT', req.user._id, {
    email: req.user.email,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Forgot password
export const forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // Generate the random reset token
  const { resetToken, hashedToken, expires } = generatePasswordResetToken();
  
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save({ validateBeforeSave: false });

  // TODO: Send reset email
  // const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password?token=${resetToken}`;
  // await sendPasswordResetEmail(user.email, resetURL);

  logger.logAuth('PASSWORD_RESET_REQUESTED', user._id, {
    email: user.email,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Password reset token sent to email!',
    // In development, return the token
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

// Reset password
export const resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.body.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.logAuth('PASSWORD_RESET_COMPLETED', user._id, {
    email: user.email,
    ip: req.ip
  });

  // Log the user in, send JWT
  createSendToken(user, 200, res, 'Password reset successfully');
});

// Update password for logged in user
export const updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if POSTed current password is correct
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  // If so, update password
  user.password = req.body.newPassword;
  await user.save();

  logger.logAuth('PASSWORD_UPDATED', user._id, {
    email: user.email,
    ip: req.ip
  });

  // Log user in, send JWT
  createSendToken(user, 200, res, 'Password updated successfully');
});

// Verify email
export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with this token and check if it hasn't expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Email verification token is invalid or has expired', 400));
  }

  // Update user
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  logger.logAuth('EMAIL_VERIFIED', user._id, {
    email: user.email,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// Resend verification email
export const resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // Generate new verification token
  const { verificationToken, hashedToken, expires } = generateEmailVerificationToken();
  
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expires;
  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  // await sendVerificationEmail(email, verificationToken);

  logger.logAuth('VERIFICATION_RESENT', user._id, {
    email: user.email,
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Verification email sent successfully',
    // In development, return the token
    ...(process.env.NODE_ENV === 'development' && { verificationToken })
  });
});

// Refresh JWT token
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body || req.cookies;

  if (!refreshToken) {
    return next(new AppError('Refresh token not provided', 401));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated.', 401));
  }

  logger.logAuth('TOKEN_REFRESHED', currentUser._id, {
    email: currentUser.email,
    ip: req.ip
  });

  // Generate new tokens
  createSendToken(currentUser, 200, res, 'Token refreshed successfully');
});

// Google OAuth login
export const googleLogin = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Google token is required', 400));
  }

  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return next(new AppError('Invalid Google token', 401));
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return next(new AppError('Google email is not verified', 400));
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user from Google data
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture,
        isEmailVerified: email_verified,
        password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
      });

      logger.logAuth('GOOGLE_USER_CREATED', user._id, {
        email: user.email,
        name: user.name,
        ip: req.ip
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save({ validateBeforeSave: false });

    logger.logAuth('GOOGLE_LOGIN_SUCCESS', user._id, {
      email: user.email,
      ip: req.ip
    });

    // Send token
    createSendToken(user, 200, res, 'Google login successful');
  } catch (error) {
    logger.logAuth('GOOGLE_LOGIN_FAILED', null, {
      error: error.message,
      ip: req.ip
    });
    
    return next(new AppError('Google authentication failed', 401));
  }
});

// Get current user info (for frontend to check auth status)
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageQuota: user.storageQuota,
        transferUsed: user.transferUsed,
        transferQuota: user.transferQuota,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    }
  });
});

export default {
  register,
  login,
  googleLogin,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  resendVerification,
  refreshToken,
  getMe
};