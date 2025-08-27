import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  plan: {
    type: String,
    enum: ['free', 'creative_pro', 'business', 'enterprise'],
    default: 'free'
  },
  storageQuota: {
    type: Number,
    default: 5368709120 // 5GB for free plan
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  transferQuota: {
    type: Number,
    default: 53687091200 // 50GB transfer for free plan
  },
  transferUsed: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due'],
      default: 'inactive'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for storage usage percentage
userSchema.virtual('storageUsagePercentage').get(function() {
  return this.storageQuota > 0 ? (this.storageUsed / this.storageQuota) * 100 : 0;
});

// Virtual for transfer usage percentage
userSchema.virtual('transferUsagePercentage').get(function() {
  return this.transferQuota > 0 ? (this.transferUsed / this.transferQuota) * 100 : 0;
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ plan: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Update storage quotas based on plan
userSchema.pre('save', function(next) {
  if (this.isModified('plan')) {
    switch (this.plan) {
      case 'free':
        this.storageQuota = 5368709120; // 5GB
        this.transferQuota = 53687091200; // 50GB
        break;
      case 'creative_pro':
        this.storageQuota = 107374182400; // 100GB
        this.transferQuota = 1073741824000; // 1TB
        break;
      case 'business':
        this.storageQuota = 1073741824000; // 1TB
        this.transferQuota = 10737418240000; // 10TB
        break;
      case 'enterprise':
        this.storageQuota = 10737418240000; // 10TB
        this.transferQuota = 107374182400000; // 100TB
        break;
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has storage capacity
userSchema.methods.hasStorageCapacity = function(additionalSize = 0) {
  return (this.storageUsed + additionalSize) <= this.storageQuota;
};

// Check if user has transfer capacity
userSchema.methods.hasTransferCapacity = function(additionalTransfer = 0) {
  return (this.transferUsed + additionalTransfer) <= this.transferQuota;
};

// Update storage usage
userSchema.methods.updateStorageUsage = async function(sizeChange) {
  this.storageUsed = Math.max(0, this.storageUsed + sizeChange);
  return this.save();
};

// Update transfer usage
userSchema.methods.updateTransferUsage = async function(transferAmount) {
  this.transferUsed += transferAmount;
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;