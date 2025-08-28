import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { PLAN_MAPPING } from '../config/razorpay.js';
import logger from '../utils/logger.js';

/**
 * Plan Upgrade Service
 * Handles all plan upgrade/downgrade logic and subscription management
 */
class PlanUpgradeService {
  
  /**
   * Upgrade user to new plan after successful payment
   */
  static async upgradeUserPlan(userId, paymentId, planId, subscriptionDetails) {
    try {
      const user = await User.findById(userId);
      const payment = await Payment.findById(paymentId);
      
      if (!user || !payment) {
        throw new Error('User or payment not found');
      }

      const plan = PLAN_MAPPING[planId];
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const oldPlan = user.plan;
      
      // Update user plan using the model method
      const upgradeResult = await user.upgradePlan(planId, {
        status: 'active',
        currentPeriodStart: subscriptionDetails.startDate,
        currentPeriodEnd: subscriptionDetails.endDate,
        subscriptionPeriod: subscriptionDetails.period,
        lastPaymentDate: new Date(),
        nextBillingDate: subscriptionDetails.endDate,
        autoRenewal: true
      });

      // Log the upgrade
      logger.info(`User plan upgraded: ${user.email} from ${oldPlan} to ${planId}`);

      // Send upgrade notification (if notification service exists)
      await this.sendUpgradeNotification(user, oldPlan, planId, plan);

      return {
        success: true,
        user: await User.findById(userId), // Refresh user data
        upgradeDetails: upgradeResult,
        message: `Successfully upgraded to ${plan.name}`
      };

    } catch (error) {
      logger.error('Error upgrading user plan:', error);
      throw error;
    }
  }

  /**
   * Downgrade user plan (usually when subscription expires or is cancelled)
   */
  static async downgradeUserPlan(userId, newPlanId = 'free', reason = 'subscription_expired') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oldPlan = user.plan;
      const newPlan = PLAN_MAPPING[newPlanId];

      if (!newPlan) {
        throw new Error('Invalid target plan ID');
      }

      // Update user plan
      await user.upgradePlan(newPlanId, {
        status: 'inactive',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        autoRenewal: false
      });

      // Handle storage quota reduction
      await this.handleStorageQuotaReduction(user, oldPlan, newPlan);

      logger.info(`User plan downgraded: ${user.email} from ${oldPlan} to ${newPlanId} (${reason})`);

      // Send downgrade notification
      await this.sendDowngradeNotification(user, oldPlan, newPlanId, reason);

