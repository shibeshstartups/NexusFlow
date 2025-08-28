# Razorpay Payment Integration Guide

This document provides a comprehensive guide for the Razorpay payment gateway integration in the NexusFlow project, supporting UPI, Credit Cards, Debit Cards, and Net Banking.

## 🚀 Features

- ✅ **Complete Payment Gateway**: Support for UPI, Credit/Debit Cards, Net Banking, and Wallets
- ✅ **Automatic User Upgrades**: Users are automatically upgraded to paid plans after successful payment
- ✅ **Secure Webhook Handling**: Real-time payment status updates with signature verification
- ✅ **Payment History**: Complete transaction history and subscription management
- ✅ **Subscription Management**: Cancel, upgrade, and manage subscriptions
- ✅ **Security Features**: Rate limiting, input validation, and comprehensive security measures
- ✅ **Production Ready**: Complete error handling and logging

## 📁 Project Structure

### Backend Files
```
backend/src/
├── config/
│   └── razorpay.js                    # Razorpay configuration and plan mapping
├── models/
│   └── Payment.js                     # Payment transaction model
├── controllers/
│   └── paymentController.js           # Payment processing logic
├── routes/
│   └── paymentRoutes.js              # Payment API endpoints
├── services/
│   └── planUpgradeService.js         # User plan upgrade logic
├── middleware/
│   └── paymentSecurityMiddleware.js  # Security and validation middleware
└── .env.example                      # Environment variables template
```

### Frontend Files
```
src/
├── pages/
│   ├── PaymentGateway.tsx            # Main payment page
│   ├── PaymentSuccess.tsx            # Success confirmation page
│   ├── PaymentFailed.tsx             # Payment failure page
│   └── PaymentHistory.tsx            # Payment history and subscription management
├── services/
│   └── paymentService.ts             # Payment API service layer
└── components/
    ├── PricingPlans.tsx              # Updated with payment integration
    └── Hero.tsx                      # Updated with payment CTAs
```

## ⚙️ Environment Setup

### 1. Backend Environment Variables

Copy the `.env.example` file to `.env` and configure the following Razorpay variables:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Payment Configuration
PAYMENTS_ENABLED=true
WEBHOOK_URL=https://yourdomain.com/api/payments/webhook
```

### 2. Razorpay Dashboard Setup

1. **Create Razorpay Account**: Sign up at [razorpay.com](https://razorpay.com)
2. **Get API Keys**: Navigate to Settings > API Keys
3. **Configure Webhooks**: Add webhook URL in Settings > Webhooks
4. **Enable Payment Methods**: Configure UPI, Cards, Net Banking in Settings > Payment Methods

### 3. Webhook Configuration

Configure the following webhook events in your Razorpay dashboard:
- `order.paid`
- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `subscription.activated`
- `subscription.cancelled`

Webhook URL: `https://yourdomain.com/api/payments/webhook`

## 🎯 Supported Plans

The system supports the following subscription plans:

### Consumer Plans
- **Free**: ₹0 - 2GB storage, 4GB bandwidth
- **Starter**: ₹50/month - 30GB storage, 120GB bandwidth
- **Personal**: ₹150/month - 150GB storage, 600GB bandwidth
- **Pro**: ₹399/month - 500GB storage, 2TB bandwidth

### Developer Plans
- **Developer Starter**: ₹599/month - 500GB storage, 2.5TB bandwidth + API access
- **Developer Basic**: ₹899/month - 1TB storage, 5TB bandwidth + Advanced API
- **Developer Pro**: ₹1299/month - 2TB storage, 10TB bandwidth + Premium API

### Business Plans
- **Business Starter**: ₹1499/month - 1TB storage, 5TB bandwidth + Team features
- **Business Pro**: ₹2999/month - 5TB storage, 25TB bandwidth + Advanced team features

## 🔄 User Flow

### 1. Plan Selection
- User browses pricing plans on the homepage
- Clicks on "Start [Plan Name]" button
- Redirected to payment gateway with selected plan

### 2. Payment Process
1. **Billing Information**: User fills in required details
2. **Order Creation**: Backend creates Razorpay order
3. **Payment Gateway**: Razorpay checkout modal opens
4. **Payment Methods**: User selects UPI/Card/Net Banking
5. **Payment Completion**: Payment processed by Razorpay
6. **Verification**: Backend verifies payment signature
7. **User Upgrade**: User automatically upgraded to new plan
8. **Confirmation**: Success page with plan details

