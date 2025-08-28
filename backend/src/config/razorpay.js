import Razorpay from 'razorpay';

// Razorpay configuration
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret',
});

// Plan mapping for subscription plans
export const PLAN_MAPPING = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    currency: 'INR',
    storage: 2 * 1024 * 1024 * 1024, // 2GB
    bandwidth: 4 * 1024 * 1024 * 1024, // 4GB
    features: ['Basic dashboard', 'Share links']
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 5000, // ₹50 in paise
    currency: 'INR',
    storage: 30 * 1024 * 1024 * 1024, // 30GB
    bandwidth: 120 * 1024 * 1024 * 1024, // 120GB
    features: ['Standard dashboard', 'Share links', 'Password protection']
  },
  personal: {
    id: 'personal',
    name: 'Personal',
    price: 15000, // ₹150 in paise
    currency: 'INR',
    storage: 150 * 1024 * 1024 * 1024, // 150GB
    bandwidth: 600 * 1024 * 1024 * 1024, // 600GB
    features: ['Advanced dashboard', 'Share links', 'Password protection', 'Advanced file management']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 39900, // ₹399 in paise
    currency: 'INR',
    storage: 500 * 1024 * 1024 * 1024, // 500GB
    bandwidth: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
    features: ['Advanced dashboard', 'Share links', 'Password protection', 'Advanced file management', 'Bulk operations']
  },
  developer_starter: {
    id: 'developer_starter',
    name: 'Developer Starter',
    price: 59900, // ₹599 in paise
    currency: 'INR',
    storage: 500 * 1024 * 1024 * 1024, // 500GB
    bandwidth: 2.5 * 1024 * 1024 * 1024 * 1024, // 2.5TB
    features: ['Full S3 API', 'SDK access', 'Webhooks']
  },
  developer_basic: {
    id: 'developer_basic',
    name: 'Developer Basic',
    price: 89900, // ₹899 in paise
    currency: 'INR',
    storage: 1024 * 1024 * 1024 * 1024, // 1TB
    bandwidth: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
    features: ['Full S3 API', 'SDK access', 'Advanced webhooks', 'Multiple environments']
  },
  developer_pro: {
    id: 'developer_pro',
    name: 'Developer Pro',
    price: 129900, // ₹1299 in paise
    currency: 'INR',
    storage: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
    bandwidth: 10 * 1024 * 1024 * 1024 * 1024, // 10TB
    features: ['Full S3 API', 'SDK access', 'Advanced webhooks', 'Custom endpoints', 'Priority support']
  },
  business_starter: {
    id: 'business_starter',
    name: 'Business Starter',
    price: 149900, // ₹1499 in paise
    currency: 'INR',
    storage: 1024 * 1024 * 1024 * 1024, // 1TB
    bandwidth: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
    features: ['Team management', 'Basic compliance', 'Custom domains']
  },
  business_pro: {
    id: 'business_pro',
    name: 'Business Pro',
    price: 299900, // ₹2999 in paise
    currency: 'INR',
    storage: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
    bandwidth: 25 * 1024 * 1024 * 1024 * 1024, // 25TB
    features: ['Advanced team management', 'Role-based permissions', 'Compliance dashboard', 'API access']
  }
};

// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

// Razorpay webhook events
export const WEBHOOK_EVENTS = {
  ORDER_PAID: 'order.paid',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled'
};

export default razorpayInstance;