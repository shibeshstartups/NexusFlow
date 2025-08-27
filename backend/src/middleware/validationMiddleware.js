import { body, param, query, validationResult } from 'express-validator';
import { AppError, ValidationError, formatValidationErrors } from './errorMiddleware.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors);
    return next(new ValidationError(formattedErrors));
  }
  next();
};

// Common validation rules
export const commonValidation = {
  // MongoDB ObjectId validation
  objectId: (field = 'id') => 
    param(field)
      .isMongoId()
      .withMessage(`Invalid ${field} format`),

  // Email validation
  email: (field = 'email', required = true) => {
    const validator = body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address');
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Password validation
  password: (field = 'password', minLength = 6) =>
    body(field)
      .isLength({ min: minLength })
      .withMessage(`Password must be at least ${minLength} characters long`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Name validation
  name: (field = 'name', maxLength = 100) =>
    body(field)
      .trim()
      .isLength({ min: 1, max: maxLength })
      .withMessage(`${field} must be between 1 and ${maxLength} characters`),

  // Optional string validation
  optionalString: (field, maxLength = 500) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} cannot exceed ${maxLength} characters`),

  // Array validation
  array: (field, itemValidator) =>
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`)
      .custom((array) => {
        if (array.length > 50) {
          throw new Error(`${field} cannot contain more than 50 items`);
        }
        return true;
      }),

  // Boolean validation
  boolean: (field) =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean value`),

  // Number validation
  number: (field, options = {}) => {
    const { min = 0, max = Number.MAX_SAFE_INTEGER, required = false } = options;
    const validator = body(field)
      .isNumeric()
      .withMessage(`${field} must be a number`)
      .custom((value) => {
        const num = Number(value);
        if (num < min || num > max) {
          throw new Error(`${field} must be between ${min} and ${max}`);
        }
        return true;
      });
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // Date validation
  date: (field, required = false) => {
    const validator = body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid date`)
      .toDate();
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // URL validation
  url: (field, required = false) => {
    const validator = body(field)
      .isURL()
      .withMessage(`${field} must be a valid URL`);
    
    return required ? validator.notEmpty() : validator.optional();
  },

  // File size validation
  fileSize: (maxSize = 5368709120) => // 5GB default
    body('size')
      .optional()
      .isNumeric()
      .custom((value) => {
        if (Number(value) > maxSize) {
          throw new Error(`File size cannot exceed ${maxSize} bytes`);
        }
        return true;
      }),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name', 'size', '-size'])
      .withMessage('Invalid sort parameter')
  ]
};

