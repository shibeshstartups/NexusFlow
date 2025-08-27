interface MetricData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

interface DashboardMetrics {
  performance: {
    webVitals: {
      lcp: MetricData[];
      fid: MetricData[];
      cls: MetricData[];
      fcp: MetricData[];
      ttfb: MetricData[];
    };
    serverMetrics: {
      responseTime: MetricData[];
      errorRate: MetricData[];
      throughput: MetricData[];
      memoryUsage: MetricData[];
      cpuUsage: MetricData[];
    };
  };
  storage: {
    usage: MetricData[];
    bandwidth: MetricData[];
    requests: MetricData[];
    costs: MetricData[];
    distribution: {
      byType: MetricData[];
      bySize: MetricData[];
      byRegion: MetricData[];
    };
  };
  users: {
    active: MetricData[];
    sessions: MetricData[];
    retention: MetricData[];
    geography: MetricData[];
    devices: MetricData[];
  };
  business: {
    revenue: MetricData[];
    conversions: MetricData[];
    churn: MetricData[];
    growth: MetricData[];
    planDistribution: MetricData[];
  };
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number; // minutes
  enabled: boolean;
  lastTriggered?: string;
}

class AnalyticsDashboardService {
  private apiBase = '/api/analytics';
  private wsConnection: WebSocket | null = null;
  private metrics: Partial<DashboardMetrics> = {};
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private alerts: AlertRule[] = [];
  private isConnected = false;

  constructor() {
    this.initializeWebSocket();
    this.startPeriodicUpdates();
  }

