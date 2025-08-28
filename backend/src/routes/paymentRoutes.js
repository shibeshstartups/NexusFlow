import express from 'express';
import { 
  createOrder, 
  verifyPayment, 
  handleWebhook,
  getPaymentHistory,
  getSubscriptionDetails,
  cancelSubscription,
  initiateRefund,
  getPlans
} from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  paymentRateLimit,
  webhookRateLimit,
  validateWebhookSignature,
  validateCreateOrder,
  validatePaymentVerification,
  validatePaymentHistoryQuery,
  validateRefundRequest,
  setSecurityHeaders,
  handleValidationErrors,
  checkPaymentsEnabled,
  verifyRazorpayConfig,
  validatePaymentOwnership
} from '../middleware/paymentSecurityMiddleware.js';

const router = express.Router();

// Apply security headers to all payment routes
router.use(setSecurityHeaders);

// Check if payments are enabled
router.use(checkPaymentsEnabled);

// Verify Razorpay configuration
router.use(verifyRazorpayConfig);

// Public routes

/**
 * GET /api/payments/plans
 * Get all available subscription plans
 */
router.get('/plans', getPlans);

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhooks (no auth required but rate limited and signature validated)
 */
router.post('/webhook', 
  webhookRateLimit,
  express.raw({ type: 'application/json' }),
  validateWebhookSignature,
  handleWebhook
);

// Protected routes (require authentication)

/**
 * POST /api/payments/create-order
 * Create a new payment order with comprehensive validation
 */
router.post('/create-order', 
  paymentRateLimit,
  authMiddleware,
  validateCreateOrder,
  handleValidationErrors,
  createOrder
);

/**
 * POST /api/payments/verify
 * Verify payment signature and complete payment with security validation
 */
router.post('/verify',
  paymentRateLimit,
  authMiddleware,
  validatePaymentVerification,
  handleValidationErrors,
  verifyPayment
);

/**
 * GET /api/payments/history
 * Get payment history for authenticated user with validation
 */
router.get('/history',
  authMiddleware,
  validatePaymentHistoryQuery,
  handleValidationErrors,
  getPaymentHistory
);

/**
 * GET /api/payments/subscription
 * Get current subscription details
 */
router.get('/subscription',
  authMiddleware,
  getSubscriptionDetails
);

/**
 * POST /api/payments/subscription/cancel
 * Cancel current subscription
 */
router.post('/subscription/cancel',
  authMiddleware,
  cancelSubscription
);

/**
 * POST /api/payments/:paymentId/refund
 * Initiate refund for a payment with ownership validation
 */
router.post('/:paymentId/refund',
  authMiddleware,
  validateRefundRequest,
  handleValidationErrors,
  validatePaymentOwnership,
  initiateRefund
);

// Admin routes (require admin role)

/**
 * GET /api/payments/admin/all
 * Get all payments for admin dashboard
 */
router.get('/admin/all',
  authMiddleware,
  // Add admin role check middleware
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, planId, userId } = req.query;
      
      const query = {};
      if (status) query.status = status;
      if (planId) query.planId = planId;
      if (userId) query.user = userId;
      
      const payments = await Payment.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
      
      const total = await Payment.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            count: payments.length,
            totalRecords: total
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payments'
      });
    }
  }
);

/**
 * GET /api/payments/admin/stats
 * Get payment statistics for admin dashboard
 */
router.get('/admin/stats',
  authMiddleware,
  // Add admin role check middleware
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      const stats = await Payment.getRevenueStats(start, end);
      
      const totalRevenue = await Payment.aggregate([
        {
          $match: {
            status: 'completed',
            paidAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const activeSubscriptions = await Payment.getActiveSubscriptions();
      
      res.json({
        success: true,
        data: {
          revenueStats: stats,
          totalRevenue: totalRevenue[0] || { total: 0, count: 0 },
          activeSubscriptions: activeSubscriptions.length,
          period: { start, end }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment statistics'
      });
    }
  }
);

/**
 * POST /api/payments/admin/:paymentId/update-status
 * Update payment status manually (admin only)
 */
router.post('/admin/:paymentId/update-status',
  authMiddleware,
  [
    param('paymentId')
      .isMongoId()
      .withMessage('Valid payment ID is required'),
    
    body('status')
      .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
      .withMessage('Invalid status'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],
  handleValidationErrors,
  // Add admin role check middleware
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { status, notes } = req.body;
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      payment.status = status;
      if (notes) payment.adminNotes = notes;
      
      await payment.save();
      
      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update payment status'
      });
    }
  }
);

export default router;