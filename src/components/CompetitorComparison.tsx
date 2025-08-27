import React from 'react';
import { Check, X, Star } from 'lucide-react';

export default function CompetitorComparison() {
  const features = [
    {
      feature: 'Core Focus',
      nexus: 'S3-Compatible Storage in India',
      competitors: 'Global cloud with complex pricing'
    },
    {
      feature: 'Data Location',
      nexus: 'All data stays in India',
      competitors: 'Global regions, compliance complexity',
      nexusGood: true,
      competitorsGood: false
    },
    {
      feature: 'API Compatibility',
      nexus: 'Full S3 API compatibility',
      competitors: 'Proprietary APIs with vendor lock-in',
      nexusGood: true,
      competitorsGood: false
    },
    {
      feature: 'Pricing Transparency',
      nexus: 'Public costs, transparent margins',
      competitors: 'Hidden costs, complex calculators',
      nexusGood: true,
      competitorsGood: false
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Choose NexusFlow?
          </h2>
          <p className="text-xl text-gray-600">
            Transparent pricing, Indian compliance, and S3 compatibility at unbeatable costs
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center mb-4">
                <Star className="w-6 h-6 mr-2" />
                <h3 className="text-xl font-bold">NexusFlow</h3>
              </div>
              <p className="text-blue-100">S3-compatible storage & transfer platform</p>
            </div>
            
            <div className="bg-gray-100 p-6 md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Everyone Else</h3>
              <p className="text-gray-600">AWS S3, Google Cloud Storage, Azure Blob</p>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {features.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-0">
                <div className="p-6 bg-blue-50 font-semibold text-gray-900 border-r border-gray-200">
                  {item.feature}
                </div>
                <div className="p-6 border-r border-gray-200">
                  <div className="flex items-start">
                    {item.nexusGood !== undefined && (
                      <div className="mr-3 mt-1">
                        {item.nexusGood ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                    <span className={item.nexusGood ? 'text-green-700 font-medium' : 'text-gray-900'}>
                      {item.nexus}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start">
                    {item.competitorsGood !== undefined && (
                      <div className="mr-3 mt-1">
                        {item.competitorsGood ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                    <span className={item.competitorsGood === false ? 'text-red-600' : 'text-gray-900'}>
                      {item.competitors}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-8 rounded-2xl max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Our Final Message</h3>
            <p className="text-xl text-blue-100">
              "Stop paying AWS's premium for global infrastructure you don't need. 
              NexusFlow offers S3-compatible storage built for India with transparent, fair pricing."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}