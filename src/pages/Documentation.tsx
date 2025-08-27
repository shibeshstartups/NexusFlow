<<<<<<< HEAD
import { ArrowLeft, Book, Code, FileText, ExternalLink, Copy, CheckCircle } from 'lucide-react';
=======
import React from 'react';
import { ArrowLeft, Book, Code, FileText, Search, ExternalLink, Copy, CheckCircle } from 'lucide-react';
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc

export default function Documentation() {
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
            <Book className="w-4 h-4 mr-2" />
            Documentation
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            NexusFlow Documentation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete guides, API references, and tutorials to help you get the most out of NexusFlow's S3-compatible storage platform.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Quick Start Guide</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-600 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Account</h3>
              <p className="text-gray-600 mb-4">Sign up for your free NexusFlow account and get 2GB storage to start.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Sign Up Free
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-600 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get API Keys</h3>
              <p className="text-gray-600 mb-4">Generate your access keys from the dashboard to start using our S3-compatible API.</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
                Generate Keys
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-600 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Building</h3>
              <p className="text-gray-600 mb-4">Use our SDKs or direct API calls to integrate storage into your applications.</p>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
                View Examples
              </button>
            </div>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <Code className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-2xl font-bold text-gray-900">API Reference</h3>
            </div>
            <p className="text-gray-600 mb-6">Complete S3-compatible API documentation with examples and code samples.</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Bucket Operations</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Object Management</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Authentication & Security</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Error Handling</span>
              </li>
            </ul>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center">
              View API Docs
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <FileText className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-2xl font-bold text-gray-900">Guides & Tutorials</h3>
            </div>
            <p className="text-gray-600 mb-6">Step-by-step guides for common use cases and integration patterns.</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>AWS S3 Migration Guide</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>SDK Integration Examples</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Best Practices</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span>Performance Optimization</span>
              </li>
            </ul>
            <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center">
              Browse Guides
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Quick Example</h3>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center">
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </button>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
            <pre className="text-green-400 text-sm">
{`// Initialize NexusFlow client
import { S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'in-mumbai-1',
  endpoint: 'https://api.nexusflow.com',
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key'
  }
});

// Upload a file
import { PutObjectCommand } from '@aws-sdk/client-s3';

const uploadFile = async (bucketName, key, body) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body
  });
  
  const response = await client.send(command);
  console.log('File uploaded successfully:', response);
};`}
            </pre>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Our support team is here to help you succeed with NexusFlow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Contact Support
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Join Community
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}