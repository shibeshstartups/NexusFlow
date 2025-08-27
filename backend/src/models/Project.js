import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'in_progress', 'review', 'completed', 'archived', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['photography', 'videography', 'design', 'web', 'marketing', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  sharing: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true
    },
    shareLink: String,
    password: String, // Hashed password for protected sharing
    allowUploads: {
      type: Boolean,
      default: false
    },
    allowDownloads: {
      type: Boolean,
      default: true
    },
    allowComments: {
      type: Boolean,
      default: false
    },
    expiresAt: Date,
    accessCount: {
      type: Number,
      default: 0
    },
    maxAccessCount: Number,
    allowedEmails: [String], // Restrict access to specific emails
    watermark: {
      enabled: { type: Boolean, default: false },
      text: String,
      opacity: { type: Number, default: 0.5 }
    }
  },
  timeline: {
    startDate: Date,
    endDate: Date,
    deliveryDate: Date
  },
  budget: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  },
  collaboration: {
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['viewer', 'editor', 'admin'],
        default: 'viewer'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    allowClientUploads: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    autoGenerateThumbnails: {
      type: Boolean,
      default: true
    },
    compressImages: {
      type: Boolean,
      default: false
    },
    retainOriginals: {
      type: Boolean,
      default: true
    },
    allowedFileTypes: [{
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive']
    }],
    maxFileSize: {
      type: Number,
      default: 5368709120 // 5GB
    }
  },
  metrics: {
    totalFiles: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    photosCount: {
      type: Number,
      default: 0
    },
    videosCount: {
      type: Number,
      default: 0
    },
    documentsCount: {
      type: Number,
      default: 0
    },
    totalDownloads: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    }
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

// Virtual for formatted share link
projectSchema.virtual('formattedShareLink').get(function() {
  if (this.sharing.isEnabled && this.sharing.shareToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/shared/project/${this.sharing.shareToken}`;
  }
  return null;
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.timeline.startDate && this.timeline.endDate) {
    return Math.ceil((this.timeline.endDate - this.timeline.startDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for storage usage percentage
projectSchema.virtual('storageUsagePercentage').get(function() {
  const maxSize = this.settings.maxFileSize || 5368709120;
  return maxSize > 0 ? (this.metrics.totalSize / maxSize) * 100 : 0;
});

// Indexes for better query performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ 'sharing.shareToken': 1 });
projectSchema.index({ slug: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ lastActivity: -1 });
projectSchema.index({ createdAt: -1 });

// Text search index
projectSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Compound indexes
projectSchema.index({ owner: 1, client: 1, status: 1 });
projectSchema.index({ 'timeline.deliveryDate': 1, status: 1 });

// Pre-save middleware to generate slug
projectSchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    const baseSlug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await mongoose.model('Project').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Update share link when share token changes
  if (this.isModified('sharing.shareToken') && this.sharing.shareToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.sharing.shareLink = `${baseUrl}/shared/project/${this.sharing.shareToken}`;
  }
  
  // Update lastActivity
  if (this.isModified() && !this.isModified('lastActivity')) {
    this.lastActivity = new Date();
  }
  
  next();
});

// Method to generate share token
projectSchema.methods.generateShareToken = async function() {
  const crypto = await import('crypto');
  this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
  this.sharing.isEnabled = true;
  return this.sharing.shareToken;
};

// Method to enable sharing
projectSchema.methods.enableSharing = async function(options = {}) {
  if (!this.sharing.shareToken) {
    await this.generateShareToken();
  }
  
  this.sharing.isEnabled = true;
  this.sharing.allowUploads = options.allowUploads || false;
  this.sharing.allowDownloads = options.allowDownloads !== false;
  this.sharing.allowComments = options.allowComments || false;
  this.sharing.expiresAt = options.expiresAt || null;
  this.sharing.maxAccessCount = options.maxAccessCount || null;
  this.sharing.allowedEmails = options.allowedEmails || [];
  
  if (options.password) {
    const bcrypt = await import('bcryptjs');
    this.sharing.password = await bcrypt.hash(options.password, 12);
  }
  
  return this.save();
};

// Method to disable sharing
projectSchema.methods.disableSharing = function() {
  this.sharing.isEnabled = false;
  return this.save();
};

// Method to check if user can access shared project
projectSchema.methods.canAccess = async function(email = null, password = null) {
  if (!this.sharing.isEnabled) {
    return { allowed: false, reason: 'Sharing not enabled' };
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

// Method to increment access count
projectSchema.methods.incrementAccessCount = function() {
  this.sharing.accessCount = (this.sharing.accessCount || 0) + 1;
  return this.save();
};

// Method to update metrics
projectSchema.methods.updateMetrics = async function() {
  const File = mongoose.model('File');
  
  const metrics = await File.aggregate([
    { $match: { project: this._id, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        photosCount: {
          $sum: { $cond: [{ $eq: ['$type', 'image'] }, 1, 0] }
        },
        videosCount: {
          $sum: { $cond: [{ $eq: ['$type', 'video'] }, 1, 0] }
        },
        documentsCount: {
          $sum: { $cond: [{ $in: ['$type', ['document', 'pdf']] }, 1, 0] }
        },
        totalDownloads: { $sum: '$downloadCount' },
        totalViews: { $sum: '$viewCount' }
      }
    }
  ]);
  
  if (metrics.length > 0) {
    this.metrics = { ...this.metrics, ...metrics[0] };
    delete this.metrics._id;
  } else {
    this.metrics = {
      totalFiles: 0,
      totalSize: 0,
      photosCount: 0,
      videosCount: 0,
      documentsCount: 0,
      totalDownloads: 0,
      totalViews: 0
    };
  }
  
  return this.save();
};

// Static method to find projects with pagination and filtering
projectSchema.statics.findWithFilters = function(ownerId, filters = {}, options = {}) {
  const query = { owner: ownerId };
  
  const { status, client, category, priority, tags, search, dateRange } = filters;
  const { limit = 20, skip = 0, sort = { lastActivity: -1 } } = options;
  
  if (status) query.status = status;
  if (client) query.client = client;
  if (category) query.category = category;
  if (priority) query.priority = priority;
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
  
  return this.find(query)
    .populate('client', 'name company email')
    .populate('owner', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
