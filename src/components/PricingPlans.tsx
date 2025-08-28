import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Zap, Smartphone, Monitor, Star, ArrowRight } from 'lucide-react';

export default function PricingPlans() {
  const navigate = useNavigate();
  
  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      // Redirect to sign up for free plan
      navigate('/sign-in?plan=free');
    } else {
      // Redirect to payment gateway
      navigate(`/payment?plan=${planId}`);
    }
  };
  const getBasePlanId = (planName: string): string => {
    const planMap: { [key: string]: string } = {
      'Free Plan': 'free',
      'Starter': 'starter',
      'Personal': 'personal',
      'Pro': 'pro'
    };
    return planMap[planName] || planName.toLowerCase().replace(/\s+/g, '_');
  };

  const plans = [
    {
      name: 'Free Plan',
      price: '₹0',
      period: 'forever',
      icon: Zap,
      color: 'from-gray-500 to-gray-600',
      storage: '2 GB',
      bandwidth: '10 GB',
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Starter',
      price: '₹50',
      period: 'per month',
      icon: Smartphone,
      color: 'from-green-600 to-green-700',
      storage: '30 GB',
      bandwidth: '150 GB',
      cta: 'Start Starter',
      popular: false
    },
    {
      name: 'Personal',
      price: '₹150',
      period: 'per month',
      icon: Monitor,
      color: 'from-orange-600 to-orange-700',
      storage: '150 GB',
      bandwidth: '750 GB',
      cta: 'Start Personal',
      popular: true,
      badge: 'Most Popular'
    },
    {
      name: 'Pro',
      price: '₹299',
      period: 'per month',
      icon: Star,
      color: 'from-blue-600 to-blue-700',
      storage: '400 GB',
      bandwidth: '2 TB',
      cta: 'Start Pro',
      popular: false
    }
  ];

  const features = [
    {
      category: 'Storage',
      items: [
        {
          name: 'Storage space',
          values: ['2 GB', '30 GB', '150 GB', '400 GB']
        },
        {
          name: 'Download bandwidth',
          values: ['10 GB', '150 GB', '750 GB', '2 TB']
        },
        {
          name: 'File versioning',
          values: [false, true, true, true]
        },
        {
          name: 'Advanced file management',
          values: [false, false, true, true]
        },
        {
          name: 'Bulk operations',
          values: [false, false, false, true]
        }
      ]
    },
    {
      category: 'Features',
      items: [
        {
          name: 'Web dashboard',
          values: ['Basic', 'Standard', 'Advanced', 'Advanced']
        },
        {
          name: 'Share links',
          values: [true, true, true, true]
        },
        {
          name: 'Password protection',
          values: [false, true, true, true]
        }
      ]
    }
  ];

  return (
    <section id="pricing" className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Transparent Usage-Based Pricing
          </h2>
          <p className="text-lg text-gray-600">
            Simple dual usage model perfect for the Indian market. No surprise bills.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={index}
                className={`relative bg-white rounded-xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'border-blue-500 transform scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <div className={`w-10 h-10 bg-gradient-to-r ${plan.color} rounded-lg mb-3 flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                  
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-1 text-sm">/{plan.period}</span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Storage:</span>
                      <span className="font-semibold text-sm">{plan.storage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Bandwidth:</span>
                      <span className="font-semibold text-sm">{plan.bandwidth}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlanSelect(getBasePlanId(plan.name))}
                    className={`w-full py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 text-sm ${
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

        {/* Detailed Feature Comparison Table */}
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Find the right NexusFlow plan for you
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-sm"></th>
                  {plans.map((plan, index) => (
                    <th key={index} className="text-center py-3 px-3 min-w-[100px] bg-gray-50">
                      <div className="font-bold text-gray-900 text-sm">{plan.name}</div>
                      <div className="text-xs text-gray-500">{plan.price}/{plan.period}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr>
                      <td colSpan={7} className="py-4">
                        <div className="flex items-center">
                          <div className="w-5 h-5 bg-blue-600 rounded mr-2 flex items-center justify-center">
                            <span className="text-white text-xs">
                              {category.category === 'Storage' ? '💾' : category.category === 'Features' ? '⚡' : '🎧'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900">{category.category}</h4>
                        </div>
                      </td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b border-gray-100 hover:bg-white transition-colors text-sm">
                        <td className="py-3 px-3 text-gray-700 font-medium">{item.name}</td>
                        {item.values.map((value, valueIndex) => (
                          <td key={valueIndex} className="py-3 px-3 text-center">
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Check className="w-4 h-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-gray-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-gray-900 font-medium text-sm">{value}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pay-As-You-Go Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 mb-12">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Pay-As-You-Go Option
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Top up any plan when you need extra bandwidth. Perfect for seasonal usage spikes.
            </p>
            
            <div className="bg-white p-6 rounded-lg shadow-sm max-w-sm mx-auto">
              <h4 className="text-xl font-semibold mb-3 text-orange-600">₹0.25 per GB</h4>
              <p className="text-gray-600 mb-3 text-sm">Additional download bandwidth</p>
              <p className="text-xs text-gray-500">Automatically charged when you exceed your plan limits</p>
            </div>
          </div>
        </div>

        {/* Specialized Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-xl">👨‍💻</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">For Developers</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Need S3-compatible API access, webhooks, and advanced integrations? 
              Check out our developer-focused plans with full programmatic control.
            </p>
            <div className="bg-white p-3 rounded-lg mb-4">
              <div className="text-xs text-gray-600 mb-1">Starting from</div>
              <div className="text-xl font-bold text-blue-600">₹499/month</div>
              <div className="text-xs text-gray-500">Full S3 API • 500GB Storage • 2.5TB Bandwidth</div>
            </div>
            <a 
              href="/developer-plans"
              onClick={(e) => {
                e.preventDefault();
                navigate('/developer-plans');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center mx-auto text-sm"
            >
              View Developer Plans
              <ArrowRight className="w-3 h-3 ml-2" />
            </a>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">For Business</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Enterprise features like team management, advanced security, compliance reports, 
              and dedicated support for your organization.
            </p>
            <div className="bg-white p-3 rounded-lg mb-4">
              <div className="text-xs text-gray-600 mb-1">Starting from</div>
              <div className="text-xl font-bold text-teal-600">₹1,999/month</div>
              <div className="text-xs text-gray-500">Team Management • 5TB Storage • 25TB Bandwidth</div>
            </div>
            <a 
              href="/business-plans"
              onClick={(e) => {
                e.preventDefault();
                navigate('/business-plans');
              }}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center mx-auto text-sm"
            >
              View Business Plans
              <ArrowRight className="w-3 h-3 ml-2" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}