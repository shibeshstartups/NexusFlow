import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsDashboardService from '../services/analyticsDashboardService';

interface DashboardState {
  isLoading: boolean;
  isConnected: boolean;
  metrics: any;
  summary: any;
  alerts: any[];
  error: string | null;
  lastUpdated: string | null;
}

interface UseAnalyticsDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
  enableAlerts?: boolean;
}

export const useAnalyticsDashboard = (options: UseAnalyticsDashboardOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealtime = true,
    enableAlerts = true
  } = options;

  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    isConnected: false,
    metrics: {},
    summary: null,
    alerts: [],
    error: null,
    lastUpdated: null
  });

  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch initial data
        const summary = await analyticsDashboardService.fetchSummaryData();
        await analyticsDashboardService.fetchLatestMetrics();

        setState(prev => ({
          ...prev,
          summary,
          metrics: analyticsDashboardService.getCurrentMetrics(),
          isLoading: false,
          lastUpdated: new Date().toISOString()
        }));

        if (enableRealtime) {
          setupRealtimeSubscriptions();
        }

      } catch (error) {
        console.error('Failed to initialize analytics dashboard:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load dashboard',
          isLoading: false
        }));
      }
    };

    initializeDashboard();

    return () => {
      // Cleanup subscriptions
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, [enableRealtime]);

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    const subscriptions = [
      // Connection status
      analyticsDashboardService.subscribe('connection', (data) => {
        setState(prev => ({
          ...prev,
          isConnected: data.status === 'connected'
        }));
      }),

      // Performance metrics
      analyticsDashboardService.subscribe('performance', (data) => {
        setState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            performance: data
          },
          lastUpdated: new Date().toISOString()
        }));
      }),

      // Storage metrics
      analyticsDashboardService.subscribe('storage', (data) => {
        setState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            storage: data
          },
          lastUpdated: new Date().toISOString()
        }));
      }),

      // User metrics
      analyticsDashboardService.subscribe('users', (data) => {
        setState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            users: data
          },
          lastUpdated: new Date().toISOString()
        }));
      }),

      // Alerts
      analyticsDashboardService.subscribe('alert', (alert) => {
        if (enableAlerts) {
          setState(prev => ({
            ...prev,
            alerts: [alert, ...prev.alerts.slice(0, 49)] // Keep last 50 alerts
          }));
        }
      }),

      // Errors
      analyticsDashboardService.subscribe('error', (error) => {
        setState(prev => ({
          ...prev,
          error: error.message || 'Real-time connection error'
        }));
      })
    ];

    unsubscribeRefs.current = subscriptions;
  }, [enableAlerts]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        await analyticsDashboardService.refreshAllMetrics();
        setState(prev => ({
          ...prev,
          metrics: analyticsDashboardService.getCurrentMetrics(),
          lastUpdated: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Manual refresh function
  const refreshMetrics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await analyticsDashboardService.refreshAllMetrics();
      const summary = await analyticsDashboardService.fetchSummaryData();

      setState(prev => ({
        ...prev,
        metrics: analyticsDashboardService.getCurrentMetrics(),
        summary,
        isLoading: false,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
        isLoading: false
      }));
    }
  }, []);

  // Get historical data
  const getHistoricalData = useCallback(async (
    metric: string,
    timeRange: string = '24h',
    interval: string = '1h'
  ) => {
    try {
      return await analyticsDashboardService.getHistoricalMetrics(metric, timeRange, interval);
    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }, []);

  // Get Web Vitals summary
  const getWebVitalsSummary = useCallback(async (timeRange: string = '24h') => {
    try {
      return await analyticsDashboardService.getWebVitalsSummary(timeRange);
    } catch (error) {
      console.error('Failed to get Web Vitals summary:', error);
      return null;
    }
  }, []);

  // Create alert
  const createAlert = useCallback(async (alertConfig: any) => {
    try {
      const alertId = await analyticsDashboardService.createAlert(alertConfig);
      return alertId;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }, []);

  // Export data
  const exportData = useCallback((format: 'json' | 'csv' = 'json') => {
    try {
      return analyticsDashboardService.exportMetrics(format);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '';
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    isConnected: state.isConnected,
    metrics: state.metrics,
    summary: state.summary,
    alerts: state.alerts,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    refreshMetrics,
    getHistoricalData,
    getWebVitalsSummary,
    createAlert,
    exportData,
    clearError,
    clearAlerts
  };
};

// Hook for specific metric monitoring
export const useMetricMonitoring = (metricPath: string, options: { threshold?: number } = {}) => {
  const [value, setValue] = useState<number | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const previousValue = useRef<number | null>(null);

  const { metrics } = useAnalyticsDashboard({ enableRealtime: true });

  useEffect(() => {
    // Extract metric value using path (e.g., 'performance.webVitals.lcp')
    const pathParts = metricPath.split('.');
    let currentValue = metrics;

    for (const part of pathParts) {
      if (currentValue && typeof currentValue === 'object') {
        currentValue = currentValue[part];
      } else {
        currentValue = null;
        break;
      }
    }

    // Get latest value from array if it's an array
    if (Array.isArray(currentValue) && currentValue.length > 0) {
      const latest = currentValue[currentValue.length - 1];
      currentValue = latest.value || latest;
    }

    if (typeof currentValue === 'number') {
      setValue(currentValue);

      // Calculate trend
      if (previousValue.current !== null) {
        const change = currentValue - previousValue.current;
        const changePercent = Math.abs(change / previousValue.current) * 100;

        if (changePercent > 5) { // 5% threshold for trend change
          setTrend(change > 0 ? 'up' : 'down');
        } else {
          setTrend('stable');
        }
      }

      previousValue.current = currentValue;

      // Check threshold
      if (options.threshold !== undefined) {
        setIsAboveThreshold(currentValue > options.threshold);
      }
    }
  }, [metrics, metricPath, options.threshold]);

  return {
    value,
    trend,
    isAboveThreshold,
    hasData: value !== null
  };
};

export default useAnalyticsDashboard;