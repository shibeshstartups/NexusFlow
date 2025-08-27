<<<<<<< HEAD
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Database, Zap, Shield, DollarSign, Users, Code, Download, FileText, TrendingDown, Star } from 'lucide-react';
=======
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Database, Zap, Shield, DollarSign, Clock, Users, Code, Download, Upload, Settings, FileText, TrendingDown, Star } from 'lucide-react';
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc

export default function AWSMigration() {
  const [activeStep, setActiveStep] = useState(0);
  const [migrationMethod, setMigrationMethod] = useState<'manual' | 'automated' | 'assisted'>('automated');

  const benefits = [
    {
      icon: DollarSign,
      title: 'Save 70% on Storage Costs',
      description: 'Reduce your AWS S3 storage costs from ₹2.30/GB to ₹0.85/GB - that\'s 70% savings on your monthly storage bill.',
      savings: '₹1.45/GB saved',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: TrendingDown,
      title: 'Save 93% on Egress Costs',
      description: 'Cut your data transfer costs from ₹7.50/GB to ₹0.35/GB. Massive savings on bandwidth-heavy applications.',
      savings: '₹7.15/GB saved',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Zap,
      title: '3x Faster Performance',
      description: 'Experience sub-100ms response times from Indian data centers vs 200-500ms average from AWS India.',
      savings: '3x speed improvement',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Shield,
      title: 'Enhanced Data Compliance',
      description: 'All data stays within India with guaranteed compliance. No cross-border data transfer concerns.',
      savings: '100% India compliance',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: Code,
      title: 'Zero Code Changes',
      description: 'Full S3 API compatibility means your existing code, tools, and workflows work without any modifications.',
      savings: '0 hours migration',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Users,
      title: 'Better Support',
      description: 'Get dedicated Indian support team with faster response times and local market understanding.',
      savings: '24/7 local support',
      color: 'from-red-500 to-red-600'
    }
  ];

  const migrationSteps = [
    {
      title: 'Assessment & Planning',
      description: 'Analyze your current AWS S3 usage and plan the migration',
      duration: '1-2 days',
      tasks: [
        'Audit your current S3 buckets and usage patterns',
        'Identify dependencies and applications using S3',
        'Calculate potential cost savings with NexusFlow',
        'Plan migration timeline and rollback strategy',
        'Set up NexusFlow account and configure access'
      ]
    },
    {
      title: 'Environment Setup',
      description: 'Configure NexusFlow and prepare for data transfer',
      duration: '2-4 hours',
      tasks: [
        'Create NexusFlow buckets matching your S3 structure',
        'Configure IAM policies and access keys',
        'Set up monitoring and logging',
        'Test connectivity and permissions',
        'Prepare migration scripts and tools'
      ]
    },
    {
      title: 'Data Migration',
      description: 'Transfer your data from AWS S3 to NexusFlow',
      duration: '1-7 days',
      tasks: [
        'Start with non-critical data for testing',
        'Use parallel transfers for faster migration',
        'Verify data integrity after each transfer',
        'Monitor transfer progress and performance',
        'Handle any transfer errors or retries'
      ]
    },
    {
      title: 'Application Updates',
      description: 'Update your applications to use NexusFlow endpoints',
      duration: '2-6 hours',
      tasks: [
        'Update S3 endpoint URLs in your applications',
        'Replace AWS credentials with NexusFlow keys',
        'Test all application functionality',
        'Update CI/CD pipelines and deployment scripts',
        'Verify all integrations work correctly'
      ]
    },
    {
      title: 'Testing & Validation',
      description: 'Comprehensive testing before going live',
      duration: '1-3 days',
      tasks: [
        'Run full application test suite',
        'Perform load testing with NexusFlow',
        'Validate data integrity and completeness',
        'Test backup and disaster recovery procedures',
        'Get stakeholder approval for go-live'
      ]
    },
    {
      title: 'Go Live & Cleanup',
      description: 'Switch to production and clean up AWS resources',
      duration: '1 day',
      tasks: [
        'Switch DNS/load balancer to NexusFlow',
        'Monitor application performance closely',
        'Verify all systems are working correctly',
        'Keep AWS S3 as backup for 30 days',
        'Cancel AWS S3 resources after validation period'
      ]
    }
  ];

  const migrationMethods = [
    {
      id: 'automated',
      title: 'Automated Migration Tool',
      description: 'Use our automated migration tool for seamless transfer',
      duration: '1-3 days',
      effort: 'Low',
      cost: 'Free',
      features: [
        'Automated bucket discovery and mapping',
        'Parallel data transfer with progress tracking',
        'Automatic retry on failures',
        'Data integrity verification',
        'Rollback capability',
        'Real-time migration dashboard'
      ],
      recommended: true
    },
    {
      id: 'manual',
      title: 'Manual Migration',
      description: 'Step-by-step manual process using AWS CLI and our tools',
      duration: '3-7 days',
      effort: 'Medium',
      cost: 'Free',
      features: [
        'Complete control over migration process',
        'Custom scripting and automation',
        'Selective data migration',
        'Custom validation procedures',
        'Detailed logging and reporting'
      ]
    },
    {
      id: 'assisted',
      title: 'Assisted Migration Service',
      description: 'Our experts handle the entire migration for you',
      duration: '1-2 days',
      effort: 'None',
      cost: '₹9,999 - ₹49,999',
      features: [
        'Dedicated migration engineer',
        'Complete hands-off experience',
        'Custom migration strategy',
        'Performance optimization',
        'Post-migration support',
        'Success guarantee'
      ]
    }
  ];

  const costCalculator = {
    currentAWSCosts: {
      storage: 2.30, // ₹/GB/month
      egress: 7.50,  // ₹/GB
      requests: 0.0004 // ₹/request
    },
    nexusFlowCosts: {
      storage: 0.85, // ₹/GB/month (30% cheaper than ₹1.20)
      egress: 0.35,  // ₹/GB (30% cheaper than ₹0.50)
      requests: 0.00 // Included in storage
    }
  };

  const [storageGB, setStorageGB] = useState(1000);
  const [monthlyEgressGB, setMonthlyEgressGB] = useState(500);
  const [monthlyRequests, setMonthlyRequests] = useState(1000000);

  const calculateSavings = () => {
    const awsCosts = {
      storage: storageGB * costCalculator.currentAWSCosts.storage,
      egress: monthlyEgressGB * costCalculator.currentAWSCosts.egress,
      requests: monthlyRequests * costCalculator.currentAWSCosts.requests
    };

    const nexusCosts = {
      storage: storageGB * costCalculator.nexusFlowCosts.storage,
      egress: monthlyEgressGB * costCalculator.nexusFlowCosts.egress,
      requests: monthlyRequests * costCalculator.nexusFlowCosts.requests
    };

    const totalAWS = awsCosts.storage + awsCosts.egress + awsCosts.requests;
    const totalNexus = nexusCosts.storage + nexusCosts.egress + nexusCosts.requests;
    const savings = totalAWS - totalNexus;
    const savingsPercentage = Math.round((savings / totalAWS) * 100);

    return {
      aws: {
        storage: Math.round(awsCosts.storage),
        egress: Math.round(awsCosts.egress),
        requests: Math.round(awsCosts.requests),
        total: Math.round(totalAWS)
      },
      nexus: {
        storage: Math.round(nexusCosts.storage),
        egress: Math.round(nexusCosts.egress),
        requests: Math.round(nexusCosts.requests),
        total: Math.round(totalNexus)
      },
      savings: Math.round(savings),
      savingsPercentage,
      annualSavings: Math.round(savings * 12)
    };
  };

  const savingsData = calculateSavings();

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
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Database className="w-4 h-4 mr-2" />
            AWS S3 Migration
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Migrate from AWS S3 to NexusFlow
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Save up to 85% on your storage costs while keeping all data in India. 
            Zero downtime migration with full S3 API compatibility.
          </p>
        </div>

        {/* Cost Savings Calculator */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Calculate Your AWS S3 Savings
            </h2>
            <p className="text-xl text-gray-600">
              See exactly how much you'll save by migrating to NexusFlow
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Your Current AWS S3 Usage</h3>
              
              {/* Storage Usage */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Storage (GB)
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={storageGB}
                      onChange={(e) => setStorageGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">AWS Cost:</div>
                      <div className="text-lg font-bold text-red-600">
                        ₹{savingsData.aws.storage}/month
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

              {/* Egress Usage */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Zap className="w-5 h-5 text-green-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Monthly Data Transfer Out (GB)
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="50000"
                      value={monthlyEgressGB}
                      onChange={(e) => setMonthlyEgressGB(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter GB"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">AWS Cost:</div>
                      <div className="text-lg font-bold text-red-600">
                        ₹{savingsData.aws.egress}/month
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1"
                    max="50000"
                    value={monthlyEgressGB}
                    onChange={(e) => setMonthlyEgressGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 GB</span>
                    <span>50 TB</span>
                  </div>
                </div>
              </div>

              {/* API Requests */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center mb-4">
                  <Code className="w-5 h-5 text-purple-600 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Monthly API Requests
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="number"
                      min="1000"
                      max="100000000"
                      value={monthlyRequests}
                      onChange={(e) => setMonthlyRequests(Math.max(1000, parseInt(e.target.value) || 1000))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter requests"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">AWS Cost:</div>
                      <div className="text-lg font-bold text-red-600">
                        ₹{savingsData.aws.requests}/month
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    min="1000"
                    max="100000000"
                    value={monthlyRequests}
                    onChange={(e) => setMonthlyRequests(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1K</span>
                    <span>100M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Breakdown */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-6">Your Migration Savings</h4>
              
              {/* Cost Comparison */}
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h5 className="font-semibold text-gray-900 mb-4">Monthly Cost Comparison</h5>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-red-800">AWS S3 Total</div>
                      <div className="text-sm text-red-600">Storage + Egress + Requests</div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">₹{savingsData.aws.total}</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">NexusFlow Total</div>
                      <div className="text-sm text-green-600">Storage + Egress (Requests Free)</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">₹{savingsData.nexus.total}</div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">Monthly Savings</div>
                      <div className="text-sm text-gray-600">You save {savingsData.savingsPercentage}% every month</div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">₹{savingsData.savings}</div>
                  </div>
                </div>
              </div>

              {/* Annual Savings */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 mb-6">
                <div className="text-center">
                  <div className="text-sm text-green-100 mb-1">Annual Savings</div>
                  <div className="text-4xl font-bold mb-2">₹{savingsData.annualSavings}</div>
                  <div className="text-green-100">That's {savingsData.savingsPercentage}% less than AWS S3</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h5 className="font-semibold text-gray-900 mb-3">Detailed Cost Breakdown</h5>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-2 font-medium text-gray-700 border-b pb-2">
                    <span>Component</span>
                    <span className="text-center">AWS S3</span>
                    <span className="text-center">NexusFlow</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-600">Storage ({storageGB}GB)</span>
                    <span className="text-center text-red-600">₹{savingsData.aws.storage}</span>
                    <span className="text-center text-green-600">₹{savingsData.nexus.storage}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-600">Egress ({monthlyEgressGB}GB)</span>
                    <span className="text-center text-red-600">₹{savingsData.aws.egress}</span>
                    <span className="text-center text-green-600">₹{savingsData.nexus.egress}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-600">API Requests ({(monthlyRequests/1000000).toFixed(1)}M)</span>
                    <span className="text-center text-red-600">₹{savingsData.aws.requests}</span>
                    <span className="text-center text-green-600">₹{savingsData.nexus.requests}</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl mt-4">
                Start Migration - Save ₹{savingsData.savings}/month
              </button>
            </div>
          </div>
        </div>

        {/* Migration Benefits */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Migrate from AWS S3 to NexusFlow?
            </h2>
            <p className="text-xl text-gray-600">
              Massive cost savings, better performance, and enhanced compliance for Indian businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-16 h-16 bg-gradient-to-r ${benefit.color} rounded-xl mb-6 flex items-center justify-center`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {benefit.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {benefit.description}
                  </p>

                  <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
                    {benefit.savings}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Migration Methods */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Migration Method
            </h2>
            <p className="text-xl text-gray-600">
              Select the migration approach that best fits your needs and timeline
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {migrationMethods.map((method) => (
              <div
                key={method.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 cursor-pointer ${
                  migrationMethod === method.id ? 'border-blue-500 transform scale-105' : 'border-gray-200'
                } ${method.recommended ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                onClick={() => setMigrationMethod(method.id as any)}
              >
                {method.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Recommended
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{method.title}</h3>
                  <p className="text-gray-600 mb-6">{method.description}</p>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Duration</div>
                      <div className="font-bold text-blue-600">{method.duration}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Effort</div>
                      <div className="font-bold text-purple-600">{method.effort}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Cost</div>
                      <div className="font-bold text-green-600">{method.cost}</div>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {method.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Step-by-Step Migration Guide
            </h2>
            <p className="text-xl text-gray-600">
              Follow our comprehensive guide for a smooth, zero-downtime migration
            </p>
          </div>

          {/* Step Navigation */}
          <div className="flex flex-wrap justify-center mb-8 gap-2">
            {migrationSteps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeStep === index
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Step {index + 1}: {step.title}
              </button>
            ))}
          </div>

          {/* Active Step Content */}
          <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4">
                {activeStep + 1}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{migrationSteps[activeStep].title}</h3>
                <p className="text-gray-600">{migrationSteps[activeStep].description}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm text-gray-500">Estimated Duration</div>
                <div className="font-bold text-blue-600">{migrationSteps[activeStep].duration}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-4">Tasks for this step:</h4>
              <ul className="space-y-3">
                {migrationSteps[activeStep].tasks.map((task, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Step
              </button>
              
              <button
                onClick={() => setActiveStep(Math.min(migrationSteps.length - 1, activeStep + 1))}
                disabled={activeStep === migrationSteps.length - 1}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Migration Tools */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Migration Tools & Resources</h2>
            <p className="text-xl text-blue-100">
              Everything you need for a successful migration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white bg-opacity-10 rounded-xl p-6 text-center">
              <Download className="w-8 h-8 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Migration Tool</h3>
              <p className="text-sm text-blue-100 mb-4">Automated migration utility</p>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Download
              </button>
            </div>

            <div className="bg-white bg-opacity-10 rounded-xl p-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Migration Guide</h3>
              <p className="text-sm text-blue-100 mb-4">Comprehensive PDF guide</p>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Download
              </button>
            </div>

            <div className="bg-white bg-opacity-10 rounded-xl p-6 text-center">
              <Code className="w-8 h-8 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Code Examples</h3>
              <p className="text-sm text-blue-100 mb-4">Sample migration scripts</p>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                View Code
              </button>
            </div>

            <div className="bg-white bg-opacity-10 rounded-xl p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Expert Help</h3>
              <p className="text-sm text-blue-100 mb-4">Talk to migration experts</p>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Contact Us
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Migration FAQ
            </h2>
            <p className="text-xl text-gray-600">
              Common questions about migrating from AWS S3
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">How long does migration take?</h3>
                <p className="text-gray-600">Typically 1-7 days depending on data size and method chosen. Our automated tool can migrate most setups in 1-3 days.</p>
              </div>

              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Is there any downtime?</h3>
                <p className="text-gray-600">Zero downtime migration. We sync data first, then switch endpoints. Your applications continue running throughout.</p>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">What about data integrity?</h3>
                <p className="text-gray-600">Every file is verified with checksums. We guarantee 100% data integrity with automatic retry on any transfer issues.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-orange-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Do I need to change my code?</h3>
                <p className="text-gray-600">No code changes required. Full S3 API compatibility means just update your endpoint URL and credentials.</p>
              </div>

              <div className="border-l-4 border-teal-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">What if something goes wrong?</h3>
                <p className="text-gray-600">Complete rollback capability. We keep your AWS S3 data untouched until you confirm successful migration.</p>
              </div>

              <div className="border-l-4 border-red-500 pl-6">
                <h3 className="font-bold text-gray-900 mb-2">Is migration support included?</h3>
                <p className="text-gray-600">Yes! Free migration support for all plans. Premium assisted migration available for complex setups.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}