  /**
   * Initialize WebSocket connection for real-time metrics
   */
  private initializeWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/analytics`;

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('Analytics WebSocket connected');
        this.isConnected = true;
        this.emit('connection', { status: 'connected' });
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        this.isConnected = false;
        this.emit('connection', { status: 'disconnected' });
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.initializeWebSocket();
        }, 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('Analytics WebSocket error:', error);
        this.emit('error', { error });
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle real-time metric updates
   */
  private handleRealtimeUpdate(data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'performance_update':
        this.updatePerformanceMetrics(payload);
        break;
      case 'storage_update':
        this.updateStorageMetrics(payload);
        break;
      case 'user_update':
        this.updateUserMetrics(payload);
        break;
      case 'alert_triggered':
        this.handleAlert(payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(payload: any) {
    if (!this.metrics.performance) {
      this.metrics.performance = {
        webVitals: { lcp: [], fid: [], cls: [], fcp: [], ttfb: [] },
        serverMetrics: { responseTime: [], errorRate: [], throughput: [], memoryUsage: [], cpuUsage: [] }
      };
    }

    // Update web vitals
    if (payload.webVitals && this.metrics.performance) {
      Object.entries(payload.webVitals).forEach(([metric, value]: [string, any]) => {
        const metricKey = metric.toLowerCase() as 'lcp' | 'fid' | 'cls' | 'fcp' | 'ttfb';
        const webVitals = this.metrics.performance!.webVitals;
        if (webVitals && webVitals[metricKey]) {
          webVitals[metricKey].push({
            timestamp: new Date().toISOString(),
            value: value.average || value,
            metadata: value.ratings || {}
          });
          
          // Keep only last 100 data points
          if (webVitals[metricKey].length > 100) {
            webVitals[metricKey] = webVitals[metricKey].slice(-100);
          }
        }
      });
    }

    // Update server metrics
    if (payload.serverMetrics && this.metrics.performance) {
      Object.entries(payload.serverMetrics).forEach(([metric, value]: [string, any]) => {
        const metricKey = metric as 'responseTime' | 'errorRate' | 'throughput' | 'memoryUsage' | 'cpuUsage';
        const serverMetrics = this.metrics.performance!.serverMetrics;
        if (serverMetrics && serverMetrics[metricKey]) {
          serverMetrics[metricKey].push({
            timestamp: new Date().toISOString(),
            value: typeof value === 'number' ? value : value.average || 0
          });
          
          if (serverMetrics[metricKey].length > 100) {
            serverMetrics[metricKey] = serverMetrics[metricKey].slice(-100);
          }
        }
      });
    }

    this.emit('performance', this.metrics.performance);
  }

  /**
   * Update storage metrics
   */
  private updateStorageMetrics(payload: any) {
    if (!this.metrics.storage) {
      this.metrics.storage = {
        usage: [],
        bandwidth: [],
        requests: [],
        costs: [],
        distribution: { byType: [], bySize: [], byRegion: [] }
      };
    }

    const timestamp = new Date().toISOString();
    
    if (payload.usage !== undefined) {
      this.metrics.storage.usage.push({ timestamp, value: payload.usage });
    }
    
    if (payload.bandwidth !== undefined) {
      this.metrics.storage.bandwidth.push({ timestamp, value: payload.bandwidth });
    }
    
    if (payload.requests !== undefined) {
      this.metrics.storage.requests.push({ timestamp, value: payload.requests });
    }
    
    if (payload.costs !== undefined) {
      this.metrics.storage.costs.push({ timestamp, value: payload.costs });
    }

    // Keep only last 100 data points for each metric
    Object.keys(this.metrics.storage).forEach(key => {
      const storageMetric = this.metrics.storage?.[key as keyof typeof this.metrics.storage];
      if (Array.isArray(storageMetric)) {
        const metric = storageMetric as MetricData[];
        if (metric.length > 100 && this.metrics.storage) {
          (this.metrics.storage as any)[key] = metric.slice(-100);
        }
      }
    });

    this.emit('storage', this.metrics.storage);
  }

  /**
   * Update user metrics
   */
  private updateUserMetrics(payload: any) {
    if (!this.metrics.users) {
      this.metrics.users = {
        active: [],
        sessions: [],
        retention: [],
        geography: [],
        devices: []
      };
    }

    const timestamp = new Date().toISOString();
    
    Object.entries(payload).forEach(([metric, value]: [string, any]) => {
      const metricKey = metric as 'active' | 'sessions' | 'retention' | 'geography' | 'devices';
      if (this.metrics.users && this.metrics.users[metricKey]) {
        this.metrics.users[metricKey].push({
          timestamp,
          value: typeof value === 'number' ? value : value.count || 0,
          metadata: typeof value === 'object' ? value : {}
        });
        
        if (this.metrics.users[metricKey].length > 100) {
          this.metrics.users[metricKey] = this.metrics.users[metricKey].slice(-100);
        }
      }
    });

    this.emit('users', this.metrics.users);
  }

  /**
   * Handle alert notifications
   */
  private handleAlert(payload: any) {
    console.warn('Alert triggered:', payload);
    this.emit('alert', payload);
    
    // Update alert last triggered time
    const alert = this.alerts.find(a => a.id === payload.alertId);
    if (alert) {
      alert.lastTriggered = new Date().toISOString();
    }
  }

  /**
   * Start periodic metric updates
   */
  private startPeriodicUpdates() {
    // Update metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.fetchLatestMetrics();
      } catch (error) {
        console.error('Failed to fetch periodic metrics:', error);
      }
    }, 30000);

    // Update summary data every 5 minutes
    setInterval(async () => {
      try {
        await this.fetchSummaryData();
      } catch (error) {
        console.error('Failed to fetch summary data:', error);
      }
    }, 300000);
  }

  /**
   * Fetch latest metrics from API
   */
  async fetchLatestMetrics(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBase}/performance/realtime`);
      const data = await response.json();
      
      if (data.success) {
        this.handleRealtimeUpdate({
          type: 'performance_update',
          payload: data.data
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest metrics:', error);
    }
  }

  /**
   * Fetch summary data for dashboard overview
   */
  async fetchSummaryData(): Promise<any> {
    try {
      const [performance, storage, users] = await Promise.all([
        fetch(`${this.apiBase}/performance/summary`).then(r => r.json()),
        fetch(`${this.apiBase}/storage/summary`).then(r => r.json()),
        fetch(`${this.apiBase}/users/summary`).then(r => r.json())
      ]);

      return {
        performance: performance.data,
        storage: storage.data,
        users: users.data
      };
    } catch (error) {
      console.error('Failed to fetch summary data:', error);
      return null;
    }
  }

  /**
   * Get historical metrics for a specific time range
   */
  async getHistoricalMetrics(
    metric: string,
    timeRange: string = '24h',
    interval: string = '1h'
  ): Promise<MetricData[]> {
    try {
      const response = await fetch(
        `${this.apiBase}/trends?metric=${metric}&timeRange=${timeRange}&interval=${interval}`
      );
      const data = await response.json();
      
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Failed to fetch historical metrics:', error);
      return [];
    }
  }

  /**
   * Get Web Vitals summary
   */
  async getWebVitalsSummary(timeRange: string = '24h'): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/web-vitals/summary?timeRange=${timeRange}`);
      const data = await response.json();
      
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Failed to fetch Web Vitals summary:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  /**
   * Emit events to subscribers
   */
  private emit(event: string, data: any): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): Partial<DashboardMetrics> {
    return this.metrics;
  }

  /**
   * Create custom alert rule
   */
  async createAlert(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AlertRule = {
      id: alertId,
      ...rule
    };
    
    this.alerts.push(newRule);
    
    try {
      await fetch(`${this.apiBase}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRule)
      });
    } catch (error) {
      console.error('Failed to create alert on server:', error);
    }
    
    return alertId;
  }

  /**
   * Get connection status
   */
  isConnectedToRealtime(): boolean {
    return this.isConnected;
  }

  /**
   * Manually refresh all metrics
   */
  async refreshAllMetrics(): Promise<void> {
    await Promise.all([
      this.fetchLatestMetrics(),
      this.fetchSummaryData()
    ]);
  }

  /**
   * Export metrics data
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }
    
    // CSV export (simplified)
    let csv = 'timestamp,metric,value\n';
    
    Object.entries(this.metrics).forEach(([category, categoryData]) => {
      Object.entries(categoryData).forEach(([metric, data]) => {
        if (Array.isArray(data)) {
          data.forEach(point => {
            csv += `${point.timestamp},${category}.${metric},${point.value}\n`;
          });
        }
      });
    });
    
    return csv;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    
    this.subscribers.clear();
    this.metrics = {};
  }
}

// Singleton instance
const analyticsDashboardService = new AnalyticsDashboardService();

export default analyticsDashboardService;