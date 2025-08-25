import React, { useState } from 'react';
import { ArrowLeft, Briefcase, Users, Shield, BarChart3, Clock, CheckCircle, TrendingDown, Building, Globe, Zap, Database, Settings, Phone } from 'lucide-react';

export default function BusinessPlans() {
  const businessPlans = [
    {
      name: 'Business Starter',
      price: '₹1,499',
      period: 'per month',
      icon: Briefcase,
      color: 'from-teal-600 to-teal-700',
      storage: 1000,
      bandwidth: 5000,
      teamMembers: 5,
      features: [
        '1 TB Storage',
        '5 TB Download Bandwidth',
        'Up to 5 team members',
        'Basic team management',
        'Standard analytics',
        'Email support',
        'Basic compliance reports',
        'Custom domains'
      ],
      cta: 'Start Business Starter',
      popular: false
    },
    {
      name: 'Business Pro',
      price: '₹2,999',
      period: 'per month',
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      storage: 5000,
      bandwidth: 25000,
      teamMembers: 25,
      features: [
        '5 TB Storage',
        '25 TB Download Bandwidth',
        'Up to 25 team members',
        'Advanced team management',
        'Role-based permissions',
        'Advanced analytics',
        'Priority email support',
        'Compliance dashboard',
        'API access included'
      ],
      cta: 'Start Business Pro',
      popular: true,
      badge: 'Most Popular'
    },
    {
      name: 'Business Advanced',
      price: '₹5,999',
      period: 'per month',
      icon: Building,
      color: 'from-purple-600 to-purple-700',
      storage: 15000,
      bandwidth: 75000,
      teamMembers: 100,
      features: [
        '15 TB Storage',
        '75 TB Download Bandwidth',
        'Up to 100 team members',
        'Advanced security controls',
        'Audit logs & compliance',
        'Custom integrations',
        'Phone support',
        'Dedicated account manager',
        'SLA guarantees'
      ],
      cta: 'Start Business Advanced',
      popular: false
    },
    {
      name: 'Enterprise',
      price: '₹12,999',
      period: 'per month',
      icon: Globe,
      color: 'from-gray-600 to-gray-700',
      storage: 50000,
      bandwidth: 250000,
      teamMembers: Infinity,
      features: [
        '50 TB Storage',
        '250 TB Download Bandwidth',
        'Unlimited team members',
        'White-label solutions',
        'Custom compliance reports',
        'Dedicated infrastructure',
        'On-premise deployment',
        '24/7 dedicated support',
        'Custom SLA'
      ],
      cta: 'Contact Enterprise Sales',
      popular: false
    },
    {
      name: 'Custom Enterprise',
      price: 'Custom',
      period: 'pricing',
      icon: Settings,
      color: 'from-orange-600 to-orange-700',
      storage: Infinity,
      bandwidth: Infinity,
      teamMembers: Infinity,
      features: [
        'Unlimited Storage',
        'Unlimited Bandwidth',
        'Unlimited team members',
        'Custom feature development',
        'Dedicated data centers',
        'Custom compliance frameworks',
        'White-label platform',
        'Dedicated engineering team',
        'Custom contracts & SLA'
      ],
      cta: 'Contact Custom Sales',
      popular: false
    }
  ];

  // Business-specific calculator state
  const [storageGB, setStorageGB] = useState(5000);
  const [bandwidthGB, setBandwidthGB] = useState(25000);
  const [teamMembers, setTeamMembers] = useState(25);
  const [needsCompliance, setNeedsCompliance] = useState(false);
  const [needsAdvancedSecurity, setNeedsAdvancedSecurity] = useState(false);
  const [needsDedicatedSupport, setNeedsDedicatedSupport] = useState(false);
  const [needsCustomIntegrations, setNeedsCustomIntegrations] = useState(false);

  // Business pricing constants (30% cheaper than competitors)
  const STORAGE_COST_PER_GB = 0.70; // 30% cheaper than ₹1.00 competitor rate
  const BANDWIDTH_COST_PER_GB = 0.35; // 30% cheaper than ₹0.50 competitor rate
  const TEAM_MEMBER_COST = 70; // 30% cheaper than ₹100 per user
  const COMPLIANCE_COST = 699; // 30% cheaper than ₹999
  const ADVANCED_SECURITY_COST = 1399; // 30% cheaper than ₹1999
  const DEDICATED_SUPPORT_COST = 2099; // 30% cheaper than ₹2999
  const CUSTOM_INTEGRATIONS_COST = 1749; // 30% cheaper than ₹2499

  const calculateCustomCost = () => {
    const storageCost = storageGB * STORAGE_COST_PER_GB;
    const bandwidthCost = bandwidthGB * BANDWIDTH_COST_PER_GB;
    const teamCost = Math.max(0, teamMembers - 5) * TEAM_MEMBER_COST; // First 5 users free
    const complianceCost = needsCompliance ? COMPLIANCE_COST : 0;
    const securityCost = needsAdvancedSecurity ? ADVANCED_SECURITY_COST : 0;
    const supportCost = needsDedicatedSupport ? DEDICATED_SUPPORT_COST : 0;
    const integrationsCost = needsCustomIntegrations ? CUSTOM_INTEGRATIONS_COST : 0;
    
    return storageCost + bandwidthCost + teamCost + complianceCost + securityCost + supportCost + integrationsCost;
  };

  const calculateRecommendation = () => {
    const customCost = calculateCustomCost();
    
    // Find the best plan that covers the requirements
    let recommendedPlan = businessPlans[businessPlans.length - 1]; // Default to custom enterprise
    
    for (const plan of businessPlans) {
      if (plan.storage >= storageGB && 
          plan.bandwidth >= bandwidthGB && 
          plan.teamMembers >= teamMembers && 
          plan.price !== 'Custom') {
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
      reason: `Covers ${recommendedPlan.storage === Infinity ? 'unlimited' : recommendedPlan.storage + 'GB'} storage, ${recommendedPlan.bandwidth === Infinity ? 'unlimited' : recommendedPlan.bandwidth + 'GB'} bandwidth, and ${recommendedPlan.teamMembers === Infinity ? 'unlimited' : recommendedPlan.teamMembers} team members`
    };
  };

  const recommendation = calculateRecommendation();

  const businessFeatures = [
    {
      title: 'Team Management',
      description: 'Centralized user management with role-based access controls. Invite team members, set permissions, and track usage across your organization.',
      icon: Users
    },
    {
      title: 'Advanced Security',
      description: 'Enterprise-grade security with encryption, audit logs, compliance reports, and advanced access controls for sensitive business data.',
      icon: Shield
    },
    {
      title: 'Analytics & Insights',
      description: 'Detailed usage analytics, cost optimization insights, and performance monitoring to help optimize your storage strategy.',
      icon: BarChart3
    },
    {
      title: 'Dedicated Support',
      description: '24/7 priority support with dedicated account managers and guaranteed response times for business-critical issues.',
      icon: Clock
    }
  ];

  const complianceFeatures = [
    'Data residency in India',
    'SOC 2 Type II compliance',
    'ISO 27001 certified',
    'GDPR compliant',
    'Regular security audits',
    'Encryption at rest and in transit'
  ];

  const industryComparison = [
    {
      metric: 'Team Collaboration',
      industry: '₹150/user (Competitors)',
      nexus: '₹70/user equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Storage Cost (India)',
      industry: '₹1.00/GB (Competitors)',
      nexus: '₹0.70/GB equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Egress Cost (India)',
      industry: '₹0.50/GB (Competitors)',
      nexus: '₹0.35/GB',
      improvement: '30% cheaper'
    },
    {
      metric: 'Compliance Features',
      industry: '₹999/month (Competitors)',
      nexus: '₹699/month',
      improvement: '30% cheaper'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-6">
          <a href="/" className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Main Pricing
          </a>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4 mr-2" />
            Business Plans
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Enterprise Storage Solutions for Indian Businesses
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Secure, compliant, and cost-effective storage solutions with advanced team management, 
            security controls, and dedicated support designed specifically for Indian organizations.
          </p>
        </div>
        </div>

        {/* Industry Comparison */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              30% Cheaper Than All Business Storage Competitors
            </h2>
            <p className="text-xl text-gray-600">
              Built specifically for Indian business requirements with unbeatable pricing
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

        {/* Business Plan Finder */}
        <div className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-2xl shadow-xl p-8 mb-12" id="plan-finder">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Briefcase className="w-4 h-4 mr-2" />
              Business Plan Calculator
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Find the Perfect Business Plan for You
            </h2>
            <p className="text-xl text-gray-600">
              Configure your business requirements and get personalized pricing with plan recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Configure Your Business Requirements</h3>
              
              {/* Storage Requirements */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 text-teal-600 mr-2" />
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
                      max="100000"
                      value={storageGB}
                      onChange={(e) => setStorageGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-teal-600">
                        ₹{Math.round(storageGB * STORAGE_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="100000"
                    value={storageGB}
                    onChange={(e) => setStorageGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 GB</span>
                    <span>100 TB</span>
                  </div>
                </div>
              </div>

              {/* Bandwidth Requirements */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Zap className="w-5 h-5 text-blue-600 mr-2" />
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
                      max="500000"
                      value={bandwidthGB}
                      onChange={(e) => setBandwidthGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-blue-600">
                        ₹{Math.round(bandwidthGB * BANDWIDTH_COST_PER_GB)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="500000"
                    value={bandwidthGB}
                    onChange={(e) => setBandwidthGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 GB</span>
                    <span>500 TB</span>
                  </div>
                </div>
              </div>

              {/* Team Size */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 text-purple-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Team Size
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={teamMembers}
                      onChange={(e) => setTeamMembers(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Team members"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Monthly Cost:</div>
                      <div className="text-lg font-bold text-purple-600">
                        ₹{Math.max(0, teamMembers - 5) * TEAM_MEMBER_COST}
                      </div>
                      <div className="text-xs text-gray-500">First 5 users free</div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    value={teamMembers}
                    onChange={(e) => setTeamMembers(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 user</span>
                    <span>1000 users</span>
                  </div>
                </div>
              </div>

              {/* Business Features */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Shield className="w-5 h-5 text-green-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Business Features
                  </label>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={needsCompliance}
                      onChange={(e) => setNeedsCompliance(e.target.checked)}
                      className="mr-3 rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50" 
                    />
                    <span className="text-sm">Compliance Dashboard & Reports (+₹699/month)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={needsAdvancedSecurity}
                      onChange={(e) => setNeedsAdvancedSecurity(e.target.checked)}
                      className="mr-3 rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50" 
                    />
                    <span className="text-sm">Advanced Security Controls (+₹1,399/month)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={needsDedicatedSupport}
                      onChange={(e) => setNeedsDedicatedSupport(e.target.checked)}
                      className="mr-3 rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50" 
                    />
                    <span className="text-sm">Dedicated Support & Account Manager (+₹2,099/month)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={needsCustomIntegrations}
                      onChange={(e) => setNeedsCustomIntegrations(e.target.checked)}
                      className="mr-3 rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50" 
                    />
                    <span className="text-sm">Custom Integrations & APIs (+₹1,749/month)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Recommendation Panel */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-6">Cost Analysis & Recommendation</h4>
              
              {/* Custom Pricing Breakdown */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
                <h5 className="font-semibold text-gray-900 mb-3">Pay-As-You-Go Pricing</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage ({storageGB} GB × ₹0.70):</span>
                    <span className="font-medium">₹{Math.round(storageGB * STORAGE_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bandwidth ({bandwidthGB} GB × ₹0.35):</span>
                    <span className="font-medium">₹{Math.round(bandwidthGB * BANDWIDTH_COST_PER_GB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team Members ({Math.max(0, teamMembers - 5)} × ₹70):</span>
                    <span className="font-medium">₹{Math.max(0, teamMembers - 5) * TEAM_MEMBER_COST}</span>
                  </div>
                  {needsCompliance && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Compliance Dashboard (+₹699):</span>
                      <span className="font-medium">₹{COMPLIANCE_COST}</span>
                    </div>
                  )}
                  {needsAdvancedSecurity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advanced Security (+₹1,399):</span>
                      <span className="font-medium">₹{ADVANCED_SECURITY_COST}</span>
                    </div>
                  )}
                  {needsDedicatedSupport && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dedicated Support (+₹2,099):</span>
                      <span className="font-medium">₹{DEDICATED_SUPPORT_COST}</span>
                    </div>
                  )}
                  {needsCustomIntegrations && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custom Integrations (+₹1,749):</span>
                      <span className="font-medium">₹{CUSTOM_INTEGRATIONS_COST}</span>
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
                  <h5 className="text-xl font-bold text-teal-600">{recommendation.plan}</h5>
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
                
                <div className="bg-teal-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-teal-800">
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

              <button className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-teal-700 hover:to-teal-800 transition-all duration-300 shadow-lg hover:shadow-xl">
                <a href="/dashboard" className="block">
                  Get Started with {recommendation.plan}
                </a>
              </button>

              {/* Custom Pack Option */}
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h5 className="font-semibold text-orange-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Or Create Your Custom Business Pack
                </h5>
                <p className="text-sm text-orange-800 mb-3">
                  Get exactly {storageGB}GB storage + {bandwidthGB}GB bandwidth + {teamMembers} team members for ₹{recommendation.customCost}/month
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
                <h5 className="font-semibold text-gray-900 mb-3">Business Benefits:</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-teal-600">99.9%</div>
                    <div className="text-gray-600">Uptime SLA</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">24/7</div>
                    <div className="text-gray-600">Support</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">India</div>
                    <div className="text-gray-600">Data Residency</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">30%</div>
                    <div className="text-gray-600">Cheaper</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
          {businessPlans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'border-teal-500 transform scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-2 rounded-full text-sm font-medium">
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
                        ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-lg hover:shadow-xl'
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

        {/* Business Features */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Businesses Choose NexusFlow
            </h2>
            <p className="text-xl text-gray-600">
              Enterprise features that scale with your organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {businessFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="flex items-start p-6 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg mr-4 flex items-center justify-center flex-shrink-0">
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

        {/* Compliance Section */}
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compliance & Security
            </h2>
            <p className="text-xl text-gray-600">
              Built for Indian businesses with strict compliance requirements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complianceFeatures.map((feature, index) => (
              <div key={index} className="flex items-center bg-white p-4 rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                <span className="text-gray-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Business?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of Indian businesses who trust NexusFlow for their storage needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Schedule Demo
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-teal-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
  );
}