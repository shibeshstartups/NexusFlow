import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  avatar: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  socialMedia: {
    website: String,
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String
  },
  preferences: {
    allowDirectUploads: {
      type: Boolean,
      default: false
    },
    notifications: {
      email: { type: Boolean, default: true },
      newProjects: { type: Boolean, default: true },
      fileUploads: { type: Boolean, default: true }
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download', 'upload', 'manage'],
      default: 'download'
    }
  },
  billing: {
    isActive: { type: Boolean, default: false },
    billingEmail: String,
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    taxId: String
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  contractStartDate: Date,
  contractEndDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for projects count
clientSchema.virtual('projectsCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'client',
  count: true
});

// Virtual for total files count across all projects
clientSchema.virtual('totalFilesCount', {
  ref: 'File',
  localField: '_id',
  foreignField: 'client',
  count: true
});

// Virtual for full name (for search purposes)
clientSchema.virtual('fullInfo').get(function() {
  return `${this.name} ${this.company || ''} ${this.email}`.trim();
});

// Indexes for better query performance
clientSchema.index({ owner: 1, status: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ company: 1 });
clientSchema.index({ tags: 1 });
clientSchema.index({ lastActivity: -1 });

// Text search index
clientSchema.index({
  name: 'text',
  company: 'text',
  email: 'text',
  notes: 'text'
});

// Pre-save middleware to update lastActivity
clientSchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('lastActivity')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to check if client is active
clientSchema.methods.isActive = function() {
  return this.status === 'active';
};

// Method to get active projects
clientSchema.methods.getActiveProjects = function() {
  return mongoose.model('Project').find({ 
    client: this._id, 
    status: { $in: ['active', 'in_progress'] } 
  });
};

// Static method to find clients by owner with search
clientSchema.statics.findByOwnerWithSearch = function(ownerId, searchQuery = '', options = {}) {
  const query = { owner: ownerId };
  
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }
  
  const { status, tags, limit = 50, skip = 0, sort = { lastActivity: -1 } } = options;
  
  if (status) {
    query.status = status;
  }
  
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  
  return this.find(query)
    .populate('projectsCount')
    .populate('totalFilesCount')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to get client statistics
clientSchema.statics.getStatistics = function(ownerId) {
  return this.aggregate([
    { $match: { owner: mongoose.Types.ObjectId(ownerId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Client = mongoose.model('Client', clientSchema);

export default Client;