import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileCheck, Users, Globe, Award, CheckCircle } from 'lucide-react';

export default function Security() {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'All data is encrypted using AES-256 encryption both at rest and in transit, ensuring your files are always protected.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Eye,
      title: 'Zero-Knowledge Architecture',
      description: 'We cannot access your data. Only you have the keys to decrypt and view your files.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: FileCheck,
      title: 'Data Integrity Verification',
      description: 'Every file upload and download is verified with checksums to ensure data integrity and prevent corruption.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Access Control & IAM',
      description: 'Granular permissions and role-based access control to manage who can access your data.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Globe,
      title: 'India Data Residency',
      description: 'All data is stored and processed exclusively within Indian borders, ensuring compliance with local regulations.',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: Award,
      title: 'Regular Security Audits',
      description: 'Independent third-party security audits and penetration testing to maintain the highest security standards.',
      color: 'from-red-500 to-red-600'
    }
  ];

  const certifications = [
    {
      name: 'SOC 2 Type II',
      description: 'Comprehensive audit of security, availability, and confidentiality controls',
      status: 'Certified',
      year: '2024'
    },
    {
      name: 'ISO 27001',
      description: 'International standard for information security management systems',
      status: 'Certified',
      year: '2024'
    },
    {
      name: 'GDPR Compliant',
      description: 'Full compliance with European data protection regulations',
      status: 'Compliant',
      year: '2024'
    },
    {
      name: 'Indian Data Protection',
      description: 'Adherence to Indian data protection and privacy laws',
      status: 'Compliant',
      year: '2024'
    }
  ];

  const securityPractices = [
    'Multi-factor authentication (MFA) for all accounts',
    'Regular automated security scanning and monitoring',
    'Incident response team available 24/7',
    'Employee security training and background checks',
    'Secure development lifecycle (SDLC) practices',
    'Regular backup and disaster recovery testing',
    'Network segmentation and firewall protection',
    'Continuous vulnerability assessment and patching'
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
          <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4 mr-2" />
            Security & Compliance
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Data Security is Our Priority
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            NexusFlow implements enterprise-grade security measures to protect your data with bank-level encryption, 
            compliance certifications, and transparent security practices.
          </p>
        </div>

        {/* Security Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Security Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl mb-6 flex items-center justify-center`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Compliance Certifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">{cert.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{cert.description}</p>
                
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">{cert.status} {cert.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Practices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Practices</h3>
            <div className="space-y-4">
              {securityPractices.map((practice, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{practice}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Data Protection Guarantee</h3>
            <div className="space-y-4 mb-6">
              <div className="bg-white bg-opacity-80 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">🇮🇳 India-First Approach</h4>
                <p className="text-blue-800 text-sm">All data stored and processed within Indian borders with no cross-border transfers.</p>
              </div>
              
              <div className="bg-white bg-opacity-80 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">🔒 Zero-Access Policy</h4>
                <p className="text-blue-800 text-sm">We cannot access your data even if we wanted to. Your encryption keys remain with you.</p>
              </div>
              
              <div className="bg-white bg-opacity-80 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">📋 Transparent Reporting</h4>
                <p className="text-blue-800 text-sm">Regular transparency reports on security incidents and government requests.</p>
              </div>
            </div>
            
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              View Security Whitepaper
            </button>
          </div>
        </div>

        {/* Incident Response */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl p-8 mb-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">24/7 Security Monitoring</h2>
            <p className="text-xl text-red-100 mb-8">
              Our security team monitors all systems around the clock to detect and respond to any potential threats.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h4 className="text-lg font-bold mb-2">Detection</h4>
                <p className="text-red-100 text-sm">Advanced threat detection systems monitor for suspicious activity</p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h4 className="text-lg font-bold mb-2">Response</h4>
                <p className="text-red-100 text-sm">Immediate response protocols to contain and mitigate any incidents</p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h4 className="text-lg font-bold mb-2">Recovery</h4>
                <p className="text-red-100 text-sm">Rapid recovery procedures to restore normal operations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vulnerability Disclosure */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Responsible Disclosure</h2>
          <p className="text-xl text-gray-600 mb-8">
            Help us keep NexusFlow secure. Report security vulnerabilities through our responsible disclosure program.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl">
              Report Vulnerability
            </button>
            <a 
              href="/vulnerability-reward-programme"
              className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
            >
              View Reward Programme
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}