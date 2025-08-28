import { useNavigate, useLocation } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle, CreditCard } from 'lucide-react';

export default function PaymentFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const failureData = location.state || {};

  const commonIssues = [
    {
      title: 'Insufficient Balance',
      description: 'Make sure your account has enough funds',
      solution: 'Check your account balance and try again'
    },
    {
      title: 'Card Declined',
      description: 'Your bank may have declined the transaction',
      solution: 'Contact your bank or try a different payment method'
    },
    {
      title: 'Network Issue',
      description: 'Connection timeout during payment',
      solution: 'Check your internet connection and retry'
    },
    {
      title: 'Invalid Details',
      description: 'Incorrect card details or OTP',
      solution: 'Verify your card details and try again'
    }
  ];

  const handleRetryPayment = () => {
    if (failureData.planId) {
      navigate(`/payment?plan=${failureData.planId}`);
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Failure Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>

          {/* Failure Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-lg text-gray-600 mb-4">
              We couldn't process your payment. Don't worry, no charges were made.
            </p>
            
            {failureData.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm font-medium">
                  Error: {failureData.error}
                </p>
                {failureData.orderId && (
                  <p className="text-red-600 text-xs mt-1">
                    Order ID: {failureData.orderId}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Common Issues */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Common Issues & Solutions</h3>
            
            <div className="space-y-4">
              {commonIssues.map((issue, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-orange-600 text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{issue.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                      <p className="text-sm text-blue-600 font-medium">{issue.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleRetryPayment}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/pricing')}
                className="border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-900 transition-all flex items-center justify-center"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Choose Different Plan
              </button>

              <button
                onClick={() => navigate('/help-center')}
                className="border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-900 transition-all flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Contact Support
              </button>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-gray-600 py-2 px-6 rounded-lg hover:text-gray-900 transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Need Immediate Help?</h4>
              <p className="text-sm text-blue-800 mb-3">
                Our support team is here to help you complete your purchase.
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-blue-800">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span>Email: support@nexusflow.com</span>
                </div>
                <div className="flex items-center text-blue-800">
                  <span className="w-4 h-4 mr-2 text-center">📞</span>
                  <span>Phone: +91-XXXX-XXXXXX (9 AM - 6 PM IST)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your payment information is secure and encrypted. No charges were made to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}