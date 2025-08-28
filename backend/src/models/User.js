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
    required: function() {
      // Password is required only if user is not using OAuth (no googleId)
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values while maintaining uniqueness for non-null values
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
    enum: [
      'free', 'starter', 'personal', 'pro',
      'developer_starter', 'developer_basic', 'developer_pro',
      'business_starter', 'business_pro', 'business_advanced', 'enterprise'
    ],
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
    // Razorpay integration
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
    
    // Legacy Stripe support (for migration)
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    
    // Subscription details
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
      default: 'inactive'
    },
    planId: {
      type: String,
      enum: [
        'free', 'starter', 'personal', 'pro',
        'developer_starter', 'developer_basic', 'developer_pro',
        'business_starter', 'business_pro', 'business_advanced', 'enterprise'
      ],
      default: 'free'
    },
    subscriptionPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    
    // Payment tracking
    lastPaymentDate: Date,
    nextBillingDate: Date,
    autoRenewal: {
      type: Boolean,
      default: true
    },
    
    // Trial information
    trialStart: Date,
    trialEnd: Date,
    isTrialUsed: {
      type: Boolean,
      default: false
    }
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
        this.storageQuota = 2 * 1024 * 1024 * 1024; // 2GB
        this.transferQuota = 4 * 1024 * 1024 * 1024; // 4GB
        break;
      case 'starter':
        this.storageQuota = 30 * 1024 * 1024 * 1024; // 30GB
        this.transferQuota = 120 * 1024 * 1024 * 1024; // 120GB
        break;
      case 'personal':
        this.storageQuota = 150 * 1024 * 1024 * 1024; // 150GB
        this.transferQuota = 600 * 1024 * 1024 * 1024; // 600GB
        break;
      case 'pro':
        this.storageQuota = 500 * 1024 * 1024 * 1024; // 500GB
        this.transferQuota = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
        break;
      case 'developer_starter':
        this.storageQuota = 500 * 1024 * 1024 * 1024; // 500GB
        this.transferQuota = 2.5 * 1024 * 1024 * 1024 * 1024; // 2.5TB
        break;
      case 'developer_basic':
        this.storageQuota = 1024 * 1024 * 1024 * 1024; // 1TB
        this.transferQuota = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
        break;
      case 'developer_pro':
        this.storageQuota = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
        this.transferQuota = 10 * 1024 * 1024 * 1024 * 1024; // 10TB
        break;
      case 'business_starter':
        this.storageQuota = 1024 * 1024 * 1024 * 1024; // 1TB
        this.transferQuota = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
        break;
      case 'business_pro':
        this.storageQuota = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
        this.transferQuota = 25 * 1024 * 1024 * 1024 * 1024; // 25TB
        break;
      case 'business_advanced':
        this.storageQuota = 15 * 1024 * 1024 * 1024 * 1024; // 15TB
        this.transferQuota = 75 * 1024 * 1024 * 1024 * 1024; // 75TB
        break;
      case 'enterprise':
        this.storageQuota = 50 * 1024 * 1024 * 1024 * 1024; // 50TB
        this.transferQuota = 250 * 1024 * 1024 * 1024 * 1024; // 250TB
        break;
    }
    
    // Update subscription plan ID when plan changes
    if (this.subscription) {
      this.subscription.planId = this.plan;
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

// Check if subscription is active
userSchema.methods.hasActiveSubscription = function() {
  return this.subscription.status === 'active' && 
         this.subscription.currentPeriodEnd && 
         new Date() < this.subscription.currentPeriodEnd;
};

// Check if user is on trial
userSchema.methods.isOnTrial = function() {
  return this.subscription.status === 'trialing' &&
         this.subscription.trialEnd &&
         new Date() < this.subscription.trialEnd;
};

// Get subscription days remaining
userSchema.methods.getSubscriptionDaysRemaining = function() {
  if (!this.subscription.currentPeriodEnd) return 0;
  
  const now = new Date();
  const endDate = new Date(this.subscription.currentPeriodEnd);
  const diffTime = endDate - now;
  
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Upgrade to new plan
userSchema.methods.upgradePlan = async function(newPlan, subscriptionDetails = {}) {
  const oldPlan = this.plan;
  
  this.plan = newPlan;
  
  // Update subscription details
  Object.assign(this.subscription, {
    planId: newPlan,
    status: 'active',
    ...subscriptionDetails
  });
  
  await this.save();
  
  return {
    oldPlan,
    newPlan,
    subscriptionDetails: this.subscription
  };
};

// Cancel subscription (keep access until period end)
userSchema.methods.cancelSubscription = async function() {
  this.subscription.status = 'cancelled';
  this.subscription.autoRenewal = false;
  
  await this.save();
  
  return this.subscription;
};

// Reactivate subscription
userSchema.methods.reactivateSubscription = async function() {
  if (this.subscription.status === 'cancelled' && 
      this.subscription.currentPeriodEnd && 
      new Date() < this.subscription.currentPeriodEnd) {
    
    this.subscription.status = 'active';
    this.subscription.autoRenewal = true;
    
    await this.save();
    return true;
  }
  
  return false;
};

const User = mongoose.model('User', userSchema);

export default User;