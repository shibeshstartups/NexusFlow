import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  Check, 
  ArrowLeft, 
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Declare Razorpay global
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: string;
  name: string;
  price: number;
  storage: number;
  bandwidth: number;
  features: string[];
  formattedPrice: string;
}

export default function PaymentGateway() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [billingAddress, setBillingAddress] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'IN'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setIsRazorpayLoaded(true);
    script.onerror = () => {
      setErrors({ razorpay: 'Failed to load payment gateway. Please refresh and try again.' });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Get plan from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const planId = searchParams.get('plan') || location.state?.planId;
    
    if (planId) {
      fetchPlanDetails(planId);
    } else {
      fetchPlans();
    }
  }, [location]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/payments/plans');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data.plans);
      }
    } catch (error) {
      setErrors({ plans: 'Failed to load subscription plans' });
    }
  };

  const fetchPlanDetails = async (planId: string) => {
    try {
      const response = await fetch('/api/payments/plans');
      const data = await response.json();
      
      if (data.success) {
        const plan = data.data.plans.find((p: Plan) => p.id === planId);
        if (plan) {
          setSelectedPlan(plan);
          setPlans(data.data.plans);
        }
      }
    } catch (error) {
      setErrors({ plan: 'Failed to load plan details' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!billingAddress.name.trim()) newErrors.name = 'Name is required';
    if (!billingAddress.email.trim()) newErrors.email = 'Email is required';
    if (!billingAddress.phone.trim()) newErrors.phone = 'Phone is required';
    if (!billingAddress.address.line1.trim()) newErrors.address = 'Address is required';
    if (!billingAddress.address.city.trim()) newErrors.city = 'City is required';
    if (!billingAddress.address.state.trim()) newErrors.state = 'State is required';
    if (!billingAddress.address.postal_code.trim()) newErrors.postal_code = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createPaymentOrder = async () => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        planId: selectedPlan?.id,
        subscriptionPeriod,
        billingAddress
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  };

  const verifyPayment = async (paymentData: any) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  };

  const handlePayment = async () => {
    if (!selectedPlan || !validateForm() || !isRazorpayLoaded) return;

    setIsLoading(true);
    setErrors({});

    try {
      const order = await createPaymentOrder();

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'NexusFlow',
        description: `${selectedPlan.name} - ${subscriptionPeriod} subscription`,
        order_id: order.orderId,
        prefill: {
          name: billingAddress.name,
          email: billingAddress.email,
          contact: billingAddress.phone
        },
        theme: { color: '#3B82F6' },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true
        },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            navigate('/payment/success', {
              state: {
                paymentId: response.razorpay_payment_id,
                planName: selectedPlan.name
              }
            });
          } catch (error) {
            navigate('/payment/failed', {
              state: { error: error instanceof Error ? error.message : 'Payment failed' }
            });
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            setErrors({ payment: 'Payment cancelled' });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      setErrors({ payment: error instanceof Error ? error.message : 'Payment failed' });
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Purchase</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-6">
            {!selectedPlan && plans.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
                <div className="space-y-3">
                  {plans.filter(plan => plan.id !== 'free').map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-600">
                            {formatBytes(plan.storage)} • {formatBytes(plan.bandwidth)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{plan.formattedPrice}</div>
                          <div className="text-sm text-gray-500">/month</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Supported Payment Methods</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { name: 'Credit/Debit Cards', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
                  { name: 'UPI', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
                  { name: 'Net Banking', icon: Shield, desc: 'All major banks' }
                ].map((method) => (
                  <div key={method.name} className="flex items-center p-3 border rounded-lg">
                    <method.icon className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-500">{method.desc}</div>
                    </div>
                    <Check className="w-5 h-5 text-green-600 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Billing Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Billing Information</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={billingAddress.name}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="email"
                  placeholder="Email Address *"
                  value={billingAddress.email}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={billingAddress.phone}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="text"
                  placeholder="Address *"
                  value={billingAddress.address.line1}
                  onChange={(e) => setBillingAddress(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, line1: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City *"
                    value={billingAddress.address.city}
                    onChange={(e) => setBillingAddress(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="State *"
                    value={billingAddress.address.state}
                    onChange={(e) => setBillingAddress(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Postal Code *"
                  value={billingAddress.address.postal_code}
                  onChange={(e) => setBillingAddress(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, postal_code: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Order Summary */}
            {selectedPlan && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                {/* Subscription Period Selector */}
                <div className="mb-4">
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setSubscriptionPeriod('monthly')}
                      className={`flex-1 py-2 text-center ${
                        subscriptionPeriod === 'monthly' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setSubscriptionPeriod('yearly')}
                      className={`flex-1 py-2 text-center ${
                        subscriptionPeriod === 'yearly' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name} ({subscriptionPeriod.charAt(0).toUpperCase() + subscriptionPeriod.slice(1)})</span>
                    <span>{formatCurrency(selectedPlan.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>GST (18%)</span>
                    <span>{formatCurrency(Math.floor(selectedPlan.price * 0.18))}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(selectedPlan.price + Math.floor(selectedPlan.price * 0.18))}</span>
                    </div>
                  </div>
                </div>

                {/* Error Messages */}
                {Object.keys(errors).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-800">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="text-sm">Please fix the errors above</span>
                    </div>
                  </div>
                )}

                {/* Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={isLoading || !selectedPlan || !isRazorpayLoaded}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : (
                    `Pay ${selectedPlan ? formatCurrency(selectedPlan.price + Math.floor(selectedPlan.price * 0.18)) : ''}`
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Secure payment powered by Razorpay. Your data is encrypted and protected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}