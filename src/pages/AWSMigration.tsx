import React, { useState } from 'react';
import { ArrowLeft, DollarSign, TrendingDown, Zap, Shield, Code, Users } from 'lucide-react';

export default function AWSMigration() {
  const [storageGB, setStorageGB] = useState(1000);
  const [monthlyEgressGB, setMonthlyEgressGB] = useState(500);

  const benefits = [
    {
      icon: DollarSign,
      title: 'Save 70% on Storage Costs',
      description: 'Reduce your AWS S3 storage costs from ₹2.30/GB to ₹0.85/GB',
      savings: '₹1.45/GB saved',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: TrendingDown,
      title: 'Save 93% on Egress Costs', 
      description: 'Cut your data transfer costs from ₹7.50/GB to ₹0.35/GB',
      savings: '₹7.15/GB saved',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Zap,
      title: '3x Faster Performance',
      description: 'Experience sub-100ms response times from Indian data centers',
      savings: '3x speed improvement',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const currentAWSCosts = {
    storage: storageGB * 2.30,
    egress: monthlyEgressGB * 7.50,
    total: (storageGB * 2.30) + (monthlyEgressGB * 7.50)
  };

  const nexusFlowCosts = {
    storage: storageGB * 0.85,
    egress: monthlyEgressGB * 0.35,
    total: (storageGB * 0.85) + (monthlyEgressGB * 0.35)
  };

  const savings = {
    monthly: currentAWSCosts.total - nexusFlowCosts.total,
    yearly: (currentAWSCosts.total - nexusFlowCosts.total) * 12
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <a href="/" className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Homepage
          </a>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Migrate from AWS S3 to NexusFlow
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Save up to 70% on storage costs while improving performance with our seamless migration tools.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-8">
              <div className={`w-16 h-16 bg-gradient-to-r ${benefit.color} rounded-xl mb-6 flex items-center justify-center`}>
                <benefit.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-600 mb-4">{benefit.description}</p>
              <div className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
                {benefit.savings}
              </div>
            </div>
          ))}
        </div>

        {/* Cost Calculator */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Cost Calculator</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Your Usage</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage (GB/month)
                  </label>
                  <input
                    type="number"
                    value={storageGB}
                    onChange={(e) => setStorageGB(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Transfer (GB/month)
                  </label>
                  <input
                    type="number"
                    value={monthlyEgressGB}
                    onChange={(e) => setMonthlyEgressGB(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Cost Comparison</h3>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">AWS S3 Costs</h4>
                  <div className="text-red-700">
                    <div>Storage: ₹{currentAWSCosts.storage.toLocaleString()}/month</div>
                    <div>Data Transfer: ₹{currentAWSCosts.egress.toLocaleString()}/month</div>
                    <div className="font-bold border-t border-red-200 pt-2 mt-2">
                      Total: ₹{currentAWSCosts.total.toLocaleString()}/month
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">NexusFlow Costs</h4>
                  <div className="text-green-700">
                    <div>Storage: ₹{nexusFlowCosts.storage.toLocaleString()}/month</div>
                    <div>Data Transfer: ₹{nexusFlowCosts.egress.toLocaleString()}/month</div>
                    <div className="font-bold border-t border-green-200 pt-2 mt-2">
                      Total: ₹{nexusFlowCosts.total.toLocaleString()}/month
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Your Savings</h4>
                  <div className="text-blue-700">
                    <div>Monthly: ₹{savings.monthly.toLocaleString()}</div>
                    <div className="font-bold">Yearly: ₹{savings.yearly.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Migrating?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Our migration experts will help you move from AWS S3 to NexusFlow seamlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Migration
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Talk to Expert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}