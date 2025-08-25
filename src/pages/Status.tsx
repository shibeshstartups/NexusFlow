import React, { useState } from 'react';
import { ArrowLeft, Activity, CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp } from 'lucide-react';

export default function Status() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  const systemStatus = {
    overall: 'operational',
    lastUpdated: new Date().toLocaleString()
  };

  const services = [
    {
      name: 'API Gateway',
      status: 'operational',
      uptime: '99.98%',
      responseTime: '45ms',
      description: 'S3-compatible API endpoints'
    },
    {
      name: 'Storage Service',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '12ms',
      description: 'File storage and retrieval'
    },
    {
      name: 'CDN Network',
      status: 'operational',
      uptime: '99.97%',
      responseTime: '28ms',
      description: 'Global content delivery'
    },
    {
      name: 'Authentication',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '35ms',
      description: 'User authentication and authorization'
    },
    {
      name: 'Dashboard',
      status: 'operational',
      uptime: '99.95%',
      responseTime: '120ms',
      description: 'Web dashboard and management interface'
    },
    {
      name: 'Webhooks',
      status: 'operational',
      uptime: '99.96%',
      responseTime: '67ms',
      description: 'Real-time event notifications'
    }
  ];

  const incidents = [
    {
      id: 1,
      title: 'Scheduled Maintenance - Mumbai Data Center',
      status: 'completed',
      severity: 'maintenance',
      date: '2024-01-15',
      time: '02:00 - 04:00 IST',
      description: 'Routine maintenance to upgrade storage infrastructure. No service interruption expected.',
      updates: [
        { time: '04:00 IST', message: 'Maintenance completed successfully. All systems operational.' },
        { time: '02:00 IST', message: 'Maintenance started. Monitoring all systems.' }
      ]
    },
    {
      id: 2,
      title: 'API Response Time Degradation',
      status: 'resolved',
      severity: 'minor',
      date: '2024-01-12',
      time: '14:30 - 15:15 IST',
      description: 'Some users experienced slower API response times due to increased traffic.',
      updates: [
        { time: '15:15 IST', message: 'Issue resolved. Response times back to normal.' },
        { time: '14:45 IST', message: 'Investigating elevated response times. Scaling additional resources.' },
        { time: '14:30 IST', message: 'Monitoring reports of slower API responses.' }
      ]
    }
  ];

  const metrics = {
    '24h': {
      uptime: '99.98%',
      requests: '2.4M',
      avgResponse: '42ms',
      dataTransferred: '1.2TB'
    },
    '7d': {
      uptime: '99.97%',
      requests: '18.6M',
      avgResponse: '45ms',
      dataTransferred: '8.9TB'
    },
    '30d': {
      uptime: '99.96%',
      requests: '76.2M',
      avgResponse: '47ms',
      dataTransferred: '34.1TB'
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'outage':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-700 bg-green-100';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-100';
      case 'outage':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

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
            <Activity className="w-4 h-4 mr-2" />
            System Status
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            NexusFlow System Status
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time status and performance metrics for all NexusFlow services and infrastructure.
          </p>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <h2 className="text-3xl font-bold text-gray-900">All Systems Operational</h2>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {systemStatus.lastUpdated}
            </div>
          </div>
          
          <p className="text-gray-600 mb-8">
            All NexusFlow services are running normally. Our systems are performing optimally with no reported issues.
          </p>

          {/* Metrics Selector */}
          <div className="flex space-x-2 mb-6">
            {['24h', '7d', '30d'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-900">Uptime</h4>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">{metrics[selectedTimeframe as keyof typeof metrics].uptime}</div>
              <div className="text-sm text-green-600">Last {selectedTimeframe}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-900">Requests</h4>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">{metrics[selectedTimeframe as keyof typeof metrics].requests}</div>
              <div className="text-sm text-blue-600">API requests processed</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-purple-900">Response Time</h4>
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700">{metrics[selectedTimeframe as keyof typeof metrics].avgResponse}</div>
              <div className="text-sm text-purple-600">Average response time</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-orange-900">Data Transfer</h4>
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-700">{metrics[selectedTimeframe as keyof typeof metrics].dataTransferred}</div>
              <div className="text-sm text-orange-600">Total data transferred</div>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Service Status</h2>
          
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{service.uptime}</div>
                    <div className="text-gray-500">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{service.responseTime}</div>
                    <div className="text-gray-500">Response</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Recent Incidents</h2>
          
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recent Incidents</h3>
              <p className="text-gray-600">All systems have been running smoothly with no reported incidents.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {incidents.map((incident) => (
                <div key={incident.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{incident.title}</h4>
                      <p className="text-gray-600 mb-2">{incident.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{incident.date}</span>
                        <span>{incident.time}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      incident.status === 'resolved' ? 'text-green-700 bg-green-100' :
                      incident.status === 'completed' ? 'text-blue-700 bg-blue-100' :
                      'text-yellow-700 bg-yellow-100'
                    }`}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {incident.updates.map((update, updateIndex) => (
                      <div key={updateIndex} className="flex items-start space-x-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-medium text-gray-900">{update.time}</span>
                          <span className="text-gray-600 ml-2">{update.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe to Updates */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-xl text-blue-100 mb-8">
            Subscribe to status updates and get notified about any service incidents or maintenance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}