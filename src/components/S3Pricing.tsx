import React from 'react';
import { Code, Database, Zap, TrendingDown } from 'lucide-react';

export default function S3Pricing() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Code className="w-4 h-4 mr-2" />
            S3-Compatible Storage
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Developer-Friendly S3 Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Significantly cheaper than AWS S3 in India. Perfect for developers and businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mr-4 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Storage</h3>
                <p className="text-gray-600">Per GB stored per month</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">₹0.60</span>
              <span className="text-gray-500 ml-2">/GB/month</span>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-green-800">
                <TrendingDown className="w-5 h-5 mr-2" />
                <span className="font-medium">70% cheaper than AWS S3 India</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Full S3 API compatibility</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>99.9% uptime SLA</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Data stored in India</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Instant provisioning</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg mr-4 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Bandwidth</h3>
                <p className="text-gray-600">Per GB downloaded (egress)</p>
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">₹0.20</span>
              <span className="text-gray-500 ml-2">/GB downloaded</span>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-green-800">
                <TrendingDown className="w-5 h-5 mr-2" />
                <span className="font-medium">90% cheaper than AWS egress</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                <span>Cloudflare-powered CDN</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                <span>Global edge locations</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                <span>UDP acceleration</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-teal-500 rounded-full mr-3"></div>
                <span>No minimum charges</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <Database className="w-6 h-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-bold text-red-800 mb-2">
                Why Our S3 Pricing Beats AWS India
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-red-700">
                <div>
                  <h5 className="font-semibold mb-2">AWS S3 India Pricing:</h5>
                  <ul className="space-y-1 text-sm">
                    <li>• Storage: ₹2.30/GB/month (Standard)</li>
                    <li>• Egress: ₹7.50/GB (first 10TB)</li>
                    <li>• API requests: ₹0.0004 per request</li>
                    <li>• Complex tiering and lifecycle costs</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">NexusFlow Pricing:</h5>
                  <ul className="space-y-1 text-sm">
                    <li>• Storage: ₹0.60/GB/month (70% cheaper)</li>
                    <li>• Egress: ₹0.20/GB (97% cheaper)</li>
                    <li>• API requests: Included in storage</li>
                    <li>• Simple, transparent pricing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-8 rounded-2xl max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to Switch from AWS?</h3>
            <p className="text-xl text-blue-100 mb-6">
              Migrate your S3 buckets to NexusFlow and save up to 90% on your storage costs
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Migration Tool
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}