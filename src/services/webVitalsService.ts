import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

// Interface for web-vitals metric data
interface WebVitalsMetricData {
  value: number;
  id: string;
  name: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceData {
  url: string;
  userAgent: string;
  connectionType?: string;
  userId?: string;
  sessionId: string;
  metrics: WebVitalsMetric[];
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
  };
  mozConnection?: {
    effectiveType?: string;
  };
  webkitConnection?: {
    effectiveType?: string;
  };
}

class WebVitalsService {
  private metrics: WebVitalsMetric[] = [];
  private sessionId: string;
  private isInitialized = false;
  private apiEndpoint = '/api/analytics/web-vitals';

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize Web Vitals tracking
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      // Track Core Web Vitals
      this.trackCoreWebVitals();
      
      // Track custom performance metrics
      this.trackCustomMetrics();
      
      // Set up periodic reporting
      this.setupPeriodicReporting();
      
      this.isInitialized = true;
      console.log('Web Vitals tracking initialized');
    } catch (error) {
      console.error('Failed to initialize Web Vitals tracking:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Track Core Web Vitals metrics
   */
  private trackCoreWebVitals() {
    // Cumulative Layout Shift
    getCLS((metric: WebVitalsMetricData) => {
      this.recordMetric('CLS', metric.value, this.getCLSRating(metric.value));
    });

    // First Input Delay
    getFID((metric: WebVitalsMetricData) => {
      this.recordMetric('FID', metric.value, this.getFIDRating(metric.value));
    });

    // First Contentful Paint
    getFCP((metric: WebVitalsMetricData) => {
      this.recordMetric('FCP', metric.value, this.getFCPRating(metric.value));
    });

    // Largest Contentful Paint
    getLCP((metric: WebVitalsMetricData) => {
      this.recordMetric('LCP', metric.value, this.getLCPRating(metric.value));
    });

    // Time to First Byte
    getTTFB((metric: WebVitalsMetricData) => {
      this.recordMetric('TTFB', metric.value, this.getTTFBRating(metric.value));
    });
  }

  /**
   * Track custom performance metrics
   */
  private trackCustomMetrics() {
    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        const loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
        
        this.recordMetric('DOMContentLoaded', domContentLoaded, this.getTimingRating(domContentLoaded, 1000, 2000));
        this.recordMetric('LoadComplete', loadComplete, this.getTimingRating(loadComplete, 2000, 4000));
      }
    });

    // Track resource loading performance
    this.trackResourcePerformance();
    
    // Track JavaScript errors impact on performance
    this.trackErrorImpact();
    
    // Track user interactions
    this.trackUserInteractions();
  }

  /**
   * Track resource loading performance
   */
  private trackResourcePerformance() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resource.duration > 1000) {
            this.recordMetric(
              'SlowResource',
              resource.duration,
              this.getTimingRating(resource.duration, 1000, 3000),
              {
                name: resource.name,
                type: resource.initiatorType,
                size: resource.transferSize
              }
            );
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Track error impact on performance
   */
  private trackErrorImpact() {
    let errorCount = 0;
    const startTime = performance.now();

    window.addEventListener('error', () => {
      errorCount++;
      const errorRate = errorCount / ((performance.now() - startTime) / 1000 / 60); // errors per minute
      
      this.recordMetric('ErrorRate', errorRate, this.getErrorRateRating(errorRate));
    });

    window.addEventListener('unhandledrejection', () => {
      errorCount++;
      const errorRate = errorCount / ((performance.now() - startTime) / 1000 / 60);
      
      this.recordMetric('PromiseRejectionRate', errorRate, this.getErrorRateRating(errorRate));
    });
  }

  /**
   * Track user interactions and their performance impact
   */
  private trackUserInteractions() {
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const startTime = performance.now();
        
        // Use setTimeout to measure interaction response time
        setTimeout(() => {
          const responseTime = performance.now() - startTime;
          
          if (responseTime > 100) { // Only track slow interactions
            this.recordMetric(
              'InteractionResponse',
              responseTime,
              this.getTimingRating(responseTime, 100, 300),
              {
                type: eventType,
                target: (event.target as HTMLElement)?.tagName
              }
            );
          }
        }, 0);
      });
    });
  }

  /**
   * Record a performance metric
   */
  private recordMetric(
    name: string, 
    value: number, 
    rating: 'good' | 'needs-improvement' | 'poor',
    metadata?: Record<string, unknown>
  ) {
    const metric: WebVitalsMetric & { metadata?: Record<string, unknown> } = {
      name,
      value,
      rating,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Send to Sentry for real-time monitoring
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${value.toFixed(2)}ms (${rating})`,
      level: rating === 'poor' ? 'warning' : 'info',
      data: { name, value, rating, metadata }
    });

    // Log poor performance metrics
    if (rating === 'poor') {
      console.warn(`Poor ${name} performance:`, value, metadata);
      
      Sentry.captureMessage(`Poor ${name} performance: ${value}`, {
        level: 'warning',
        extra: { metric, metadata }
      });
    }
  }

  /**
   * Setup periodic reporting to backend
   */
  private setupPeriodicReporting() {
    // Send metrics every 30 seconds
    setInterval(() => {
      this.sendMetrics();
    }, 30000);

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics(true);
    });

    // Send metrics on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendMetrics();
      }
    });
  }

  /**
   * Send metrics to backend
   */
  private async sendMetrics(isBeforeUnload = false) {
    if (this.metrics.length === 0) return;

    const performanceData: PerformanceData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      userId: this.getUserId(),
      sessionId: this.sessionId,
      metrics: [...this.metrics]
    };

    try {
      if (isBeforeUnload && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          this.apiEndpoint,
          JSON.stringify(performanceData)
        );
      } else {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(performanceData)
        });
      }

      // Clear sent metrics
      this.metrics = [];
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Get user's connection type
   */
  private getConnectionType(): string | undefined {
    const connection = (navigator as NavigatorWithConnection).connection || 
                      (navigator as NavigatorWithConnection).mozConnection || 
                      (navigator as NavigatorWithConnection).webkitConnection;
    return connection?.effectiveType;
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  private getUserId(): string | undefined {
    // Implement based on your authentication system
    // This is a placeholder
    return localStorage.getItem('userId') || undefined;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Rating functions for different metrics
   */
  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private getTimingRating(value: number, goodThreshold: number, poorThreshold: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= goodThreshold) return 'good';
    if (value <= poorThreshold) return 'needs-improvement';
    return 'poor';
  }

  private getErrorRateRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 1) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): WebVitalsMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, WebVitalsMetric[]>);

    const summary = Object.entries(metricsByName).map(([name, metrics]) => {
      const values = metrics.map(m => m.value);
      const ratings = metrics.map(m => m.rating);
      
      return {
        name,
        count: metrics.length,
        latest: metrics[metrics.length - 1],
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        ratingDistribution: {
          good: ratings.filter(r => r === 'good').length,
          needsImprovement: ratings.filter(r => r === 'needs-improvement').length,
          poor: ratings.filter(r => r === 'poor').length
        }
      };
    });

    return summary;
  }

  /**
   * Force send current metrics
   */
  async flushMetrics(): Promise<void> {
    await this.sendMetrics();
  }
}

// Singleton instance
const webVitalsService = new WebVitalsService();

export default webVitalsService;