### 3. Post-Payment
- User receives confirmation email (if configured)
- Access to new plan features immediately
- Payment history updated
- Subscription management available

## 🔐 Security Features

### 1. Payment Security
- **Signature Verification**: All payments verified using Razorpay signatures
- **Rate Limiting**: Payment endpoints protected against abuse
- **Input Validation**: Comprehensive validation of all inputs
- **Data Sanitization**: Sensitive data sanitized in logs

### 2. Webhook Security
- **Signature Validation**: Webhook signatures verified
- **Rate Limiting**: Webhook endpoints protected
- **Idempotency**: Duplicate webhook events handled
- **Error Recovery**: Robust error handling and retry logic

### 3. Data Protection
- **PCI Compliance**: No card data stored on servers
- **Encryption**: All sensitive data encrypted
- **Access Control**: User-based access to payment data
- **Audit Logging**: All payment events logged securely

## 📊 API Endpoints

### Public Endpoints
```
GET  /api/payments/plans              # Get available plans
POST /api/payments/webhook            # Razorpay webhook handler
```

### Protected Endpoints (require authentication)
```
POST /api/payments/create-order       # Create payment order
POST /api/payments/verify             # Verify payment
GET  /api/payments/history            # Get payment history
GET  /api/payments/subscription       # Get subscription details
POST /api/payments/subscription/cancel # Cancel subscription
POST /api/payments/:id/refund         # Initiate refund
```

### Admin Endpoints
```
GET  /api/payments/admin/all          # All payments (admin)
GET  /api/payments/admin/stats        # Payment statistics
POST /api/payments/admin/:id/update-status # Update payment status
```

## 🧪 Testing

### 1. Test Cards (Razorpay Test Mode)
```
# Successful Payment
Card: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date

# Failed Payment
Card: 4000 0000 0000 0002
CVV: Any 3 digits
Expiry: Any future date
```

### 2. Test UPI
- Use any UPI ID in test mode
- All UPI payments will be successful in test mode

### 3. Test Environment Setup
1. Use Razorpay test API keys
2. Set `NODE_ENV=development`
3. Use test webhook endpoints
4. Enable detailed logging

## 🚀 Deployment

### 1. Production Checklist
- [ ] Replace test API keys with live keys
- [ ] Configure production webhook URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables
- [ ] Test webhook delivery
- [ ] Enable production logging
- [ ] Set up monitoring and alerts

### 2. Environment Variables
```bash
# Production
NODE_ENV=production
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxx
WEBHOOK_URL=https://yourdomain.com/api/payments/webhook
```

### 3. Webhook URL
Ensure your webhook URL is:
- Publicly accessible
- Using HTTPS
- Responding within 10 seconds
- Returning 200 status for successful events

## 🔧 Troubleshooting

### Common Issues

1. **Payment Creation Fails**
   - Check API keys are correct
   - Verify plan ID is valid
   - Check rate limiting
   - Review request validation

2. **Webhook Not Received**
   - Verify webhook URL is accessible
   - Check webhook signature validation
   - Review webhook event configuration
   - Check firewall/security groups

3. **Payment Verification Fails**
   - Verify signature calculation
   - Check webhook secret
   - Review payment status in Razorpay dashboard

4. **User Not Upgraded**
   - Check payment verification logic
   - Review plan upgrade service
   - Verify database connections
   - Check user model updates

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Monitoring
- Monitor payment success/failure rates
- Track webhook delivery status
- Monitor API response times
- Set up alerts for payment failures

## 📝 Additional Features

### 1. Subscription Management
- View current plan and usage
- Upgrade/downgrade plans
- Cancel subscriptions
- View billing history

### 2. Payment History
- Complete transaction history
- Payment status tracking
- Download receipts/invoices
- Refund management

### 3. Analytics
- Payment conversion tracking
- Plan popularity analytics
- Revenue reporting
- User engagement metrics

## 🤝 Support

For integration support:
1. Check Razorpay documentation
2. Review error logs
3. Test with Razorpay test mode
4. Contact Razorpay support for payment issues

## 📄 License

This integration is part of the NexusFlow project and follows the same licensing terms.

---

**Note**: Always test thoroughly in Razorpay test mode before going live. Ensure all security measures are in place and webhooks are properly configured for production use.