import React, { useState } from 'react';
import {
  Activity,
  Database,
  Globe,
  HardDrive,
  RefreshCw,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import useAnalyticsDashboard, { useMetricMonitoring } from '../hooks/useAnalyticsDashboard';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'blue',
  isLoading = false
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-500" />,
    down: <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />,
    stable: <Activity className="w-4 h-4 text-gray-500" />
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center space-x-1">
              {trendIcons[trend]}
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-500' : 
                trend === 'down' ? 'text-red-500' : 
                'text-gray-500'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface AlertItemProps {
  alert: {
    id: string;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    timestamp: string;
  };
  onDismiss: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onDismiss }) => {
  const levelConfig = {
    info: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    warning: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
    error: { icon: <XCircle className="w-5 h-5" />, color: 'text-red-500 bg-red-50 border-red-200' }
  };

  const config = levelConfig[alert.level];

  return (
    <div className={`p-4 rounded-lg border ${config.color} relative`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          <p className="text-xs text-gray-500 mt-2">
            {format(parseISO(alert.timestamp), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const {
    isLoading,
    isConnected,
    metrics,
    alerts,
    error,
    lastUpdated,
    refreshMetrics,
    clearAlerts
  } = useAnalyticsDashboard();

  const [selectedMetric, setSelectedMetric] = useState('lcp');

  // Monitor specific metrics
  const lcpMetric = useMetricMonitoring('performance.webVitals.lcp', { threshold: 2500 });
  const errorRateMetric = useMetricMonitoring('performance.serverMetrics.errorRate', { threshold: 0.05 });

  // Format chart data
  const formatChartData = (data: any[], timeKey = 'timestamp', valueKey = 'value') => {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      ...item,
      time: format(parseISO(item[timeKey]), 'HH:mm'),
      [valueKey]: typeof item[valueKey] === 'number' ? item[valueKey] : 0
    }));
  };

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Real-time performance and business metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Updated {format(parseISO(lastUpdated), 'HH:mm:ss')}
              </span>
            )}

            {/* Refresh Button */}
            <button
              onClick={refreshMetrics}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Users"
            value={metrics?.users?.active?.[metrics.users.active.length - 1]?.value || 0}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            isLoading={isLoading}
          />
          
          <MetricCard
            title="LCP (avg)"
            value={lcpMetric.value ? `${(lcpMetric.value / 1000).toFixed(2)}s` : '0s'}
            icon={<Activity className="w-6 h-6" />}
            trend={lcpMetric.trend}
            trendValue={lcpMetric.isAboveThreshold ? 'Poor' : 'Good'}
            color={lcpMetric.isAboveThreshold ? 'red' : 'green'}
            isLoading={isLoading}
          />
          
          <MetricCard
            title="Storage Used"
            value={formatBytes(metrics?.storage?.usage?.[metrics.storage.usage.length - 1]?.value || 0)}
            icon={<HardDrive className="w-6 h-6" />}
            color="purple"
            isLoading={isLoading}
          />
          
          <MetricCard
            title="Error Rate"
            value={errorRateMetric.value ? `${(errorRateMetric.value * 100).toFixed(2)}%` : '0%'}
            icon={<AlertTriangle className="w-6 h-6" />}
            trend={errorRateMetric.trend}
            color={errorRateMetric.isAboveThreshold ? 'red' : 'green'}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Web Vitals Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Core Web Vitals</h3>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="lcp">LCP</option>
                <option value="fid">FID</option>
                <option value="cls">CLS</option>
                <option value="fcp">FCP</option>
                <option value="ttfb">TTFB</option>
              </select>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(metrics?.performance?.webVitals?.[selectedMetric] || [])}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      selectedMetric === 'cls' ? value.toFixed(3) : `${value.toFixed(0)}ms`,
                      selectedMetric.toUpperCase()
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Server Performance Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Server Performance</h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatChartData(metrics?.performance?.serverMetrics?.responseTime || [])}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Storage Usage Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Storage Usage Trend</h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatChartData(metrics?.storage?.usage || [])}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatBytes(value), 'Storage Used']} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8B5CF6" 
                    fill="#8B5CF6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* File Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">File Type Distribution</h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.storage?.distribution?.byType || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(metrics?.storage?.distribution?.byType || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
              <button
                onClick={clearAlerts}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onDismiss={(_id) => {
                    // Handle individual alert dismissal
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Database</p>
                <p className="text-lg font-semibold text-green-600">Healthy</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">CDN</p>
                <p className="text-lg font-semibold text-green-600">Operational</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">API</p>
                <p className="text-lg font-semibold text-green-600">99.9% Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default AnalyticsDashboard;