      return {
        success: true,
        user: await User.findById(userId),
        message: `Plan changed to ${newPlan.name}`
      };

    } catch (error) {
      logger.error('Error downgrading user plan:', error);
      throw error;
    }
  }

  /**
   * Handle storage quota reduction when downgrading
   */
  static async handleStorageQuotaReduction(user, oldPlan, newPlan) {
    // If new plan has less storage than current usage
    if (user.storageUsed > newPlan.storage) {
      // Option 1: Grace period - allow over-quota for 30 days
      const graceEndDate = new Date();
      graceEndDate.setDate(graceEndDate.getDate() + 30);
      
      user.subscription.graceEndDate = graceEndDate;
      user.subscription.overQuota = true;
      
      await user.save();

      logger.warn(`User ${user.email} is over quota after downgrade. Grace period until ${graceEndDate}`);
      
      // Schedule cleanup job (you might want to implement this)
      // scheduleQuotaCleanup(user.id, graceEndDate);
      
      return {
        overQuota: true,
        graceEndDate,
        currentUsage: user.storageUsed,
        newQuota: newPlan.storage
      };
    }

    return { overQuota: false };
  }

  /**
   * Process subscription renewal
   */
  static async processSubscriptionRenewal(userId, paymentId) {
    try {
      const user = await User.findById(userId);
      const payment = await Payment.findById(paymentId);

      if (!user || !payment) {
        throw new Error('User or payment not found');
      }

      // Calculate new period dates
      const currentEnd = user.subscription.currentPeriodEnd || new Date();
      const newStart = new Date(Math.max(currentEnd, new Date()));
      const newEnd = new Date(newStart);

      if (payment.subscriptionPeriod === 'yearly') {
        newEnd.setFullYear(newEnd.getFullYear() + 1);
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1);
      }

      // Update subscription details
      user.subscription.currentPeriodStart = newStart;
      user.subscription.currentPeriodEnd = newEnd;
      user.subscription.status = 'active';
      user.subscription.lastPaymentDate = new Date();
      user.subscription.nextBillingDate = newEnd;

      await user.save();

      logger.info(`Subscription renewed for user: ${user.email} until ${newEnd}`);

      return {
        success: true,
        newPeriodStart: newStart,
        newPeriodEnd: newEnd,
        user
      };

    } catch (error) {
      logger.error('Error processing subscription renewal:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription (immediate or at period end)
   */
  static async cancelSubscription(userId, immediate = false) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (immediate) {
        // Immediate cancellation - downgrade to free plan
        await this.downgradeUserPlan(userId, 'free', 'immediate_cancellation');
      } else {
        // Cancel at period end
        await user.cancelSubscription();
      }

      logger.info(`Subscription cancelled for user: ${user.email} (immediate: ${immediate})`);

      return {
        success: true,
        immediate,
        effectiveDate: immediate ? new Date() : user.subscription.currentPeriodEnd,
        user: await User.findById(userId)
      };

    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get upgrade/downgrade preview
   */
  static async getPlanChangePreview(userId, targetPlanId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentPlan = PLAN_MAPPING[user.plan];
      const targetPlan = PLAN_MAPPING[targetPlanId];

      if (!targetPlan) {
        throw new Error('Invalid target plan');
      }

      const isUpgrade = targetPlan.price > currentPlan.price;
      const priceDifference = Math.abs(targetPlan.price - currentPlan.price);

      // Calculate prorated amount if upgrading mid-cycle
      let proratedAmount = 0;
      if (isUpgrade && user.hasActiveSubscription()) {
        const daysRemaining = user.getSubscriptionDaysRemaining();
        const daysInPeriod = user.subscription.subscriptionPeriod === 'yearly' ? 365 : 30;
        const remainingRatio = daysRemaining / daysInPeriod;
        
        proratedAmount = Math.round(priceDifference * remainingRatio);
      }

      return {
        currentPlan: {
          id: user.plan,
          name: currentPlan.name,
          price: currentPlan.price,
          storage: currentPlan.storage,
          bandwidth: currentPlan.bandwidth
        },
        targetPlan: {
          id: targetPlanId,
          name: targetPlan.name,
          price: targetPlan.price,
          storage: targetPlan.storage,
          bandwidth: targetPlan.bandwidth
        },
        change: {
          type: isUpgrade ? 'upgrade' : 'downgrade',
          priceDifference,
          proratedAmount,
          storageChange: targetPlan.storage - currentPlan.storage,
          bandwidthChange: targetPlan.bandwidth - currentPlan.bandwidth
        },
        warnings: this.getChangeWarnings(user, currentPlan, targetPlan)
      };

    } catch (error) {
      logger.error('Error getting plan change preview:', error);
      throw error;
    }
  }

  /**
   * Get warnings for plan changes
   */
  static getChangeWarnings(user, currentPlan, targetPlan) {
    const warnings = [];

    // Storage quota warning
    if (targetPlan.storage < user.storageUsed) {
      warnings.push({
        type: 'storage_over_quota',
        message: `Your current usage (${this.formatBytes(user.storageUsed)}) exceeds the new plan's quota (${this.formatBytes(targetPlan.storage)}). You'll have 30 days to reduce usage.`,
        severity: 'high'
      });
    }

    // Feature loss warning
    if (targetPlan.price < currentPlan.price) {
      warnings.push({
        type: 'feature_loss',
        message: 'Some features may be restricted with the new plan.',
        severity: 'medium'
      });
    }

    // Billing warning
    if (targetPlan.price > currentPlan.price && user.hasActiveSubscription()) {
      const daysRemaining = user.getSubscriptionDaysRemaining();
      warnings.push({
        type: 'proration',
        message: `You'll be charged a prorated amount for the remaining ${daysRemaining} days of your current billing period.`,
        severity: 'low'
      });
    }

    return warnings;
  }

  /**
   * Check for expired subscriptions and handle downgrades
   */
  static async processExpiredSubscriptions() {
    try {
      const expiredUsers = await User.find({
        'subscription.status': 'active',
        'subscription.currentPeriodEnd': { $lt: new Date() },
        'subscription.autoRenewal': false
      });

      const results = [];

      for (const user of expiredUsers) {
        try {
          const result = await this.downgradeUserPlan(
            user._id, 
            'free', 
            'subscription_expired'
          );
          results.push({ userId: user._id, success: true, result });
        } catch (error) {
          logger.error(`Error processing expired subscription for user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      logger.info(`Processed ${expiredUsers.length} expired subscriptions`);
      return results;

    } catch (error) {
      logger.error('Error processing expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Send upgrade notification (placeholder - implement with your notification service)
   */
  static async sendUpgradeNotification(user, oldPlan, newPlan, planDetails) {
    // Implement your notification logic here
    // This could be email, in-app notification, etc.
    logger.info(`Upgrade notification sent to ${user.email}: ${oldPlan} -> ${newPlan}`);
  }

  /**
   * Send downgrade notification (placeholder)
   */
  static async sendDowngradeNotification(user, oldPlan, newPlan, reason) {
    // Implement your notification logic here
    logger.info(`Downgrade notification sent to ${user.email}: ${oldPlan} -> ${newPlan} (${reason})`);
  }

  /**
   * Format bytes for display
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get plan features comparison
   */
  static getPlanFeaturesComparison(planId1, planId2) {
    const plan1 = PLAN_MAPPING[planId1];
    const plan2 = PLAN_MAPPING[planId2];

    if (!plan1 || !plan2) {
      throw new Error('Invalid plan IDs');
    }

    return {
      plan1: {
        id: planId1,
        name: plan1.name,
        price: plan1.price,
        features: plan1.features
      },
      plan2: {
        id: planId2,
        name: plan2.name,
        price: plan2.price,
        features: plan2.features
      },
      comparison: {
        priceDifference: plan2.price - plan1.price,
        storageDifference: plan2.storage - plan1.storage,
        bandwidthDifference: plan2.bandwidth - plan1.bandwidth
      }
    };
  }
}

export default PlanUpgradeService;