// User validation rules
export const userValidation = {
  register: [
    commonValidation.name('name'),
    commonValidation.email('email'),
    commonValidation.password('password'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    handleValidationErrors
  ],

  login: [
    commonValidation.email('email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  updateProfile: [
    commonValidation.name('name').optional(),
    commonValidation.email('email').optional(),
    commonValidation.optionalString('avatar', 500),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
    handleValidationErrors
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidation.password('newPassword'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      }),
    handleValidationErrors
  ],

  forgotPassword: [
    commonValidation.email('email'),
    handleValidationErrors
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    commonValidation.password('password'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    handleValidationErrors
  ]
};

// Client validation rules
export const clientValidation = {
  create: [
    commonValidation.name('name'),
    commonValidation.email('email'),
    commonValidation.optionalString('phone', 20),
    commonValidation.optionalString('company', 200),
    commonValidation.optionalString('notes', 1000),
    body('address')
      .optional()
      .isObject()
      .withMessage('Address must be an object'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    handleValidationErrors
  ],

  update: [
    commonValidation.objectId('id'),
    commonValidation.name('name').optional(),
    commonValidation.email('email').optional(),
    commonValidation.optionalString('phone', 20),
    commonValidation.optionalString('company', 200),
    commonValidation.optionalString('notes', 1000),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'archived'])
      .withMessage('Status must be active, inactive, or archived'),
    handleValidationErrors
  ],

  getById: [
    commonValidation.objectId('id'),
    handleValidationErrors
  ]
};

// Project validation rules
export const projectValidation = {
  create: [
    commonValidation.name('name', 200),
    commonValidation.optionalString('description', 1000),
    commonValidation.objectId('client'),
    body('category')
      .optional()
      .isIn(['photography', 'videography', 'design', 'web', 'marketing', 'other'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with maximum 20 items'),
    body('timeline')
      .optional()
      .isObject()
      .withMessage('Timeline must be an object'),
    handleValidationErrors
  ],

  update: [
    commonValidation.objectId('id'),
    commonValidation.name('name', 200).optional(),
    commonValidation.optionalString('description', 1000),
    body('status')
      .optional()
      .isIn(['draft', 'active', 'in_progress', 'review', 'completed', 'archived', 'cancelled'])
      .withMessage('Invalid status'),
    body('category')
      .optional()
      .isIn(['photography', 'videography', 'design', 'web', 'marketing', 'other'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    handleValidationErrors
  ],

  sharing: [
    commonValidation.objectId('id'),
    commonValidation.boolean('isEnabled'),
    commonValidation.optionalString('password', 100),
    commonValidation.boolean('allowUploads'),
    commonValidation.boolean('allowDownloads'),
    commonValidation.boolean('allowComments'),
    commonValidation.date('expiresAt'),
    commonValidation.number('maxAccessCount', { min: 1, max: 10000 }),
    body('allowedEmails')
      .optional()
      .isArray()
      .withMessage('Allowed emails must be an array'),
    handleValidationErrors
  ]
};

// File validation rules
export const fileValidation = {
  upload: [
    body('projectId')
      .isMongoId()
      .withMessage('Invalid project ID'),
    body('folderId')
      .optional()
      .isMongoId()
      .withMessage('Invalid folder ID'),
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with maximum 20 items'),
    body('category')
      .optional()
      .isIn(['raw', 'edited', 'final', 'draft', 'archive'])
      .withMessage('Invalid category'),
    handleValidationErrors
  ],

  update: [
    commonValidation.objectId('id'),
    commonValidation.optionalString('displayName', 255),
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with maximum 20 items'),
    body('category')
      .optional()
      .isIn(['raw', 'edited', 'final', 'draft', 'archive'])
      .withMessage('Invalid category'),
    commonValidation.boolean('isFavorite'),
    handleValidationErrors
  ],

  sharing: [
    commonValidation.objectId('id'),
    commonValidation.boolean('isPublic'),
    commonValidation.optionalString('password', 100),
    commonValidation.boolean('allowDownload'),
    commonValidation.date('expiresAt'),
    commonValidation.number('maxAccessCount', { min: 1, max: 10000 }),
    body('allowedEmails')
      .optional()
      .isArray()
      .withMessage('Allowed emails must be an array'),
    handleValidationErrors
  ],

  move: [
    commonValidation.objectId('id'),
    body('folderId')
      .optional()
      .isMongoId()
      .withMessage('Invalid folder ID'),
    handleValidationErrors
  ]
};

// Folder validation rules
export const folderValidation = {
  create: [
    commonValidation.name('name', 255),
    commonValidation.objectId('project'),
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent folder ID'),
    commonValidation.optionalString('description', 500),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage('Color must be a valid hex color'),
    handleValidationErrors
  ],

  update: [
    commonValidation.objectId('id'),
    commonValidation.name('name', 255).optional(),
    commonValidation.optionalString('description', 500),
    body('color')
      .optional()
      .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .withMessage('Color must be a valid hex color'),
    handleValidationErrors
  ],

  move: [
    commonValidation.objectId('id'),
    body('parentId')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent folder ID'),
    handleValidationErrors
  ]
};

// Search and filter validation
export const searchValidation = {
  files: [
    query('q')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search query cannot exceed 200 characters'),
    query('type')
      .optional()
      .isIn(['image', 'video', 'audio', 'document', 'archive', 'other'])
      .withMessage('Invalid file type'),
    query('category')
      .optional()
      .isIn(['raw', 'edited', 'final', 'draft', 'archive'])
      .withMessage('Invalid category'),
    query('project')
      .optional()
      .isMongoId()
      .withMessage('Invalid project ID'),
    query('folder')
      .optional()
      .isMongoId()
      .withMessage('Invalid folder ID'),
    ...commonValidation.pagination(),
    handleValidationErrors
  ],

  projects: [
    query('q')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search query cannot exceed 200 characters'),
    query('status')
      .optional()
      .isIn(['draft', 'active', 'in_progress', 'review', 'completed', 'archived', 'cancelled'])
      .withMessage('Invalid status'),
    query('client')
      .optional()
      .isMongoId()
      .withMessage('Invalid client ID'),
    query('category')
      .optional()
      .isIn(['photography', 'videography', 'design', 'web', 'marketing', 'other'])
      .withMessage('Invalid category'),
    ...commonValidation.pagination(),
    handleValidationErrors
  ]
};

// Share link validation
export const shareValidation = {
  access: [
    param('token')
      .isLength({ min: 64, max: 64 })
      .isAlphanumeric()
      .withMessage('Invalid share token'),
    body('password')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Password too long'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    handleValidationErrors
  ]
};

// Custom validation functions
export const customValidation = {
  // Check if user exists
  userExists: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  // Check if client belongs to user
  clientBelongsToUser: async (clientId, userId) => {
    const client = await Client.findOne({ _id: clientId, owner: userId });
    if (!client) {
      throw new AppError('Client not found or access denied', 404);
    }
    return client;
  },

  // Check if project belongs to user
  projectBelongsToUser: async (projectId, userId) => {
    const project = await Project.findOne({ _id: projectId, owner: userId });
    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }
    return project;
  },

  // Validate file upload requirements
  validateFileUpload: (file, user) => {
    // Check file size
    if (file.size > (process.env.MAX_FILE_SIZE || 5368709120)) {
      throw new AppError('File size exceeds maximum limit', 413);
    }

    // Check storage quota
    if (!user.hasStorageCapacity(file.size)) {
      throw new AppError('Storage quota exceeded', 413);
    }

    // Check file type
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/', 'application/zip'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (!isAllowed) {
      throw new AppError('File type not allowed', 400);
    }

    return true;
  }
};

export default {
  commonValidation,
  userValidation,
  clientValidation,
  projectValidation,
  fileValidation,
  folderValidation,
  searchValidation,
  shareValidation,
  customValidation,
  handleValidationErrors
};