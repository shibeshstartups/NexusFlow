import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Shield, Zap, DollarSign, Code, Globe, Users } from 'lucide-react';

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqCategories = [
    {
      title: 'General Questions',
      icon: HelpCircle,
      color: 'from-blue-500 to-blue-600',
      questions: [
        {
          question: 'What is NexusFlow and how is it different from other storage providers?',
          answer: 'NexusFlow is an S3-compatible object storage platform built specifically for India. Unlike global providers, we keep all data within India, offer transparent pricing that\'s 30% cheaper than competitors, and provide blazing-fast transfer speeds optimized for Indian networks. Our platform guarantees folder integrity and offers predictable pricing with no hidden fees.'
        },
        {
          question: 'Is my data really stored only in India?',
          answer: 'Yes, absolutely. All data is stored and processed exclusively within Indian data centers. We never transfer your data outside India, ensuring full compliance with local data protection regulations and government requirements. This also means faster access speeds and lower latency for Indian users.'
        },
        {
          question: 'How fast are the transfer speeds compared to other providers?',
          answer: 'Our intelligent routing and UDP-based acceleration deliver sub-100ms response times from Indian data centers, which is 3-5x faster than global providers\' average of 200-500ms. We\'ve optimized our infrastructure specifically for Indian network conditions to ensure maximum speed.'
        }
      ]
    },
    {
      title: 'Pricing & Plans',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      questions: [
        {
          question: 'How is NexusFlow 30% cheaper than competitors?',
          answer: 'We\'ve built our infrastructure specifically for the Indian market without the overhead of global operations. Our storage costs ₹0.85/GB vs competitors\' ₹1.20/GB, and our egress costs ₹0.35/GB vs competitors\' ₹0.50/GB. This focused approach allows us to pass significant savings to our customers.'
        },
        {
          question: 'What\'s the difference between fixed plans and pay-as-you-go pricing?',
          answer: 'Fixed plans offer bundled storage and bandwidth at discounted rates, perfect for predictable usage. Pay-as-you-go pricing charges exactly for what you use - ₹0.85/GB for storage and ₹0.35/GB for bandwidth. Our calculator helps you choose the most cost-effective option based on your usage patterns.'
        },
        {
          question: 'Are there any hidden fees or surprise charges?',
          answer: 'No hidden fees, ever. Our pricing is completely transparent. You pay only for storage and bandwidth usage. API requests are included free with all plans. No setup fees, no minimum commitments, and no surprise charges. What you see in our calculator is exactly what you\'ll pay.'
        },
        {
          question: 'Can I change my plan anytime?',
          answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated. You can also switch between fixed plans and pay-as-you-go pricing based on your changing needs.'
        }
      ]
    },
    {
      title: 'Technical & API',
      icon: Code,
      color: 'from-purple-500 to-purple-600',
      questions: [
        {
          question: 'Is NexusFlow really S3-compatible?',
          answer: 'Yes, we provide full S3 API compatibility. You can use existing AWS SDKs, tools like AWS CLI, and third-party applications without any code changes. Simply update your endpoint URL and credentials - everything else works exactly the same.'
        },
        {
          question: 'How do I migrate from AWS S3 to NexusFlow?',
          answer: 'Migration is simple and zero-downtime. Use our automated migration tool, AWS CLI sync commands, or our assisted migration service. We provide step-by-step guides and tools to transfer your data while maintaining full compatibility with your existing applications.'
        },
        {
          question: 'What about folder integrity and data consistency?',
          answer: 'We guarantee folder integrity through atomic operations. When you upload or download folders, they\'re treated as single units - no corrupted ZIPs or missing files. Every transfer is verified with checksums to ensure 100% data integrity.'
        },
        {
          question: 'Do you support webhooks and real-time notifications?',
          answer: 'Yes, our developer plans include webhook support for real-time notifications on uploads, downloads, and deletions. We provide reliable delivery with retry logic and detailed event data to integrate with your applications.'
        }
      ]
    },
    {
      title: 'Security & Compliance',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      questions: [
        {
          question: 'How secure is my data on NexusFlow?',
          answer: 'Your data is protected with bank-grade security: 256-bit AES encryption at rest and in transit, IAM policies, access controls, audit logs, and regular security audits. We\'re SOC 2 Type II compliant and ISO 27001 certified.'
        },
        {
          question: 'What compliance certifications do you have?',
          answer: 'We maintain SOC 2 Type II compliance, ISO 27001 certification, and are GDPR compliant. All data processing follows Indian data protection regulations, and we provide compliance reports for enterprise customers.'
        },
        {
          question: 'Can I control who has access to my data?',
          answer: 'Absolutely. Our business plans include role-based access controls, team management, and detailed permission settings. You can control exactly who can view, upload, download, or manage your data with granular permissions.'
        }
      ]
    },
    {
      title: 'Support & Enterprise',
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      questions: [
        {
          question: 'What kind of support do you provide?',
          answer: 'We offer email support for all plans, priority support for Pro plans, and 24/7 phone support for Enterprise customers. Our Indian support team understands local business needs and provides faster response times than global providers.'
        },
        {
          question: 'Do you offer enterprise features and custom solutions?',
          answer: 'Yes, our Enterprise plans include dedicated infrastructure, custom integrations, white-label options, SLA guarantees, and dedicated account managers. We can also develop custom features based on your specific business requirements.'
        },
        {
          question: 'What\'s your uptime guarantee?',
          answer: 'We guarantee 99.9% uptime with our standard SLA. Enterprise customers can get custom SLAs with higher guarantees. Our infrastructure is built for reliability with redundancy across multiple Indian data centers.'
        }
      ]
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Know
          </h2>
          <p className="text-xl text-gray-600">
            Common questions about NexusFlow's storage platform, pricing, and features
          </p>
        </div>

        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => {
            const IconComponent = category.icon;
            return (
              <div key={categoryIndex} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${category.color} p-6`}>
                  <div className="flex items-center text-white">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-3 flex items-center justify-center">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">{category.title}</h3>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {category.questions.map((item, itemIndex) => {
                    const globalIndex = categoryIndex * 100 + itemIndex;
                    const isOpen = openItems.includes(globalIndex);
                    
                    return (
                      <div key={itemIndex}>
                        <button
                          onClick={() => toggleItem(globalIndex)}
                          className="w-full px-6 py-6 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900 pr-4">
                              {item.question}
                            </h4>
                            <div className="flex-shrink-0">
                              {isOpen ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-700 leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Support Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Still Have Questions?</h3>
          <p className="text-xl text-blue-100 mb-6">
            Our team is here to help you find the perfect storage solution for your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Contact Support
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}