import React, { useState } from 'react';
import { ArrowLeft, Code, Database, Zap, Shield, Clock, CheckCircle, TrendingDown } from 'lucide-react';

export default function DeveloperPlans() {
  const developerPlans = [
    {
      name: 'Developer Starter',
      price: '₹599',
      period: 'per month',
      icon: Code,
      color: 'from-blue-600 to-blue-700',
      storage: 500,
      bandwidth: 2500,
      features: [
        '500 GB Storage',
        '2.5 TB Download Bandwidth',
        'Full S3 API compatibility',
        'API rate limiting: 1000 req/min',
        'Webhook support',
        'SDK for popular languages',
        'Email support'
      ],
      cta: 'Start Developer',
      popular: false
    },
    {
      name: 'Developer Basic',
      price: '₹899',
      period: 'per month',
      icon: Database,
      color: 'from-green-600 to-green-700',
      storage: 1000,
      bandwidth: 5000,
      features: [
        '1 TB Storage',
        '5 TB Download Bandwidth',
        'Full S3 API compatibility',
        'API rate limiting: 2500 req/min',
        'Advanced webhooks',
        'Multiple environments',
        'Priority email support',
        'Basic analytics'
      ],
      cta: 'Start Developer Basic',
      popular: false
    },
    {
      name: 'Developer Pro',
      price: '₹1,299',
      period: 'per month',
      icon: Database,
      color: 'from-purple-600 to-purple-700',
      storage: 2000,
      bandwidth: 10000,
      features: [
        '2 TB Storage',
        '10 TB Download Bandwidth',
        'Full S3 API compatibility',
        'API rate limiting: 5000 req/min',
        'Advanced webhooks',
        'Custom endpoints',
        'Priority support',
        'API analytics dashboard'
      ],
      cta: 'Start Developer Pro',
      popular: true,
      badge: 'Most Popular'
    },
    {
      name: 'Developer Advanced',
      price: '₹1,999',
      period: 'per month',
      icon: Zap,
      color: 'from-orange-600 to-orange-700',
      storage: 5000,
      bandwidth: 25000,
      features: [
        '5 TB Storage',
        '25 TB Download Bandwidth',
        'Full S3 API compatibility',
        'API rate limiting: 10000 req/min',
        'Real-time webhooks',
        'Custom domains',
        'Phone support',
        'Advanced analytics',
        'Multi-region support'
      ],
      cta: 'Start Developer Advanced',
      popular: false
    },
    {
      name: 'Developer Enterprise',
      price: 'Custom',
      period: 'pricing',
      icon: Shield,
      color: 'from-gray-600 to-gray-700',
      storage: Infinity,
      bandwidth: Infinity,
      features: [
        'Unlimited Storage',
        'Unlimited Bandwidth',
        'Dedicated API endpoints',
        'No rate limiting',
        'Custom integrations',
        'White-label options',
        '24/7 dedicated support',
        'SLA guarantees'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  // Developer-specific calculator state
  const [storageGB, setStorageGB] = useState(1000);
  const [bandwidthGB, setBandwidthGB] = useState(5000);
  const [apiRequestsPerMin, setApiRequestsPerMin] = useState(1000);
  const [environments, setEnvironments] = useState(2);
  const [needsWebhooks, setNeedsWebhooks] = useState(false);
  const [needsAnalytics, setNeedsAnalytics] = useState(false);

  // Pricing constants for developers
  const STORAGE_COST_PER_GB = 0.85; // 30% cheaper than competitors (₹1.20)
  const BANDWIDTH_COST_PER_GB = 0.35; // 30% cheaper than competitors (₹0.50)
  const API_COST_PER_1K_REQUESTS = 0.18; // 30% cheaper than competitors (₹0.25)
  const ENVIRONMENT_COST = 105; // 30% cheaper than competitors (₹150)
  const WEBHOOK_COST = 209; // 30% cheaper than competitors (₹299)
  const ANALYTICS_COST = 349; // 30% cheaper than competitors (₹499)

  const calculateCustomCost = () => {
    const storageCost = storageGB * STORAGE_COST_PER_GB;
    const bandwidthCost = bandwidthGB * BANDWIDTH_COST_PER_GB;
    const apiCost = (apiRequestsPerMin * 60 * 24 * 30 / 1000) * API_COST_PER_1K_REQUESTS; // Monthly API cost
    const environmentCost = Math.max(0, environments - 1) * ENVIRONMENT_COST; // First environment free
    const webhookCost = needsWebhooks ? WEBHOOK_COST : 0;
    const analyticsCost = needsAnalytics ? ANALYTICS_COST : 0;
    
    return storageCost + bandwidthCost + apiCost + environmentCost + webhookCost + analyticsCost;
  };

  const calculateRecommendation = () => {
    const customCost = calculateCustomCost();
    
    // Find the best plan that covers the requirements
    let recommendedPlan = developerPlans[developerPlans.length - 1]; // Default to enterprise
    
    for (const plan of developerPlans) {
      if (plan.storage >= storageGB && plan.bandwidth >= bandwidthGB && plan.price !== 'Custom') {
        recommendedPlan = plan;
        break;
      }
    }

    const planPrice = recommendedPlan.price === 'Custom' ? customCost : parseInt(recommendedPlan.price.replace('₹', '').replace(',', ''));
    const savings = customCost > planPrice ? Math.round(((customCost - planPrice) / customCost) * 100) : 0;

    return {
      plan: recommendedPlan.name,
      price: recommendedPlan.price === 'Custom' ? `₹${Math.round(customCost)}` : recommendedPlan.price,
      period: recommendedPlan.price === 'Custom' ? 'per month' : 'per month',
      customCost: Math.round(customCost),
      planCost: planPrice,
      savings: savings > 0 ? `${savings}%` : '0%',
      reason: `Covers ${recommendedPlan.storage === Infinity ? 'unlimited' : recommendedPlan.storage + 'GB'} storage and ${recommendedPlan.bandwidth === Infinity ? 'unlimited' : recommendedPlan.bandwidth + 'GB'} bandwidth`
    };
  };

  const recommendation = calculateRecommendation();

  const apiFeatures = [
    {
      title: 'Full S3 Compatibility',
      description: 'Drop-in replacement for AWS S3. Use existing tools, libraries, and workflows without any changes.',
      icon: Database
    },
    {
      title: 'Lightning Fast API',
      description: 'Sub-100ms response times from Indian data centers. Built for performance with intelligent caching.',
      icon: Zap
    },
    {
      title: 'Reliable Webhooks',
      description: 'Real-time notifications for uploads, downloads, and deletions. Retry logic and delivery guarantees.',
      icon: Clock
    },
    {
      title: 'Enterprise Security',
      description: 'IAM policies, access keys, bucket policies, and encryption. Bank-grade security for your data.',
      icon: Shield
    }
  ];

  const industryComparison = [
    {
      metric: 'API Response Time',
      industry: '200-500ms average',
      nexus: 'Sub-100ms guaranteed',
      improvement: '2-5x faster'
    },
    {
      metric: 'Storage Cost (India)',
      industry: '₹1.20/GB (Competitors)',
      nexus: '₹0.85/GB equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Egress Cost (India)',
      industry: '₹0.50/GB (Competitors)',
      nexus: '₹0.35/GB',
      improvement: '30% cheaper'
    },
    {
      metric: 'API Setup Time',
      industry: '2-3 days configuration',
      nexus: '5 minutes setup',
      improvement: '99% faster'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <a href="/" className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Main Pricing
          </a>
        </div>

        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Code className="w-4 h-4 mr-2" />
            Developer Plans
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Built for Developers, By Developers
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Full S3 API compatibility with Indian data residency. Revolutionary pricing 
            with transparent bandwidth allocation and no vendor lock-in.
          </p>
        </div>

        {/* Industry Comparison */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why NexusFlow is 30% Cheaper Than All Competitors
            </h2>
            <p className="text-xl text-gray-600">
              Competitive pricing that beats all Indian and global providers by 30%
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industryComparison.map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                <h4 className="font-bold text-gray-900 mb-3">{item.metric}</h4>
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Industry:</span>
                    <div className="text-red-600 font-medium text-xs">{item.industry}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">NexusFlow:</span>
                    <div className="text-green-600 font-medium text-xs">{item.nexus}</div>
                  </div>
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium text-center">
                  {item.improvement}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Plan Finder */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-teal-50 rounded-2xl shadow-xl p-8 mb-16" id="plan-finder">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Code className="w-4 h-4 mr-2" />
              Developer Plan Calculator
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Calculate Your Exact Developer Requirements
            </h2>
            <p className="text-xl text-gray-600">
              Configure your exact needs and get personalized pricing with plan recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Configure Your Requirements</h3>
              
              {/* Storage Requirements */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Storage Requirements
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Exact GB needed</label>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={storageGB}
                      onChange={(e) => setStorageGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-blue-600">
                        ₹{Math.round(storageGB * STORAGE_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50000"
                    value={storageGB}
                    onChange={(e) => setStorageGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 GB</span>
                    <span>50 TB</span>
                  </div>
                </div>
              </div>

              {/* Bandwidth Requirements */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Zap className="w-5 h-5 text-teal-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Download Bandwidth (Monthly)
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Exact GB needed</label>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={bandwidthGB}
                      onChange={(e) => setBandwidthGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-teal-600">
                        ₹{Math.round(bandwidthGB * BANDWIDTH_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="100000"
                    value={bandwidthGB}
                    onChange={(e) => setBandwidthGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 GB</span>
                    <span>100 TB</span>
                  </div>
                </div>
              </div>

              {/* API Requirements */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Code className="w-5 h-5 text-purple-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    API Requests per Minute
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={apiRequestsPerMin}
                      onChange={(e) => setApiRequestsPerMin(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Requests/min"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-purple-600">
                        ₹{Math.round((apiRequestsPerMin * 60 * 24 * 30 / 1000) * API_COST_PER_1K_REQUESTS)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50000"
                    value={apiRequestsPerMin}
                    onChange={(e) => setApiRequestsPerMin(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 req/min</span>
                    <span>50K req/min</span>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Shield className="w-5 h-5 text-green-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Features
                  </label>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Environments</label>
                    <select 
                      value={environments}
                      onChange={(e) => setEnvironments(parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value={1}>1 Environment (Free)</option>
                      <option value={2}>2 Environments (+₹105/month)</option>
                      <option value={3}>3 Environments (+₹210/month)</option>
                      <option value={5}>5 Environments (+₹420/month)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={needsWebhooks}
                        onChange={(e) => setNeedsWebhooks(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                      />
                      <span className="text-sm">Advanced Webhooks (+₹209/month)</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={needsAnalytics}
                        onChange={(e) => setNeedsAnalytics(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                      />
                      <span className="text-sm">Analytics Dashboard (+₹349/month)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Panel */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-6">Cost Analysis & Recommendation</h4>
              
              {/* Custom Pricing Breakdown */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
                <h5 className="font-semibold text-gray-900 mb-3">Pay-As-You-Go Pricing</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage ({storageGB} GB × ₹0.85):</span>
                    <span className="font-medium">₹{Math.round(storageGB * STORAGE_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bandwidth ({bandwidthGB} GB × ₹0.35):</span>
                    <span className="font-medium">₹{Math.round(bandwidthGB * BANDWIDTH_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">API Requests ({Math.round(apiRequestsPerMin * 60 * 24 * 30 / 1000)}K/month × ₹0.18):</span>
                    <span className="font-medium">₹{Math.round((apiRequestsPerMin * 60 * 24 * 30 / 1000) * API_COST_PER_1K_REQUESTS)}</span>
                  </div>
                  {environments > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Extra Environments ({environments - 1} × ₹105):</span>
                      <span className="font-medium">₹{(environments - 1) * ENVIRONMENT_COST}</span>
                    </div>
                  )}
                  {needsWebhooks && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advanced Webhooks (+₹209):</span>
                      <span className="font-medium">₹{WEBHOOK_COST}</span>
                    </div>
                  )}
                  {needsAnalytics && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Analytics Dashboard (+₹349):</span>
                      <span className="font-medium">₹{ANALYTICS_COST}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Custom Cost:</span>
                    <span className="text-orange-600">₹{recommendation.customCost}/month</span>
                  </div>
                </div>
              </div>

              {/* Recommended Plan */}
              <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xl font-bold text-blue-600">{recommendation.plan}</h5>
                  {recommendation.savings !== '0%' && (
                    <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Save {recommendation.savings}
                    </div>
                  )}
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {recommendation.price}
                </div>
                <div className="text-gray-600 mb-4">{recommendation.period}</div>
                
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Plan vs Custom Pricing:</div>
                    <div className="flex justify-between">
                      <span>Plan Cost:</span>
                      <span className="font-bold text-green-600">₹{recommendation.planCost}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custom Cost:</span>
                      <span className="font-bold text-orange-600">₹{recommendation.customCost}/month</span>
                    </div>
                    {recommendation.planCost < recommendation.customCost && (
                      <div className="flex justify-between font-bold text-green-700 border-t pt-1 mt-1">
                        <span>You Save:</span>
                        <span>₹{recommendation.customCost - recommendation.planCost}/month</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{recommendation.reason}</p>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl">
                Get Started with {recommendation.plan}
              </button>

              {/* Custom Pack Option */}
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h5 className="font-semibold text-orange-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Or Create Your Custom Developer Pack
                </h5>
                <p className="text-sm text-orange-800 mb-3">
                  Get exactly {storageGB}GB storage + {bandwidthGB}GB bandwidth + {apiRequestsPerMin} API req/min for ₹{recommendation.customCost}/month
                </p>
                <div className="flex items-center justify-between text-xs text-orange-700 mb-3">
                  <span>✓ Pay only for what you use</span>
                  <span>✓ No unused allowances</span>
                  <span>✓ Scale anytime</span>
                </div>
                <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-sm">
                  Purchase Custom Pack - ₹{recommendation.customCost}/month
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h5 className="font-semibold text-gray-900 mb-3">Developer Benefits:</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-blue-600">Sub-100ms</div>
                    <div className="text-gray-600">API Response</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">99.9%</div>
                    <div className="text-gray-600">Uptime SLA</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">5 min</div>
                    <div className="text-gray-600">Setup Time</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">24/7</div>
                    <div className="text-gray-600">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-16">
          {developerPlans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'border-blue-500 transform scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <div className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-xl mb-6 flex items-center justify-center`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-2">/{plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* API Features */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Developers Choose NexusFlow API
            </h2>
            <p className="text-xl text-gray-600">
              Better than AWS S3 for Indian applications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {apiFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="flex items-start p-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg mr-4 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Get started with our S3-compatible API in minutes. Full documentation and SDKs available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              View API Documentation
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Try Free API Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}