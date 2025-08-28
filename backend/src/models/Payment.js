import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Razorpay order details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  razorpayPaymentId: {
    type: String,
    sparse: true,
    index: true
  },
  
  razorpaySignature: {
    type: String,
    sparse: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Plan details
  planId: {
    type: String,
    required: true,
    enum: [
      'free', 'starter', 'personal', 'pro',
      'developer_starter', 'developer_basic', 'developer_pro',
      'business_starter', 'business_pro', 'business_advanced', 'enterprise'
    ]
  },
  
  planName: {
    type: String,
    required: true
  },
  
  previousPlan: {
    type: String,
    enum: [
      'free', 'starter', 'personal', 'pro',
      'developer_starter', 'developer_basic', 'developer_pro',
      'business_starter', 'business_pro', 'business_advanced', 'enterprise'
    ]
  },
  
  // Subscription period
  subscriptionPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  
  subscriptionStartDate: {
    type: Date
  },
  
  subscriptionEndDate: {
    type: Date
  },
  
  // Payment method details
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'emi'],
    },
    details: {
      type: mongoose.Schema.Types.Mixed // Store payment method specific details
    }
  },
  
  // Billing details
  billingAddress: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: { type: String, default: 'IN' }
    }
  },
  
  // Tax details
  taxAmount: {
    type: Number,
    default: 0
  },
  
  gstNumber: String,
  
  // Invoice details
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  invoiceUrl: String,
  
  // Refund details
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundDate: Date,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  },
  
  // Webhook and processing details
  webhookProcessed: {
    type: Boolean,
    default: false
  },
  
  webhookEvents: [{
    event: String,
    processedAt: Date,
    status: String
  }],
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Failure details
  failureReason: String,
  
  // Processing timestamps
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Notes and remarks
  notes: String,
  
  // Admin fields
  adminNotes: String,
  
  // Auto-generated invoice number
  generateInvoiceNumber: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ planId: 1 });
paymentSchema.index({ subscriptionEndDate: 1 });
paymentSchema.index({ 'billingAddress.email': 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `₹${(this.amount / 100).toFixed(2)}`;
});

// Virtual for payment age
paymentSchema.virtual('paymentAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for subscription status
paymentSchema.virtual('subscriptionActive').get(function() {
  if (!this.subscriptionEndDate) return false;
  return new Date() < this.subscriptionEndDate;
});

// Pre-save middleware to generate invoice number
paymentSchema.pre('save', async function(next) {
  if (this.isNew && this.generateInvoiceNumber && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Count payments in current month
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, new Date().getMonth(), 1),
        $lt: new Date(year, new Date().getMonth() + 1, 1)
      }
    });
    
    this.invoiceNumber = `NF-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Instance methods
paymentSchema.methods.markAsCompleted = function(paymentId, signature) {
  this.status = 'completed';
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  this.paidAt = new Date();
  this.webhookProcessed = true;
  return this.save();
};

paymentSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failedAt = new Date();
  return this.save();
};

paymentSchema.methods.initiateRefund = function(amount, reason) {
  this.refundDetails = {
    refundAmount: amount,
    refundReason: reason,
    refundDate: new Date(),
    refundStatus: 'pending'
  };
  return this.save();
};

// Static methods
paymentSchema.statics.getPaymentHistory = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.planId) {
    query.planId = options.planId;
  }
  
  return this.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

paymentSchema.statics.getRevenueStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        paidAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
          planId: '$planId'
        },
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        avgPayment: { $avg: '$amount' }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);
};

paymentSchema.statics.getActiveSubscriptions = function() {
  return this.find({
    status: 'completed',
    subscriptionEndDate: { $gt: new Date() }
  }).populate('user', 'name email plan');
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;