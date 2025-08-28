// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`/api${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  storage: number;
  bandwidth: number;
  features: string[];
  formattedPrice: string;
  formattedStorage: string;
  formattedBandwidth: string;
}

export interface BillingAddress {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  planDetails: {
    id: string;
    name: string;
    originalPrice: number;
    finalAmount: number;
    gstAmount: number;
    subscriptionPeriod: string;
    startDate: string;
    endDate: string;
  };
  key: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentHistory {
  payments: Array<{
    _id: string;
    amount: number;
    currency: string;
    status: string;
    planId: string;
    planName: string;
    subscriptionPeriod: string;
    createdAt: string;
    paidAt?: string;
    razorpayPaymentId?: string;
    formattedAmount: string;
  }>;
  pagination: {
    current: number;
    total: number;
    count: number;
    totalRecords: number;
  };
}

export interface SubscriptionDetails {
  currentPlan: {
    id: string;
    name: string;
    price: number;
    storage: number;
    bandwidth: number;
    features: string[];
  };
  subscription: {
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    subscriptionPeriod?: string;
    autoRenewal: boolean;
  };
  usage: {
    storage: {
      used: number;
      quota: number;
      percentage: number;
    };
    transfer: {
      used: number;
      quota: number;
      percentage: number;
    };
  };
  currentPeriod?: {
    start: string;
    end: string;
    daysRemaining: number;
  };
}

class PaymentService {
  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await apiRequest('/payments/plans', {
        method: 'GET'
      });

      if (response.success) {
        return response.data.plans;
      }

      throw new Error(response.message || 'Failed to fetch plans');
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }

  /**
   * Create a payment order
   */
  async createOrder(
    planId: string,
    subscriptionPeriod: 'monthly' | 'yearly',
    billingAddress: BillingAddress
  ): Promise<PaymentOrder> {
    try {
      const response = await apiRequest('/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          subscriptionPeriod,
          billingAddress
        })
      });

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create payment order');
    } catch (error) {
      console.error('Error creating payment order:', error);
      throw error;
    }
  }

  /**
   * Verify payment after Razorpay success
   */
  async verifyPayment(paymentData: PaymentVerification): Promise<any> {
    try {
      const response = await apiRequest('/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Payment verification failed');
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Get payment history for the current user
   */
  async getPaymentHistory(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaymentHistory> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options?.page) queryParams.append('page', options.page.toString());
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.status) queryParams.append('status', options.status);

      const url = `/payments/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await apiRequest(url, {
        method: 'GET'
      });

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch payment history');
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get current subscription details
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails> {
    try {
      const response = await apiRequest('/payments/subscription', {
        method: 'GET'
      });

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch subscription details');
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      throw error;
    }
  }

  /**
   * Cancel current subscription
   */
  async cancelSubscription(): Promise<any> {
    try {
      const response = await apiRequest('/payments/subscription/cancel', {
        method: 'POST'
      });

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to cancel subscription');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing for different periods
   */
  calculatePricing(monthlyPrice: number, period: 'monthly' | 'yearly') {
    if (period === 'monthly') {
      const gst = Math.floor(monthlyPrice * 0.18);
      return {
        baseAmount: monthlyPrice,
        gstAmount: gst,
        totalAmount: monthlyPrice + gst,
        discount: 0,
        period: 'month'
      };
    } else {
      const yearlyPrice = Math.floor(monthlyPrice * 12 * 0.85); // 15% discount
      const gst = Math.floor(yearlyPrice * 0.18);
      const discount = (monthlyPrice * 12) - yearlyPrice;
      
      return {
        baseAmount: yearlyPrice,
        gstAmount: gst,
        totalAmount: yearlyPrice + gst,
        discount,
        discountPercentage: 15,
        period: 'year'
      };
    }
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate billing address
   */
  validateBillingAddress(address: BillingAddress): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.name.trim()) {
      errors.push('Name is required');
    }

    if (!address.email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!address.phone.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, ''))) {
      errors.push('Please enter a valid Indian phone number');
    }

    if (!address.address.line1.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!address.address.city.trim()) {
      errors.push('City is required');
    }

    if (!address.address.state.trim()) {
      errors.push('State is required');
    }

    if (!address.address.postal_code.trim()) {
      errors.push('Postal code is required');
    } else if (!/^[1-9][0-9]{5}$/.test(address.address.postal_code)) {
      errors.push('Please enter a valid 6-digit postal code');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get plan recommendations based on usage
   */
  getPlanRecommendation(storageUsed: number, bandwidthUsed: number, plans: Plan[]): {
    recommended: Plan | null;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    // Filter out free plan for recommendations
    const paidPlans = plans.filter(plan => plan.id !== 'free');
    
    // Find plans that can accommodate current usage
    const suitablePlans = paidPlans.filter(plan => 
      plan.storage >= storageUsed && plan.bandwidth >= bandwidthUsed
    );

    if (suitablePlans.length === 0) {
      return {
        recommended: paidPlans[paidPlans.length - 1] || null,
        reasons: ['Consider our highest tier plan for your usage requirements']
      };
    }

    // Sort by price and recommend the cheapest suitable plan
    const recommended = suitablePlans.sort((a, b) => a.price - b.price)[0];

    // Generate reasons
    if (storageUsed > 0) {
      const storagePercentage = (storageUsed / recommended.storage) * 100;
      if (storagePercentage > 80) {
        reasons.push('You\'re using most of your storage quota');
      }
    }

    if (bandwidthUsed > 0) {
      const bandwidthPercentage = (bandwidthUsed / recommended.bandwidth) * 100;
      if (bandwidthPercentage > 80) {
        reasons.push('You\'re using most of your bandwidth quota');
      }
    }

    if (reasons.length === 0) {
      reasons.push('Perfect fit for your current usage');
    }

    return {
      recommended,
      reasons
    };
  }

  /**
   * Check if user needs plan upgrade
   */
  shouldUpgradePlan(usage: SubscriptionDetails['usage']): {
    shouldUpgrade: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    if (usage.storage.percentage > 90) {
      reasons.push('Storage usage is critically high');
    } else if (usage.storage.percentage > 80) {
      reasons.push('Storage usage is approaching limit');
    }

    if (usage.transfer.percentage > 90) {
      reasons.push('Bandwidth usage is critically high');
    } else if (usage.transfer.percentage > 80) {
      reasons.push('Bandwidth usage is approaching limit');
    }

    return {
      shouldUpgrade: reasons.length > 0,
      reasons
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;