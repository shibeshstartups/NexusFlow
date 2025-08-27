import User from '../models/User.js';
import { AppError, catchAsync } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

// Get current user
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

// Update current user
export const updateMe = catchAsync(async (req, res, next) => {
  // Filter allowed fields
  const allowedFields = ['name', 'avatar', 'preferences'];
  const updates = {};
  
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true
  });

  logger.logAuth('PROFILE_UPDATED', user._id, {
    updates: Object.keys(updates),
    ip: req.ip
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

// Delete current user (soft delete)
export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { isActive: false });

  logger.logAuth('ACCOUNT_DELETED', req.user.id, {
    email: req.user.email,
    ip: req.ip
  });

  res.status(204).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

// Admin only - Get all users
export const getUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50, search, role, plan, isActive } = req.query;
  
  const filters = {};
  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role) filters.role = role;
  if (plan) filters.plan = plan;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const users = await User.find(filters)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filters);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// Admin only - Get single user
export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { user }
  });
});

// Admin only - Update user
export const updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

// Admin only - Delete user
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id, 
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Placeholder functions for photo upload
export const uploadUserPhoto = (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Photo upload functionality will be implemented'
  });
};

export const resizeUserPhoto = (req, res, next) => {
  next();
};

export default {
  getMe,
  updateMe,
  deleteMe,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
  resizeUserPhoto
};