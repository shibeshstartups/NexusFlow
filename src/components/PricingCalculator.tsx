import React, { useState } from 'react';
import { Calculator, TrendingDown, Database, Download, Users, Code } from 'lucide-react';

export default function PricingCalculator() {
  const [storageGB, setStorageGB] = useState(100);
  const [downloadGB, setDownloadGB] = useState(500);
  const [teamSize, setTeamSize] = useState(1);
  const [needsAPI, setNeedsAPI] = useState(false);

  // Pricing constants
  const STORAGE_COST_PER_GB = 0.60; // ₹0.60 per GB per month
  const DOWNLOAD_COST_PER_GB = 0.20; // ₹0.20 per GB
  
  const calculateCustomCost = () => {
    const storageCost = storageGB * STORAGE_COST_PER_GB;
    const downloadCost = downloadGB * DOWNLOAD_COST_PER_GB;
    const teamCost = Math.max(0, teamSize - 1) * 50; // ₹50 per additional seat (first seat free)
    return storageCost + downloadCost + teamCost;
  };

  const calculateRecommendation = () => {
    const customCost = calculateCustomCost();
    
    // Define plan tiers with their costs and limits
    const plans = [
      { name: 'Free Plan', price: 0, storage: 2, download: 10, cost: 0 },
      { name: 'Starter', price: 50, storage: 30, download: 150, cost: 50 },
      { name: 'Personal', price: 150, storage: 150, download: 750, cost: 150 },
      { name: 'Pro I', price: 399, storage: 500, download: 2000, cost: 399 }
    ];

    // Find the best plan that covers the requirements
    let recommendedPlan = plans[plans.length - 1]; // Default to highest plan
    let bestValue = null;

    for (const plan of plans) {
      if (plan.storage >= storageGB && plan.download >= downloadGB) {
        recommendedPlan = plan;
        break;
      }
    }

    // Calculate savings vs custom pricing
    const savings = customCost > recommendedPlan.cost 
      ? Math.round(((customCost - recommendedPlan.cost) / customCost) * 100)
      : 0;

    return {
      plan: recommendedPlan.name,
      price: recommendedPlan.price === 0 ? '₹0' : `₹${recommendedPlan.price}`,
      period: recommendedPlan.price === 0 ? 'forever' : 'per month',
      customCost: Math.round(customCost),
      planCost: recommendedPlan.cost,
      savings: savings > 0 ? `${savings}%` : '0%',
      reason: `Covers ${recommendedPlan.storage}GB storage and ${recommendedPlan.download}GB download bandwidth`
    };
  };

  const recommendation = calculateRecommendation();

  const handleStorageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10000, parseInt(e.target.value) || 1));
    setStorageGB(value);
  };

  const handleDownloadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(50000, parseInt(e.target.value) || 1));
    setDownloadGB(value);
  };

  return (
    <section id="calculator" className="py-12 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium mb-3">
            <Calculator className="w-3 h-3 mr-1.5" />
            Pricing Calculator
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Find Your Perfect Plan
          </h2>
          <p className="text-lg text-gray-600">
            Get a personalized recommendation based on your exact needs
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tell us about your needs</h3>
              
              {/* Storage Requirements */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Database className="w-4 h-4 text-blue-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Storage Requirements
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Exact GB needed</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={storageGB}
                      onChange={handleStorageInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-xs">Monthly Cost:</div>
                      <div className="text-base font-bold text-blue-600">
                        ₹{Math.round(storageGB * STORAGE_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="10000"
                    value={storageGB}
                    onChange={(e) => setStorageGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>1 GB</span>
                    <span>10 TB</span>
                  </div>
                </div>
              </div>

              {/* Download Requirements */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Download className="w-4 h-4 text-teal-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Download Bandwidth (Monthly)
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Exact GB needed</label>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={downloadGB}
                      onChange={handleDownloadInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-xs">Monthly Cost:</div>
                      <div className="text-base font-bold text-teal-600">
                        ₹{Math.round(downloadGB * DOWNLOAD_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50000"
                    value={downloadGB}
                    onChange={(e) => setDownloadGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>1 GB</span>
                    <span>50 TB</span>
                  </div>
                </div>
              </div>

              {/* Team Size */}
              <div>
                <div className="flex items-center mb-1.5">
                  <Users className="w-4 h-4 text-purple-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Team Size (₹50 per additional seat)
                  </label>
                </div>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value={1}>Just me (Free)</option>
                  <option value={2}>2 people (+₹50/month)</option>
                  <option value={3}>3 people (+₹100/month)</option>
                  <option value={4}>4 people (+₹150/month)</option>
                  <option value={5}>5 people (+₹200/month)</option>
                  <option value={10}>10 people (+₹450/month)</option>
                  <option value={15}>15 people (+₹700/month)</option>
                  <option value={25}>25 people (+₹1,200/month)</option>
                </select>
              </div>

              {/* API Access */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={needsAPI}
                    onChange={(e) => setNeedsAPI(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <Code className="w-3 h-3 text-gray-600 ml-2 mr-1" />
                  <span className="ml-1 text-sm font-medium text-gray-700">
                    I need S3-compatible API access
                  </span>
                </label>
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4">
              <h4 className="text-base font-bold text-gray-900 mb-4">Cost Analysis & Recommendation</h4>
              
              {/* Custom Pricing Breakdown */}
              <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
                <h5 className="font-semibold text-gray-900 mb-2 text-sm">Pay-As-You-Go Pricing</h5>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage ({storageGB} GB × ₹0.60):</span>
                    <span className="font-medium text-xs">₹{Math.round(storageGB * STORAGE_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Download ({downloadGB} GB × ₹0.20):</span>
                    <span className="font-medium text-xs">₹{Math.round(downloadGB * DOWNLOAD_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team ({Math.max(0, teamSize - 1)} seats × ₹50):</span>
                    <span className="font-medium text-xs">₹{Math.max(0, teamSize - 1) * 50}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between font-bold">
                    <span>Total Custom Cost:</span>
                    <span className="text-orange-600 text-xs">₹{recommendation.customCost}/month</span>
                  </div>
                </div>
              </div>

              {/* Recommended Plan */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h5 className="text-lg font-bold text-blue-600">{recommendation.plan}</h5>
                  {recommendation.savings !== '0%' && (
                    <div className="flex items-center bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs">
                      <TrendingDown className="w-2 h-2 mr-0.5" />
                      Save {recommendation.savings}
                    </div>
                  )}
                </div>
                
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {recommendation.price}
                </div>
                <div className="text-gray-600 mb-3 text-sm">{recommendation.period}</div>
                
                <div className="bg-blue-50 p-2 rounded-lg mb-3">
                  <div className="text-xs text-blue-800">
                    <div className="font-medium mb-0.5">Plan vs Custom Pricing:</div>
                    <div className="flex justify-between">
                      <span>Plan Cost:</span>
                      <span className="font-bold text-green-600 text-xs">₹{recommendation.planCost}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custom Cost:</span>
                      <span className="font-bold text-orange-600 text-xs">₹{recommendation.customCost}/month</span>
                    </div>
                    {recommendation.planCost < recommendation.customCost && (
                      <div className="flex justify-between font-bold text-green-700 border-t pt-0.5 mt-0.5">
                        <span>You Save:</span>
                        <span className="text-xs">₹{recommendation.customCost - recommendation.planCost}/month</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-xs mb-3">{recommendation.reason}</p>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl text-sm">
                Get Started with {recommendation.plan}
              </button>

              {/* Custom Pack Option */}
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h5 className="font-semibold text-orange-900 mb-1.5 flex items-center text-sm">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                  Or Create Your Custom Pack
                </h5>
                <p className="text-xs text-orange-800 mb-2">
                  Get exactly {storageGB}GB storage + {downloadGB}GB bandwidth for ₹{recommendation.customCost}/month
                </p>
                <div className="flex items-center justify-between text-xs text-orange-700 mb-2">
                  <span>✓ Pay only for what you use</span>
                  <span>✓ No unused allowances</span>
                  <span>✓ Scale anytime</span>
                </div>
                <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-3 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-xs">
                  Purchase Custom Pack - ₹{recommendation.customCost}/month
                </button>
              </div>

              {needsAPI && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center text-yellow-800 text-xs">
                    <Code className="w-3 h-3 mr-1.5" />
                    <span className="font-medium">API Access Required:</span>
                  </div>
                  <p className="text-yellow-700 text-xs mt-0.5">
                    Consider our Developer plans starting at ₹499/month for full S3 API compatibility.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}