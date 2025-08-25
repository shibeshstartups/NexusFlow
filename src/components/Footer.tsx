import React from 'react';
import { Zap, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">NexusFlow</span>
            </div>
            <p className="text-gray-300 mb-3 text-sm">
              S3-compatible object storage and transfer platform built for India. Transparent pricing, blazing speeds.
            </p>
            <div className="flex space-x-3">
              <a href="https://twitter.com/nexusflow" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://linkedin.com/company/nexusflow" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://github.com/nexusflow" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Product</h3>
            <ul className="space-y-1.5">
              <li><a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm">Features</a></li>
              <li><a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm">Pricing</a></li>
              <li><a href="/object-storage" className="text-gray-300 hover:text-white transition-colors text-sm">Object Storage</a></li>
              <li><a href="/docs/api" className="text-gray-300 hover:text-white transition-colors text-sm">API Reference</a></li>
              <li><a href="#calculator" className="text-gray-300 hover:text-white transition-colors text-sm">Calculator</a></li>
              <li><a href="/developer-plans" className="text-gray-300 hover:text-white transition-colors text-sm">Developer Plans</a></li>
              <li><a href="/business-plans" className="text-gray-300 hover:text-white transition-colors text-sm">Business Plans</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Resources</h3>
            <ul className="space-y-1.5">
              <li><a href="/documentation" className="text-gray-300 hover:text-white transition-colors text-sm">Documentation</a></li>
              <li><a href="/help-center" className="text-gray-300 hover:text-white transition-colors text-sm">Help Center</a></li>
              <li><a href="/security" className="text-gray-300 hover:text-white transition-colors text-sm">Security</a></li>
              <li><a href="/status" className="text-gray-300 hover:text-white transition-colors text-sm">Status</a></li>
              <li><a href="/aws-migration" className="text-gray-300 hover:text-white transition-colors text-sm">AWS Migration</a></li>
              <li><a href="/vulnerability-reward-programme" className="text-gray-300 hover:text-white transition-colors text-sm">VRP</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Company</h3>
            <ul className="space-y-1.5">
              <li><a href="/about" className="text-gray-300 hover:text-white transition-colors text-sm">About</a></li>
              <li><a href="/blog" className="text-gray-300 hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="/careers" className="text-gray-300 hover:text-white transition-colors text-sm">Careers</a></li>
              <li><a href="/contact" className="text-gray-300 hover:text-white transition-colors text-sm">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-blue-400 mr-2" />
                <a href="mailto:hello@nexusfiles.com" className="text-gray-300 hover:text-white transition-colors text-sm">
                  hello@nexusfiles.com
                </a>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 text-blue-400 mr-2" />
                <a href="tel:+911234567890" className="text-gray-300 hover:text-white transition-colors text-sm">
                  +91 12345 67890
                </a>
              </div>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 text-blue-400 mr-2 mt-0.5" />
                <address className="text-gray-300 not-italic text-sm">
                  Mumbai, India
                </address>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © 2025 NexusFiles. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="/privacy" className="text-gray-300 hover:text-white transition-colors text-sm">Privacy Policy</a>
              <a href="/terms" className="text-gray-300 hover:text-white transition-colors text-sm">Terms of Service</a>
              <a href="/security" className="text-gray-300 hover:text-white transition-colors text-sm">Security</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}