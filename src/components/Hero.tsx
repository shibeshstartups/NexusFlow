import React from 'react';
import { ArrowRight, Zap, Shield, Gauge } from 'lucide-react';

export default function Hero() {
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium mb-4">
            <Zap className="w-3 h-3 mr-1.5" />
            High-Performance Storage & Transfer Platform
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Blazing Fast{' '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Data Storage
            </span>{' '}
            & Transfer in India
          </h1>
          
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            Predictable pricing, lightning speeds, and guaranteed folder integrity. 
            <strong>All data stays in India</strong> with full S3 API compatibility.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center">
              Start Free (2GB)
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-300">
              View Pricing
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Blazing Transfer Speed</h3>
            <p className="text-gray-600 text-sm">Intelligent routing and UDP acceleration for fastest speeds on Indian networks</p>
          </div>

          <div className="text-center p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Guaranteed Folder Integrity</h3>
            <p className="text-gray-600 text-sm">Upload and download entire folders as single units. No corrupted ZIPs or missing chunks</p>
          </div>

          <div className="text-center p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Predictable Pricing</h3>
            <p className="text-gray-600 text-sm">You control exactly what you pay - no hidden fees or surprise charges</p>
          </div>
        </div>
      </div>
    </section>
  );
}