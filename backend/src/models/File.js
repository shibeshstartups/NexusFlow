import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true,
    maxlength: [255, 'Filename cannot exceed 255 characters']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    index: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  fullPath: {
    type: String,
    required: true,
    index: true
  },
  relativePath: {
    type: String,
    required: true
  },
  // R2/Cloud storage specific fields
  storage: {
    provider: {
      type: String,
      enum: ['local', 'r2', 'gridfs'],
      default: 'r2'
    },
    key: {
      type: String,
      required: true,
      index: true // R2 object key
    },
    bucket: {
      type: String,
      default: process.env.CLOUDFLARE_R2_BUCKET_NAME
    },
    etag: String, // R2 ETag for integrity verification
    url: String, // Public/presigned URL
    region: {
      type: String,
      default: 'auto'
    },
    uploadId: String, // For multipart uploads tracking
    lastSync: {
      type: Date,
      default: Date.now
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
    required: true,
    index: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extension: {
    type: String,
    required: true,
    lowercase: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  checksum: {
    type: String,
    required: true,
    index: true // For deduplication
  },
  encoding: String,
  // GridFS file ID for large files
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  // File metadata
  metadata: {
    // Image metadata
    dimensions: {
      width: Number,
      height: Number
    },
    // Video metadata
    duration: Number, // in seconds
    framerate: Number,
    bitrate: Number,
    resolution: String,
    // Audio metadata
    artist: String,
    album: String,
    genre: String,
    // Document metadata
    pageCount: Number,
    wordCount: Number,
    // EXIF data for images
    exif: {
      camera: String,
      lens: String,
      focalLength: Number,
      aperture: String,
      shutterSpeed: String,
      iso: Number,
      timestamp: Date,
      gps: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  // Thumbnails and previews (R2-based)
  thumbnails: [{
    size: {
      type: String,
      enum: ['small', 'medium', 'large'] // 150px, 300px, 600px
    },
    storage: {
      key: String, // R2 key for thumbnail
      url: String, // Public URL for thumbnail
      etag: String
    },
    dimensions: {
      width: Number,
      height: Number
    },
    fileSize: Number
  }],
  preview: {
    storage: {
      key: String, // R2 key for preview
      url: String, // Public URL for preview
      etag: String
    },
    type: {
      type: String,
      enum: ['image', 'video']
    },
    fileSize: Number
  },
  // Sharing and access control
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    shareLink: String,
    password: String, // Hashed password for protected sharing
    allowDownload: {
      type: Boolean,
      default: true
    },
    expiresAt: Date,
    accessCount: {
      type: Number,
      default: 0
    },
    maxAccessCount: Number,
    allowedEmails: [String],
    downloadLimit: Number,
    watermark: {
      enabled: { type: Boolean, default: false },
      text: String,
      opacity: { type: Number, default: 0.5 }
    }
  },
  // File processing status
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    thumbnailGenerated: {
      type: Boolean,
      default: false
    },
    previewGenerated: {
      type: Boolean,
      default: false
    },
    metadataExtracted: {
      type: Boolean,
      default: false
    },
    error: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  // Analytics and tracking
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    lastDownloaded: Date,
    lastShared: Date,
    uniqueViewers: [{
      ip: String,
      userAgent: String,
      timestamp: Date
    }]
  },
  // File versioning
  versioning: {
    isLatest: {
      type: Boolean,
      default: true
    },
    version: {
      type: Number,
      default: 1
    },
    parentFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    changeNote: String
  },
  // File status and flags
  status: {
    type: String,
    enum: ['active', 'archived', 'processing', 'corrupted'],
    default: 'active',
    index: true
  },
  flags: {
    isFavorite: {
      type: Boolean,
      default: false
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    isProtected: {
      type: Boolean,
      default: false
    },
    hasVirus: {
      type: Boolean,
      default: false
    }
  },
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  category: {
    type: String,
    enum: ['raw', 'edited', 'final', 'draft', 'archive'],
    default: 'raw'
  },
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Upload tracking
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadSession: String,
  uploadProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
fileSchema.virtual('formattedSize').get(function() {
  if (this.size === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(this.size) / Math.log(k));
  return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

fileSchema.virtual('formattedShareLink').get(function() {
  if (this.sharing.shareToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/shared/file/${this.sharing.shareToken}`;
  }
  return null;
});

fileSchema.virtual('isImage').get(function() {
  return this.type === 'image';
});

fileSchema.virtual('isVideo').get(function() {
  return this.type === 'video';
});

fileSchema.virtual('isDocument').get(function() {
  return this.type === 'document';
});

fileSchema.virtual('aspectRatio').get(function() {
  if (this.metadata.dimensions && this.metadata.dimensions.width && this.metadata.dimensions.height) {
    return this.metadata.dimensions.width / this.metadata.dimensions.height;
  }
  return null;
});

// Indexes for better query performance
fileSchema.index({ owner: 1, project: 1, isDeleted: 1 });
fileSchema.index({ folder: 1, isDeleted: 1 });
fileSchema.index({ type: 1, status: 1 });
fileSchema.index({ 'sharing.shareToken': 1 });
fileSchema.index({ checksum: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ lastActivity: -1 });
fileSchema.index({ size: -1 });
fileSchema.index({ 'analytics.viewCount': -1 });
fileSchema.index({ 'analytics.downloadCount': -1 });

// Text search index
fileSchema.index({
  filename: 'text',
  originalName: 'text',
  displayName: 'text',
  tags: 'text'
});

// Compound indexes
fileSchema.index({ project: 1, type: 1, isDeleted: 1 });
fileSchema.index({ owner: 1, type: 1, createdAt: -1 });
fileSchema.index({ client: 1, type: 1, isDeleted: 1 });
fileSchema.index({ 'versioning.parentFileId': 1, 'versioning.isLatest': 1 });

// Unique compound index for preventing duplicate files
fileSchema.index(
  { checksum: 1, project: 1, isDeleted: 1 },
  { unique: true }
);

// Pre-save middleware
fileSchema.pre('save', async function(next) {
  try {
    // Generate display name if not set
    if (!this.displayName) {
      this.displayName = this.originalName;
    }

    // Generate slug
    if (this.isModified('displayName')) {
      this.slug = this.displayName.toLowerCase()
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Update share link when share token changes
    if (this.isModified('sharing.shareToken') && this.sharing.shareToken) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.sharing.shareLink = `${baseUrl}/shared/file/${this.sharing.shareToken}`;
    }

    // Set full path
    if (this.folder) {
      const folder = await mongoose.model('Folder').findById(this.folder);
      if (folder) {
        this.fullPath = `${folder.fullPath}/${this.displayName}`;
      }
    } else {
      this.fullPath = `/${this.displayName}`;
    }

    // Update lastActivity
    if (this.isModified() && !this.isModified('lastActivity')) {
      this.lastActivity = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update project metrics
fileSchema.post('save', async function() {
  if (this.project) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project);
    if (project) {
      await project.updateMetrics();
    }
  }

  if (this.folder) {
    const Folder = mongoose.model('Folder');
    const folder = await Folder.findById(this.folder);
    if (folder) {
      await folder.updateMetadata();
    }
  }
});

// Methods
fileSchema.methods.generateShareToken = async function() {
  const crypto = await import('crypto');
  this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
  return this.sharing.shareToken;
};

fileSchema.methods.enableSharing = async function(options = {}) {
  if (!this.sharing.shareToken) {
    await this.generateShareToken();
  }

  this.sharing.isPublic = true;
  this.sharing.allowDownload = options.allowDownload !== false;
  this.sharing.expiresAt = options.expiresAt || null;
  this.sharing.maxAccessCount = options.maxAccessCount || null;
  this.sharing.downloadLimit = options.downloadLimit || null;
  this.sharing.allowedEmails = options.allowedEmails || [];

  if (options.password) {
    const bcrypt = await import('bcryptjs');
    this.sharing.password = await bcrypt.hash(options.password, 12);
  }

  return this.save();
};

fileSchema.methods.disableSharing = function() {
  this.sharing.isPublic = false;
  return this.save();
};

fileSchema.methods.canAccess = async function(email = null, password = null) {
  if (!this.sharing.isPublic) {
    return { allowed: false, reason: 'File not shared' };
  }

  // Check expiration
  if (this.sharing.expiresAt && new Date() > this.sharing.expiresAt) {
    return { allowed: false, reason: 'Share link expired' };
  }

  // Check access count limit
  if (this.sharing.maxAccessCount && this.sharing.accessCount >= this.sharing.maxAccessCount) {
    return { allowed: false, reason: 'Access limit reached' };
  }

  // Check email restrictions
  if (this.sharing.allowedEmails.length > 0 && (!email || !this.sharing.allowedEmails.includes(email))) {
    return { allowed: false, reason: 'Email not authorized' };
  }

  // Check password
  if (this.sharing.password) {
    if (!password) {
      return { allowed: false, reason: 'Password required' };
    }

    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, this.sharing.password);
    if (!isValidPassword) {
      return { allowed: false, reason: 'Invalid password' };
    }
  }

  return { allowed: true };
};

fileSchema.methods.incrementView = function(ip = null, userAgent = null) {
  this.analytics.viewCount = (this.analytics.viewCount || 0) + 1;
  this.analytics.lastViewed = new Date();

  if (ip) {
    if (!this.analytics.uniqueViewers) {
      this.analytics.uniqueViewers = [];
    }

    // Check if this IP already viewed (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingView = this.analytics.uniqueViewers.find(
      viewer => viewer.ip === ip && viewer.timestamp > oneDayAgo
    );

    if (!existingView) {
      this.analytics.uniqueViewers.push({
        ip,
        userAgent: userAgent || 'Unknown',
        timestamp: new Date()
      });

      // Keep only last 100 unique viewers
      if (this.analytics.uniqueViewers.length > 100) {
        this.analytics.uniqueViewers = this.analytics.uniqueViewers.slice(-100);
      }
    }
  }

  return this.save();
};

fileSchema.methods.incrementDownload = function() {
  this.analytics.downloadCount = (this.analytics.downloadCount || 0) + 1;
  this.analytics.lastDownloaded = new Date();
  return this.save();
};

fileSchema.methods.incrementShare = function() {
  this.analytics.shareCount = (this.analytics.shareCount || 0) + 1;
  this.analytics.lastShared = new Date();
  return this.save();
};

fileSchema.methods.createVersion = async function(newFileData, changeNote = '') {
  // Mark current file as not latest
  this.versioning.isLatest = false;
  await this.save();

  // Create new version
  const newVersion = new mongoose.model('File')({
    ...newFileData,
    versioning: {
      isLatest: true,
      version: this.versioning.version + 1,
      parentFileId: this.versioning.parentFileId || this._id,
      changeNote
    }
  });

  return newVersion.save();
};

fileSchema.methods.getVersionHistory = function() {
  const parentId = this.versioning.parentFileId || this._id;
  return mongoose.model('File').find({
    $or: [
      { _id: parentId },
      { 'versioning.parentFileId': parentId }
    ],
    isDeleted: { $ne: true }
  }).sort({ 'versioning.version': -1 });
};

fileSchema.methods.moveTo = async function(newFolderId) {
  if (newFolderId) {
    const folder = await mongoose.model('Folder').findById(newFolderId);
    if (!folder) {
      throw new Error('Destination folder not found');
    }
    
    if (folder.project.toString() !== this.project.toString()) {
      throw new Error('Cannot move file to folder in different project');
    }
  }

  this.folder = newFolderId;
  return this.save();
};

// Static methods
fileSchema.statics.findWithFilters = function(ownerId, filters = {}, options = {}) {
  const query = { owner: ownerId, isDeleted: { $ne: true } };

  const { 
    project, 
    folder, 
    type, 
    category, 
    tags, 
    search, 
    dateRange, 
    sizeRange,
    isFavorite,
    status
  } = filters;
  
  const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

  if (project) query.project = project;
  if (folder) query.folder = folder;
  if (type) query.type = type;
  if (category) query.category = category;
  if (status) query.status = status;
  if (isFavorite !== undefined) query['flags.isFavorite'] = isFavorite;
  if (tags && tags.length > 0) query.tags = { $in: tags };

  if (search) {
    query.$text = { $search: search };
  }

  if (dateRange) {
    if (dateRange.start || dateRange.end) {
      query.createdAt = {};
      if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
    }
  }

  if (sizeRange) {
    if (sizeRange.min || sizeRange.max) {
      query.size = {};
      if (sizeRange.min) query.size.$gte = sizeRange.min;
      if (sizeRange.max) query.size.$lte = sizeRange.max;
    }
  }

  return this.find(query)
    .populate('folder', 'name fullPath')
    .populate('project', 'name')
    .populate('uploadedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

fileSchema.statics.getStorageStats = function(ownerId, projectId = null) {
  const matchQuery = { owner: mongoose.Types.ObjectId(ownerId), isDeleted: { $ne: true } };
  if (projectId) {
    matchQuery.project = mongoose.Types.ObjectId(projectId);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' }
      }
    },
    { $sort: { totalSize: -1 } }
  ]);
};

const File = mongoose.model('File', fileSchema);

export default File;
