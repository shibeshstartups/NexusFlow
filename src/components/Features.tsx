import React from 'react';
import { FolderCheck, Code, DollarSign, Zap, MapPin, Shield } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: FolderCheck,
      title: 'Guaranteed Folder Integrity',
      description: 'Upload and download entire folders as a single unit. No more corrupted ZIP files or missing chunks. Your data structure is always preserved.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Code,
      title: 'S3-Compatible API',
      description: 'Integrate in minutes, not days. Our fully compliant S3 API works with your existing tools and scripts. All data stays within India.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: DollarSign,
      title: 'Transparent, Predictable Pricing',
      description: 'You control exactly what you pay for storage and downloads. Simple, transparent pricing with no hidden fees or surprise charges.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Zap,
      title: 'Blazing Transfer Speed',
      description: 'Our intelligent routing and UDP-based acceleration ensure you get the fastest possible transfer speeds on any Indian network connection.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: MapPin,
      title: 'India-First Compliance',
      description: 'All data stored and processed within India. Full compliance with local data protection regulations and government requirements.',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption, access controls, and audit logs. Your data is protected with the highest security standards.',
      color: 'from-red-500 to-red-600'
    }
  ];

  return (
    <section id="features" className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Why Developers and Creators Choose NexusFlow
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built for the Indian market with transparent pricing, blazing speeds, and enterprise-grade reliability
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg mb-4 flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Built for Performance & Reliability
            </h3>
            <p className="text-gray-600 mb-6 max-w-3xl mx-auto text-sm">
              Our platform is engineered for maximum speed and reliability, with intelligent routing 
              and enterprise-grade infrastructure to ensure your data is always accessible.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="text-base font-semibold mb-1.5 text-blue-600">Global CDN</h4>
                <p className="text-gray-600 text-xs">Lightning-fast content delivery worldwide</p>
                <p className="text-xl font-bold text-gray-900 mt-1.5">99.9% Uptime</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-teal-500">
                <h4 className="text-base font-semibold mb-1.5 text-teal-600">Indian Infrastructure</h4>
                <p className="text-gray-600 text-xs">All data stored and processed in India</p>
                <p className="text-xl font-bold text-gray-900 mt-1.5">100% Compliant</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="text-base font-semibold mb-1.5 text-orange-600">Enterprise Security</h4>
                <p className="text-gray-600 text-xs">Bank-grade encryption and access controls</p>
                <p className="text-xl font-bold text-gray-900 mt-1.5">256-bit AES</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}