import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Download, HardDrive, Calendar, CreditCard } from 'lucide-react';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentData = location.state;

  useEffect(() => {
    // If no payment data, redirect to dashboard
    if (!paymentData) {
      navigate('/dashboard');
    }
  }, [paymentData, navigate]);

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h2>
          <p className="text-gray-600">Taking you to your dashboard</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to {paymentData.planDetails?.name || 'your new plan'}! Your account has been upgraded.
          </p>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-gray-900">{paymentData.paymentId}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium text-gray-900">{paymentData.planDetails?.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(paymentData.amount || 0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Plan Benefits */}
          {paymentData.planDetails && (
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-4">Your New Plan Benefits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-blue-800">
                  <HardDrive className="w-5 h-5 mr-2" />
                  <div>
                    <div className="font-medium">Storage</div>
                    <div className="text-sm">{paymentData.planDetails.storage || 'Included'}</div>
                  </div>
                </div>
                
                <div className="flex items-center text-blue-800">
                  <Download className="w-5 h-5 mr-2" />
                  <div>
                    <div className="font-medium">Bandwidth</div>
                    <div className="text-sm">{paymentData.planDetails.bandwidth || 'Included'}</div>
                  </div>
                </div>
              </div>
              
              {paymentData.planDetails.subscriptionEnd && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-center text-blue-800">
                    <Calendar className="w-5 h-5 mr-2" />
                    <span className="text-sm">
                      Valid until {new Date(paymentData.planDetails.subscriptionEnd).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">What's Next?</h3>
            
            <div className="space-y-3 text-left">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Start uploading your files</div>
                  <div className="text-sm text-gray-600">
                    Your increased storage quota is now active
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Explore premium features</div>
                  <div className="text-sm text-gray-600">
                    Access advanced file management and sharing options
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Check your email</div>
                  <div className="text-sm text-gray-600">
                    We've sent you a confirmation and invoice
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            
            <button
              onClick={() => navigate('/payment/history')}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-900 transition-all flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              View Payment History
            </button>
          </div>

          {/* Support */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@nexusflow.com" className="text-blue-600 hover:text-blue-800">
                support@nexusflow.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}