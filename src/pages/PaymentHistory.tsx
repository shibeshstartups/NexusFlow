import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  HardDrive, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import paymentService, { PaymentHistory as PaymentHistoryType, SubscriptionDetails } from '../services/paymentService';

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryType | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [currentPage, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyData, subscriptionData] = await Promise.all([
        paymentService.getPaymentHistory({
          page: currentPage,
          limit: 10,
          ...(statusFilter && { status: statusFilter })
        }),
        paymentService.getSubscriptionDetails()
      ]);

      setPaymentHistory(historyData);
      setSubscriptionDetails(subscriptionData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
      return;
    }

    try {
      await paymentService.cancelSubscription();
      await fetchData(); // Refresh data
      alert('Subscription cancelled successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-800 bg-green-100';
      case 'failed':
        return 'text-red-800 bg-red-100';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment History</h2>
          <p className="text-gray-600">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and view payment history</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Subscription */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan</h2>
              
              {subscriptionDetails && (
                <>
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {subscriptionDetails.currentPlan.name}
                    </div>
                    <div className="text-gray-600">
                      {paymentService.formatCurrency(subscriptionDetails.currentPlan.price)}/month
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center">
                      <HardDrive className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">Storage</div>
                        <div className="text-sm text-gray-600">
                          {paymentService.formatBytes(subscriptionDetails.usage.storage.used)} / {paymentService.formatBytes(subscriptionDetails.usage.storage.quota)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(subscriptionDetails.usage.storage.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Download className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">Bandwidth</div>
                        <div className="text-sm text-gray-600">
                          {paymentService.formatBytes(subscriptionDetails.usage.transfer.used)} / {paymentService.formatBytes(subscriptionDetails.usage.transfer.quota)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(subscriptionDetails.usage.transfer.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {subscriptionDetails.currentPeriod && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center text-blue-800 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">Current Period</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <div>Until {new Date(subscriptionDetails.currentPeriod.end).toLocaleDateString()}</div>
                        <div>{subscriptionDetails.currentPeriod.daysRemaining} days remaining</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/payment')}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
                    >
                      Upgrade Plan
                    </button>
                    
                    {subscriptionDetails.subscription.status === 'active' && (
                      <button
                        onClick={handleCancelSubscription}
                        className="w-full border border-red-300 text-red-700 py-2 px-4 rounded-lg font-semibold hover:bg-red-50 transition-all"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {paymentHistory && paymentHistory.payments.length > 0 ? (
                <>
                  <div className="space-y-4 mb-6">
                    {paymentHistory.payments.map((payment) => (
                      <div key={payment._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {getStatusIcon(payment.status)}
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{payment.planName}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{payment.formattedAmount}</div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="w-4 h-4 mr-2" />
                          <span>Payment ID: {payment.razorpayPaymentId || 'N/A'}</span>
                          <span className="mx-2">•</span>
                          <span>{payment.subscriptionPeriod} billing</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {paymentHistory.pagination.total > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {((paymentHistory.pagination.current - 1) * 10) + 1} to {Math.min(paymentHistory.pagination.current * 10, paymentHistory.pagination.totalRecords)} of {paymentHistory.pagination.totalRecords} payments
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <span className="text-sm text-gray-600">
                          Page {paymentHistory.pagination.current} of {paymentHistory.pagination.total}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === paymentHistory.pagination.total}
                          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                  <p className="text-gray-600 mb-4">You haven't made any payments yet.</p>
                  <button
                    onClick={() => navigate('/payment')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Upgrade Your Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}