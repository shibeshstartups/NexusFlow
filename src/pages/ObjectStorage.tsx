import React, { useState } from 'react';
import { ArrowLeft, Database, Shield, Zap, Globe, Code, BarChart3, CheckCircle, ArrowRight, Cloud, Server, Lock, Gauge, Users, FileText, Play, Download } from 'lucide-react';

export default function ObjectStorage() {
  const [selectedUseCase, setSelectedUseCase] = useState('backup');

  const features = [
    {
      icon: Database,
      title: 'Unlimited Scalability',
      description: 'Scale from gigabytes to petabytes seamlessly. No capacity planning required - pay only for what you use.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Shield,
      title: '99.9% Durability & Availability',
      description: 'Enterprise-grade reliability with automatic replication across multiple data centers in India.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Code,
      title: 'RESTful API Access',
      description: 'Full S3-compatible API with SDKs for all major programming languages. Integrate in minutes.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Globe,
      title: 'Multi-Region Replication',
      description: 'Automatic data replication across Indian regions for disaster recovery and compliance.',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: Lock,
      title: 'Advanced Security',
      description: 'End-to-end encryption, IAM policies, access controls, and audit logging for complete security.',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: Gauge,
      title: 'Cost-Effective Pricing',
      description: 'Transparent pricing with no hidden fees. 30% cheaper than global cloud providers.',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const useCases = {
    backup: {
      title: 'Backup & Archival',
      description: 'Secure, long-term storage for critical business data with automated lifecycle policies.',
      benefits: [
        'Automated backup scheduling',
        'Point-in-time recovery',
        'Compliance-ready archival',
        'Cost-effective long-term storage'
      ],
      icon: Shield
    },
    content: {
      title: 'Content Distribution',
      description: 'Global content delivery with edge caching for fast, reliable media distribution.',
      benefits: [
        'Global CDN integration',
        'Automatic image optimization',
        'Video streaming support',
        'Mobile-optimized delivery'
      ],
      icon: Globe
    },
    analytics: {
      title: 'Data Lakes & Analytics',
      description: 'Store and analyze massive datasets with seamless integration to analytics tools.',
      benefits: [
        'Structured and unstructured data',
        'Real-time analytics support',
        'Machine learning integration',
        'Petabyte-scale processing'
      ],
      icon: BarChart3
    },
    application: {
      title: 'Application Data Storage',
      description: 'Reliable backend storage for web and mobile applications with high performance.',
      benefits: [
        'Sub-100ms response times',
        'Auto-scaling capabilities',
        'Session and user data storage',
        'Real-time synchronization'
      ],
      icon: Server
    },
    media: {
      title: 'Media Hosting',
      description: 'Optimized storage and delivery for images, videos, and rich media content.',
      benefits: [
        'Automatic format conversion',
        'Thumbnail generation',
        'Streaming video support',
        'Progressive image loading'
      ],
      icon: Play
    }
  };

  const pricingTiers = [
    {
      name: 'Standard Storage',
      price: '₹0.60',
      unit: 'per GB/month',
      description: 'Frequently accessed data with instant retrieval',
      features: [
        'Instant access',
        '99.9% availability',
        'Multi-region replication',
        'Lifecycle management'
      ],
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Infrequent Access',
      price: '₹0.35',
      unit: 'per GB/month',
      description: 'Data accessed less than once per month',
      features: [
        'Lower storage cost',
        'Retrieval fees apply',
        'Same durability',
        'Automatic tiering'
      ],
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Archive Storage',
      price: '₹0.15',
      unit: 'per GB/month',
      description: 'Long-term archival with retrieval times of 1-5 minutes',
      features: [
        'Lowest cost storage',
        'Compliance ready',
        'Bulk retrieval',
        'Lifecycle policies'
      ],
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const additionalPricing = [
    { service: 'Data Transfer Out', price: '₹0.20 per GB', description: 'First 100GB free monthly' },
    { service: 'API Requests (GET)', price: '₹0.0004 per 1,000', description: 'Unlimited for storage plans' },
    { service: 'API Requests (PUT)', price: '₹0.005 per 1,000', description: 'Includes metadata operations' }
  ];

  const technicalSpecs = [
    {
      category: 'Protocols & APIs',
      specs: [
        'S3-compatible REST API',
        'AWS CLI support',
        'SDKs for 15+ languages',
        'GraphQL API (beta)'
      ]
    },
    {
      category: 'Regions & Availability',
      specs: [
        'Mumbai (Primary)',
        'Delhi (Secondary)',
        'Bangalore (Coming Soon)',
        '99.9% uptime SLA'
      ]
    },
    {
      category: 'Security & Compliance',
      specs: [
        'AES-256 encryption',
        'SOC 2 Type II',
        'ISO 27001 certified',
        'GDPR compliant'
      ]
    },
    {
      category: 'Integration Options',
      specs: [
        'Webhook notifications',
        'Event-driven triggers',
        'Third-party connectors',
        'Custom middleware'
      ]
    }
  ];

  const gettingStartedSteps = [
    {
      step: 1,
      title: 'Create Account',
      description: 'Sign up for NexusFlow and verify your email address',
      action: 'Get started with 10GB free storage'
    },
    {
      step: 2,
      title: 'Generate API Keys',
      description: 'Create access keys from your dashboard for programmatic access',
      action: 'Generate secure credentials'
    },
    {
      step: 3,
      title: 'Create Your First Bucket',
      description: 'Set up a storage bucket with your preferred configuration',
      action: 'Configure bucket settings'
    },
    {
      step: 4,
      title: 'Upload Data',
      description: 'Start uploading files via web interface, API, or CLI tools',
      action: 'Begin data transfer'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <div className="mb-6">
          <a href="/" className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Homepage
          </a>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium mb-4">
            <Cloud className="w-4 h-4 mr-2" />
            Object Storage Service
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Scalable Object Storage for Modern Applications
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Enterprise-grade object storage with S3 compatibility, built for India. 
            Store unlimited data with 99.9% durability and transparent pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl">
              Start Free Trial
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-300">
              View Documentation
            </button>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Enterprise-Grade Object Storage Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg mb-4 flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Object Storage Use Cases
          </h2>
          
          <div className="flex flex-wrap justify-center mb-6 gap-2">
            {Object.entries(useCases).map(([key, useCase]) => (
              <button
                key={key}
                onClick={() => setSelectedUseCase(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedUseCase === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {useCase.title}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
            <div className="flex items-center mb-4">
              {React.createElement(useCases[selectedUseCase as keyof typeof useCases].icon, {
                className: "w-8 h-8 text-blue-600 mr-3"
              })}
              <h3 className="text-2xl font-bold text-gray-900">
                {useCases[selectedUseCase as keyof typeof useCases].title}
              </h3>
            </div>
            
            <p className="text-gray-700 mb-6 text-lg">
              {useCases[selectedUseCase as keyof typeof useCases].description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {useCases[selectedUseCase as keyof typeof useCases].benefits.map((benefit, index) => (
                <div key={index} className="flex items-center bg-white bg-opacity-80 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Structure */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Transparent Object Storage Pricing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {pricingTiers.map((tier, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className={`w-12 h-12 bg-gradient-to-r ${tier.color} rounded-lg mb-4 flex items-center justify-center`}>
                  <Database className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-3">
                  <span className="text-2xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-gray-500 ml-1">{tier.unit}</span>
                </div>
                
                <p className="text-gray-600 mb-4">{tier.description}</p>
                
                <ul className="space-y-2">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {additionalPricing.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-1">{item.service}</h4>
                  <div className="text-lg font-bold text-blue-600 mb-1">{item.price}</div>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Technical Specifications
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {technicalSpecs.map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{category.category}</h3>
                <ul className="space-y-2">
                  {category.specs.map((spec, specIndex) => (
                    <li key={specIndex} className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm">{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Get Started in Minutes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gettingStartedSteps.map((step, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{step.step}</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 mb-4 text-sm">{step.description}</p>
                
                <button className="text-teal-600 font-medium hover:text-teal-700 transition-colors text-sm">
                  {step.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Storage?</h2>
          <p className="text-xl text-blue-100 mb-6">
            Join thousands of developers and businesses using NexusFlow Object Storage for reliable, scalable data storage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}