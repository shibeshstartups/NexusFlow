import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Search, MessageCircle, Phone, Mail, Clock, CheckCircle } from 'lucide-react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      title: 'Getting Started',
      icon: '🚀',
      articles: [
        'How to create your first bucket',
        'Setting up API access keys',
        'Understanding storage limits',
        'Basic file upload and download'
      ]
    },
    {
      title: 'API & Integration',
      icon: '⚡',
      articles: [
        'S3 API compatibility guide',
        'SDK installation and setup',
        'Authentication methods',
        'Error codes and troubleshooting'
      ]
    },
    {
      title: 'Billing & Pricing',
      icon: '💰',
      articles: [
        'Understanding your bill',
        'Pricing calculator usage',
        'Plan upgrades and downgrades',
        'Payment methods and invoicing'
      ]
    },
    {
      title: 'Security & Compliance',
      icon: '🔒',
      articles: [
        'Data encryption and security',
        'Access control and permissions',
        'Compliance certifications',
        'Audit logs and monitoring'
      ]
    }
  ];

  const supportOptions = [
    {
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: MessageCircle,
      availability: 'Available 24/7',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Phone Support',
      description: 'Speak directly with our experts',
      icon: Phone,
      availability: 'Business hours (9 AM - 6 PM IST)',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Email Support',
      description: 'Send us detailed questions',
      icon: Mail,
      availability: 'Response within 4 hours',
      color: 'from-purple-500 to-purple-600'
    }
  ];

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
          <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Find answers to common questions, browse our knowledge base, or get in touch with our support team.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for help articles, guides, or FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{category.title}</h3>
                <ul className="space-y-2">
                  {category.articles.map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <a href="#" className="text-blue-600 hover:text-blue-700 text-sm hover:underline">
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
                <button className="mt-4 text-blue-600 font-medium hover:text-blue-700 text-sm">
                  View all articles →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Articles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">How to migrate from AWS S3</h4>
                  <p className="text-sm text-gray-600">Complete guide to migrating your data from AWS S3 to NexusFlow</p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Setting up webhooks</h4>
                  <p className="text-sm text-gray-600">Configure real-time notifications for your storage events</p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Understanding pricing</h4>
                  <p className="text-sm text-gray-600">Learn about our transparent pricing model and cost optimization</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">API authentication</h4>
                  <p className="text-sm text-gray-600">Secure your API calls with proper authentication methods</p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Bulk file operations</h4>
                  <p className="text-sm text-gray-600">Efficiently manage large numbers of files with batch operations</p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Performance optimization</h4>
                  <p className="text-sm text-gray-600">Tips to maximize upload and download speeds</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Contact Support</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300">
                  <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-xl mx-auto mb-6 flex items-center justify-center`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{option.title}</h3>
                  <p className="text-gray-600 mb-4">{option.description}</p>
                  
                  <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
                    <Clock className="w-4 h-4 mr-2" />
                    {option.availability}
                  </div>
                  
                  <button className={`w-full bg-gradient-to-r ${option.color} text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all duration-300`}>
                    {option.title === 'Live Chat' ? 'Start Chat' : 
                     option.title === 'Phone Support' ? 'Call Now' : 'Send Email'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}