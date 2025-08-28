import razorpayInstance, { PLAN_MAPPING, PAYMENT_STATUS, WEBHOOK_EVENTS } from '../config/razorpay.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Create Razorpay order for payment
 */
export const createOrder = async (req, res) => {
  try {
    const { planId, subscriptionPeriod = 'monthly', billingAddress } = req.body;
    const userId = req.user.id;

    // Validate plan
    if (!PLAN_MAPPING[planId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const plan = PLAN_MAPPING[planId];
    
    // Calculate amount (including GST if applicable)
    let amount = plan.price;
    if (subscriptionPeriod === 'yearly') {
      amount = Math.floor(amount * 12 * 0.85); // 15% discount for yearly
    }

    // Add GST (18% for digital services in India)
    const gstAmount = Math.floor(amount * 0.18);
    const totalAmount = amount + gstAmount;

    // Create Razorpay order
    const orderOptions = {
      amount: totalAmount, // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}_${userId}`,
      notes: {
        planId,
        userId,
        subscriptionPeriod,
        planName: plan.name
      }
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    if (subscriptionPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Get user's current plan
    const user = await User.findById(userId);
    
    // Create payment record
    const payment = new Payment({
      user: userId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      planId,
      planName: plan.name,
      previousPlan: user.plan,
      subscriptionPeriod,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      billingAddress,
      taxAmount: gstAmount,
      metadata: {
        originalAmount: amount,
        discount: subscriptionPeriod === 'yearly' ? '15%' : '0%',
        gst: '18%'
      }
    });

    await payment.save();

    logger.info(`Payment order created: ${razorpayOrder.id} for user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        planDetails: {
          id: planId,
          name: plan.name,
          originalPrice: plan.price,
          finalAmount: totalAmount,
          gstAmount,
          subscriptionPeriod,
          startDate,
          endDate
        },
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    logger.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify payment signature and process payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Find the payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await payment.markAsFailed('Invalid payment signature');
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Mark payment as completed
    await payment.markAsCompleted(razorpay_payment_id, razorpay_signature);

    // Upgrade user plan
    const user = await User.findById(payment.user);
    const plan = PLAN_MAPPING[payment.planId];
    
    // Update user plan and quotas
    user.plan = payment.planId;
    user.storageQuota = plan.storage;
    user.transferQuota = plan.bandwidth;
    
    // Update subscription details
    user.subscription = {
      status: 'active',
      currentPeriodStart: payment.subscriptionStartDate,
      currentPeriodEnd: payment.subscriptionEndDate,
      razorpayCustomerId: user.subscription?.razorpayCustomerId,
      planId: payment.planId,
      subscriptionPeriod: payment.subscriptionPeriod
    };

    await user.save();

    logger.info(`Payment verified and user upgraded: ${user.email} to ${payment.planId}`);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'completed',
        planUpgraded: true,
        newPlan: {
          id: payment.planId,
          name: payment.planName,
          storage: plan.storage,
          bandwidth: plan.bandwidth,
          subscriptionEnd: payment.subscriptionEndDate
        }
      }
    });

  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Handle Razorpay webhooks
 */
export const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      logger.warn('Invalid webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    logger.info(`Webhook received: ${event}`);

    switch (event) {
      case WEBHOOK_EVENTS.ORDER_PAID:
      case WEBHOOK_EVENTS.PAYMENT_CAPTURED:
        await handlePaymentSuccess(payload);
        break;
        
      case WEBHOOK_EVENTS.PAYMENT_FAILED:
        await handlePaymentFailure(payload);
        break;
        
      case WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED:
        await handleSubscriptionCancellation(payload);
        break;
        
      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment webhook
 */
const handlePaymentSuccess = async (payload) => {
  const { order, payment } = payload;
  
  const paymentRecord = await Payment.findOne({ razorpayOrderId: order.id });
  if (!paymentRecord) {
    logger.warn(`Payment record not found for order: ${order.id}`);
    return;
  }

  if (paymentRecord.status === PAYMENT_STATUS.COMPLETED) {
    logger.info(`Payment already processed: ${order.id}`);
    return;
  }

  // Update payment record
  await paymentRecord.markAsCompleted(payment.id, '');
  
  // Add webhook event
  paymentRecord.webhookEvents.push({
    event: 'payment.captured',
    processedAt: new Date(),
    status: 'success'
  });
  
  await paymentRecord.save();

  logger.info(`Payment webhook processed successfully: ${order.id}`);
};

/**
 * Handle failed payment webhook
 */
const handlePaymentFailure = async (payload) => {
  const { order, payment } = payload;
  
  const paymentRecord = await Payment.findOne({ razorpayOrderId: order.id });
  if (!paymentRecord) {
    logger.warn(`Payment record not found for order: ${order.id}`);
    return;
  }

  await paymentRecord.markAsFailed(payment.error_description || 'Payment failed');
  
  paymentRecord.webhookEvents.push({
    event: 'payment.failed',
    processedAt: new Date(),
    status: 'processed'
  });
  
  await paymentRecord.save();

  logger.info(`Payment failure webhook processed: ${order.id}`);
};

/**
 * Handle subscription cancellation webhook
 */
const handleSubscriptionCancellation = async (payload) => {
  const { subscription } = payload;
  
  // Find user by subscription ID and update status
  const user = await User.findOne({ 
    'subscription.razorpaySubscriptionId': subscription.id 
  });
  
  if (user) {
    user.subscription.status = 'cancelled';
    await user.save();
    
    logger.info(`Subscription cancelled for user: ${user.email}`);
  }
};

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      status
    };

    const payments = await Payment.getPaymentHistory(userId, options);
    const total = await Payment.countDocuments({ 
      user: userId, 
      ...(status && { status }) 
    });

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
    logger.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
};

/**
 * Get current subscription details
 */
export const getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const currentPayment = await Payment.findOne({
      user: userId,
      status: 'completed',
      subscriptionEndDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    const plan = PLAN_MAPPING[user.plan] || PLAN_MAPPING.free;

    res.json({
      success: true,
      data: {
        currentPlan: {
          id: user.plan,
          name: plan.name,
          price: plan.price,
          storage: plan.storage,
          bandwidth: plan.bandwidth,
          features: plan.features
        },
        subscription: user.subscription,
        usage: {
          storage: {
            used: user.storageUsed,
            quota: user.storageQuota,
            percentage: user.storageUsagePercentage
          },
          transfer: {
            used: user.transferUsed,
            quota: user.transferQuota,
            percentage: user.transferUsagePercentage
          }
        },
        currentPeriod: currentPayment ? {
          start: currentPayment.subscriptionStartDate,
          end: currentPayment.subscriptionEndDate,
          daysRemaining: Math.ceil((currentPayment.subscriptionEndDate - new Date()) / (1000 * 60 * 60 * 24))
        } : null
      }
    });

  } catch (error) {
    logger.error('Error fetching subscription details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (user.subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'No active subscription to cancel'
      });
    }

    // Update subscription status
    user.subscription.status = 'cancelled';
    await user.save();

    logger.info(`Subscription cancelled by user: ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        status: 'cancelled',
        effectiveDate: user.subscription.currentPeriodEnd
      }
    });

  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

/**
 * Initiate refund for a payment
 */
export const initiateRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    // Create refund in Razorpay
    const refund = await razorpayInstance.payments.refund(payment.razorpayPaymentId, {
      amount: amount || payment.amount,
      notes: {
        reason,
        refund_initiated_by: req.user.email
      }
    });

    // Update payment record
    await payment.initiateRefund(amount || payment.amount, reason);
    payment.refundDetails.refundId = refund.id;
    await payment.save();

    logger.info(`Refund initiated: ${refund.id} for payment: ${paymentId}`);

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status
      }
    });

  } catch (error) {
    logger.error('Error initiating refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate refund'
    });
  }
};

/**
 * Get available plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = Object.entries(PLAN_MAPPING).map(([id, plan]) => ({
      id,
      ...plan,
      formattedPrice: plan.price === 0 ? 'Free' : `₹${plan.price / 100}`,
      formattedStorage: formatBytes(plan.storage),
      formattedBandwidth: formatBytes(plan.bandwidth)
    }));

    res.json({
      success: true,
      data: { plans }
    });

  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};

/**
 * Helper function to format bytes
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};