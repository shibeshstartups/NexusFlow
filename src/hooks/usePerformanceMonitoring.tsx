import React, { useEffect, useState, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import webVitalsService from '../services/webVitalsService';

interface PerformanceMetrics {
  isLoading: boolean;
  metrics: Array<{
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  }>;
  summary: Array<{
    name: string;
    count: number;
    average: number;
    latest: any;
    ratingDistribution: {
      good: number;
      needsImprovement: number;
      poor: number;
    };
  }>;
}

interface UsePerformanceMonitoringOptions {
  autoTrack?: boolean;
  trackUserTiming?: boolean;
  trackResourceTiming?: boolean;
  reportInterval?: number;
}

export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const {
    autoTrack = true,
    reportInterval = 30000
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    isLoading: true,
    metrics: [],
    summary: []
  });

  const [isRecording, setIsRecording] = useState(false);

  // Initialize performance monitoring
  useEffect(() => {
    if (autoTrack) {
      try {
        webVitalsService.initialize();
        setMetrics(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
        Sentry.captureException(error);
        setMetrics(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [autoTrack]);

  // Update metrics periodically
  useEffect(() => {
    if (!autoTrack) return;

    const updateMetrics = () => {
      try {
        const currentMetrics = webVitalsService.getMetrics();
        const summary = webVitalsService.getPerformanceSummary();
        
        setMetrics({
          isLoading: false,
          metrics: currentMetrics,
          summary
        });
      } catch (error) {
        console.error('Failed to update performance metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, reportInterval);
    return () => clearInterval(interval);
  }, [autoTrack, reportInterval]);

  // Track component mount performance
  const trackComponentMount = useCallback((componentName: string) => {
    const mark = `${componentName}-mount-start`;
    const measure = `${componentName}-mount-duration`;
    
    // Start timing
    performance.mark(mark);
    
    return () => {
      try {
        performance.mark(`${componentName}-mount-end`);
        performance.measure(measure, mark, `${componentName}-mount-end`);
        
        const measureEntry = performance.getEntriesByName(measure)[0];
        if (measureEntry) {
          console.log(`${componentName} mount time:`, measureEntry.duration, 'ms');
          
          // Send to Sentry if slow
          if (measureEntry.duration > 100) {
            Sentry.addBreadcrumb({
              category: 'performance',
              message: `Slow component mount: ${componentName}`,
              level: 'warning',
              data: {
                component: componentName,
                duration: measureEntry.duration
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to measure component mount time:', error);
      }
    };
  }, []);

  // Track async operation performance
  const trackAsyncOperation = useCallback(async (
    operationName: string,
    operation: () => Promise<any>,
    context?: Record<string, any>
  ): Promise<any> => {
    const startTime = performance.now();
    const transaction = Sentry.startTransaction({
      name: operationName,
      op: 'async-operation'
    });

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      // Track timing
      console.log(`${operationName} completed in:`, duration, 'ms');
      
      // Add to Sentry transaction
      transaction.setData('duration', duration);
      transaction.setData('context', context);
      transaction.setStatus('ok');
      
      // Log slow operations
      if (duration > 2000) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `Slow async operation: ${operationName}`,
          level: 'warning',
          data: {
            operation: operationName,
            duration,
            context
          }
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      transaction.setData('duration', duration);
      transaction.setData('error', error);
      transaction.setStatus('internal_error');
      
      Sentry.captureException(error, {
        tags: {
          operation: operationName
        },
        extra: {
          duration,
          context
        }
      });
      
      throw error;
    } finally {
      transaction.finish();
    }
  }, []);

  // Track render performance
  const trackRenderPerformance = useCallback((componentName: string, renderCount: number) => {
    const mark = `${componentName}-render-${renderCount}`;
    performance.mark(mark);
    
    // Use setTimeout to measure render completion
    setTimeout(() => {
      const markEntry = performance.getEntriesByName(mark)[0];
      if (markEntry) {
        const renderTime = performance.now() - markEntry.startTime;
        
        if (renderTime > 16.67) { // Slower than 60fps
          console.warn(`Slow render detected: ${componentName}`, renderTime, 'ms');
          
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `Slow render: ${componentName}`,
            level: 'warning',
            data: {
              component: componentName,
              renderTime,
              renderCount
            }
          });
        }
      }
    }, 0);
  }, []);

  // Start performance recording session
  const startRecording = useCallback(() => {
    setIsRecording(true);
    performance.mark('recording-session-start');
    
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Performance recording session started',
      level: 'info'
    });
  }, []);

  // Stop performance recording session
  const stopRecording = useCallback(() => {
    if (!isRecording) return null;
    
    setIsRecording(false);
    performance.mark('recording-session-end');
    performance.measure('recording-session-duration', 'recording-session-start', 'recording-session-end');
    
    const sessionEntry = performance.getEntriesByName('recording-session-duration')[0];
    
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Performance recording session ended',
      level: 'info',
      data: {
        duration: sessionEntry?.duration
      }
    });
    
    return {
      duration: sessionEntry?.duration || 0,
      metrics: webVitalsService.getMetrics(),
      summary: webVitalsService.getPerformanceSummary()
    };
  }, [isRecording]);

  // Get performance navigation info
  const getNavigationTiming = useCallback(() => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (!navigation) return null;
      
      return {
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        tlsNegotiation: navigation.secureConnectionStart > 0 
          ? navigation.connectEnd - navigation.secureConnectionStart 
          : 0,
        timeToFirstByte: navigation.responseStart - navigation.requestStart,
        contentDownload: navigation.responseEnd - navigation.responseStart,
        domProcessing: navigation.domContentLoadedEventStart - navigation.responseEnd,
        resourceLoading: navigation.loadEventStart - navigation.domContentLoadedEventEnd,
        totalPageLoad: navigation.loadEventEnd - navigation.fetchStart
      };
    } catch (error) {
      console.error('Failed to get navigation timing:', error);
      return null;
    }
  }, []);

  // Get resource timing for slow resources
  const getSlowResources = useCallback((threshold = 1000) => {
    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      return resources
        .filter(resource => resource.duration > threshold)
        .map(resource => ({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize,
          type: resource.initiatorType,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        }))
        .sort((a, b) => b.duration - a.duration);
    } catch (error) {
      console.error('Failed to get slow resources:', error);
      return [];
    }
  }, []);

  // Flush metrics to backend
  const flushMetrics = useCallback(async () => {
    try {
      await webVitalsService.flushMetrics();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      Sentry.captureException(error);
    }
  }, []);

  return {
    metrics,
    isRecording,
    trackComponentMount,
    trackAsyncOperation,
    trackRenderPerformance,
    startRecording,
    stopRecording,
    getNavigationTiming,
    getSlowResources,
    flushMetrics
  };
};

// Higher-order component for automatic component performance tracking
export const withPerformanceTracking = <P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    const { trackComponentMount, trackRenderPerformance } = usePerformanceMonitoring();
    const [renderCount, setRenderCount] = useState(0);

    // Track component mount
    useEffect(() => {
      const stopTracking = trackComponentMount(displayName);
      return stopTracking;
    }, [trackComponentMount]);

    // Track renders
    useEffect(() => {
      setRenderCount(prev => prev + 1);
      trackRenderPerformance(displayName, renderCount);
    }, [trackRenderPerformance, renderCount]);

    return <WrappedComponent {...props} />;
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;
  
  return PerformanceTrackedComponent;
};

export default usePerformanceMonitoring;