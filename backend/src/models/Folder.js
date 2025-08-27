import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [255, 'Folder name cannot exceed 255 characters']
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
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 20 // Limit folder nesting depth
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    default: '#3B82F6' // Default blue color
  },
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
    expiresAt: Date,
    accessCount: {
      type: Number,
      default: 0
    },
    maxAccessCount: Number,
    allowedEmails: [String]
  },
  permissions: {
    canEdit: {
      type: Boolean,
      default: true
    },
    canDelete: {
      type: Boolean,
      default: true
    },
    canShare: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    totalFiles: {
      type: Number,
      default: 0
    },
    totalSubfolders: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    lastFileAdded: Date,
    fileTypes: [{
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive', 'other']
    }]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for breadcrumb path
folderSchema.virtual('breadcrumb').get(function() {
  return this.fullPath.split('/').filter(segment => segment !== '');
});

// Virtual for formatted share link
folderSchema.virtual('formattedShareLink').get(function() {
  if (this.sharing.isEnabled && this.sharing.shareToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/shared/folder/${this.sharing.shareToken}`;
  }
  return null;
});

// Virtual for depth-based indentation
folderSchema.virtual('indentation').get(function() {
  return '  '.repeat(this.depth);
});

// Indexes for better query performance
folderSchema.index({ owner: 1, project: 1, isDeleted: 1 });
folderSchema.index({ parent: 1, isDeleted: 1 });
folderSchema.index({ fullPath: 1, project: 1 });
folderSchema.index({ 'sharing.shareToken': 1 });
folderSchema.index({ tags: 1 });
folderSchema.index({ lastActivity: -1 });

// Text search index
folderSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Compound indexes
folderSchema.index({ project: 1, parent: 1, isDeleted: 1 });
folderSchema.index({ owner: 1, isDeleted: 1, lastActivity: -1 });

// Unique compound index for folder names within the same parent
folderSchema.index(
  { name: 1, parent: 1, project: 1, isDeleted: 1 },
  { unique: true }
);

// Pre-save middleware
folderSchema.pre('save', async function(next) {
  try {
    // Generate slug
    if (this.isModified('name')) {
      this.slug = this.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Calculate path and fullPath
    if (this.isModified('name') || this.isModified('parent')) {
      if (this.parent) {
        const parentFolder = await mongoose.model('Folder').findById(this.parent);
        if (!parentFolder) {
          throw new Error('Parent folder not found');
        }
        
        this.depth = parentFolder.depth + 1;
        this.path = `${parentFolder.path}/${this.slug}`;
        this.fullPath = `${parentFolder.fullPath}/${this.name}`;
      } else {
        this.depth = 0;
        this.path = `/${this.slug}`;
        this.fullPath = `/${this.name}`;
      }
    }

    // Update share link when share token changes
    if (this.isModified('sharing.shareToken') && this.sharing.shareToken) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.sharing.shareLink = `${baseUrl}/shared/folder/${this.sharing.shareToken}`;
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

// Pre-remove middleware to handle cascading deletion
folderSchema.pre('remove', async function(next) {
  try {
    // Soft delete all subfolders
    await mongoose.model('Folder').updateMany(
      { parent: this._id },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );

    // Soft delete all files in this folder
    await mongoose.model('File').updateMany(
      { folder: this._id },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );

    next();
  } catch (error) {
    next(error);
  }
});

// Method to generate share token
folderSchema.methods.generateShareToken = async function() {
  const crypto = await import('crypto');
  this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
  this.sharing.isEnabled = true;
  return this.sharing.shareToken;
};

// Method to get all parent folders
folderSchema.methods.getParents = async function() {
  const parents = [];
  let currentFolder = this;

  while (currentFolder.parent) {
    const parent = await mongoose.model('Folder').findById(currentFolder.parent);
    if (!parent) break;
    parents.unshift(parent);
    currentFolder = parent;
  }

  return parents;
};

// Method to get all child folders (recursive)
folderSchema.methods.getAllChildren = async function() {
  const children = await mongoose.model('Folder').find({ 
    parent: this._id, 
    isDeleted: { $ne: true } 
  });

  let allChildren = [...children];

  for (const child of children) {
    const grandchildren = await child.getAllChildren();
    allChildren = allChildren.concat(grandchildren);
  }

  return allChildren;
};

// Method to get folder tree structure
folderSchema.methods.getTreeStructure = async function() {
  const subfolders = await mongoose.model('Folder').find({
    parent: this._id,
    isDeleted: { $ne: true }
  }).sort({ name: 1 });

  const files = await mongoose.model('File').find({
    folder: this._id,
    isDeleted: { $ne: true }
  }).sort({ name: 1 });

  return {
    folder: this,
    subfolders: await Promise.all(subfolders.map(subfolder => subfolder.getTreeStructure())),
    files: files
  };
};

// Method to update metadata
folderSchema.methods.updateMetadata = async function() {
  const File = mongoose.model('File');
  const Folder = mongoose.model('Folder');

  // Count direct files
  const fileStats = await File.aggregate([
    { 
      $match: { 
        folder: this._id, 
        isDeleted: { $ne: true } 
      } 
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        fileTypes: { $addToSet: '$type' },
        lastFileAdded: { $max: '$createdAt' }
      }
    }
  ]);

  // Count direct subfolders
  const subfolderCount = await Folder.countDocuments({
    parent: this._id,
    isDeleted: { $ne: true }
  });

  // Get stats from all children recursively
  const allChildren = await this.getAllChildren();
  let totalFilesIncludingChildren = 0;
  let totalSizeIncludingChildren = 0;
  const allFileTypes = new Set();

  for (const child of allChildren) {
    const childFileStats = await File.aggregate([
      { 
        $match: { 
          folder: child._id, 
          isDeleted: { $ne: true } 
        } 
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          fileTypes: { $addToSet: '$type' }
        }
      }
    ]);

    if (childFileStats.length > 0) {
      totalFilesIncludingChildren += childFileStats[0].totalFiles || 0;
      totalSizeIncludingChildren += childFileStats[0].totalSize || 0;
      (childFileStats[0].fileTypes || []).forEach(type => allFileTypes.add(type));
    }
  }

  // Update metadata
  this.metadata = {
    totalFiles: (fileStats[0]?.totalFiles || 0) + totalFilesIncludingChildren,
    totalSubfolders: subfolderCount,
    totalSize: (fileStats[0]?.totalSize || 0) + totalSizeIncludingChildren,
    lastFileAdded: fileStats[0]?.lastFileAdded || this.metadata.lastFileAdded,
    fileTypes: Array.from(new Set([
      ...(fileStats[0]?.fileTypes || []),
      ...Array.from(allFileTypes)
    ]))
  };

  return this.save();
};

// Method to move folder to new parent
folderSchema.methods.moveTo = async function(newParentId) {
  // Validate that we're not creating a circular reference
  if (newParentId) {
    const newParent = await mongoose.model('Folder').findById(newParentId);
    if (!newParent) {
      throw new Error('New parent folder not found');
    }

    // Check if newParent is a descendant of this folder
    const newParentParents = await newParent.getParents();
    if (newParentParents.some(parent => parent._id.equals(this._id))) {
      throw new Error('Cannot move folder to its own descendant');
    }

    // Check depth limit
    if (newParent.depth >= 19) { // Allow one more level
      throw new Error('Maximum folder depth reached');
    }
  }

  this.parent = newParentId;
  await this.save();

  // Update all children paths
  const children = await this.getAllChildren();
  for (const child of children) {
    await child.save(); // This will trigger the pre-save middleware to update paths
  }

  return this;
};

// Static method to create folder tree
folderSchema.statics.createTree = async function(projectId, ownerId) {
  const folders = await this.find({
    project: projectId,
    owner: ownerId,
    isDeleted: { $ne: true }
  }).sort({ fullPath: 1 });

  const tree = [];
  const folderMap = new Map();

  for (const folder of folders) {
    folderMap.set(folder._id.toString(), { ...folder.toObject(), children: [] });
  }

  for (const folder of folders) {
    const folderObj = folderMap.get(folder._id.toString());
    
    if (folder.parent) {
      const parent = folderMap.get(folder.parent.toString());
      if (parent) {
        parent.children.push(folderObj);
      }
    } else {
      tree.push(folderObj);
    }
  }

  return tree;
};

// Static method to find by path
folderSchema.statics.findByPath = function(projectId, path) {
  return this.findOne({
    project: projectId,
    fullPath: path,
    isDeleted: { $ne: true }
  });
};

const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
