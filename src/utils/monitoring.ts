// Integration with monitoring services (Sentry, LogRocket, etc.)
import { AppError } from '../types/errors';

interface MonitoringConfig {
  sentryDsn?: string;
  logRocketAppId?: string;
  customEndpoint?: string;
  enableConsoleCapture?: boolean;
  enableNetworkCapture?: boolean;
  enableUserInteractions?: boolean;
  enablePerformanceMonitoring?: boolean;
  errorRateLimit?: number; // Max errors per minute
  enableDebugLogs?: boolean;
  enableUserFeedback?: boolean;
  enableSourceMaps?: boolean;
  release?: string;
  environment?: string;
  sessionReplay?: boolean;
}

interface ErrorMetrics {
  count: number;
  lastReset: number;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private isInitialized: boolean = false;
  private errorMetrics: ErrorMetrics = { count: 0, lastReset: Date.now() };
  private performanceObserver?: PerformanceObserver;
  private sentryInstance?: any;

  private constructor(config: MonitoringConfig = {}) {
    this.config = config;
  }

  public static getInstance(config?: MonitoringConfig): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    }
    return MonitoringService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Validate configuration
      this.validateConfig();

      // Initialize Sentry if DSN is provided
      if (this.config.sentryDsn) {
        await this.initializeSentry();
      }

      // Initialize LogRocket if App ID is provided
      if (this.config.logRocketAppId) {
        await this.initializeLogRocket();
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.initializePerformanceMonitoring();
      }

      // Setup global error handlers
      this.setupGlobalErrorHandlers();

      // Setup periodic cleanup
      this.setupPeriodicCleanup();

      this.isInitialized = true;
      this.logDebug('Monitoring services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring services:', error);
      throw error;
    }
  }

  private validateConfig(): void {
    if (!this.config.sentryDsn && !this.config.logRocketAppId && !this.config.customEndpoint) {
      console.warn('No monitoring endpoints configured. Monitoring will be disabled.');
    }

    if (this.config.errorRateLimit && this.config.errorRateLimit <= 0) {
      throw new Error('errorRateLimit must be a positive number');
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        id: this.generateErrorId(),
        type: 'UNHANDLED_PROMISE_REJECTION' as any,
        message: event.reason?.message || 'Unhandled promise rejection',
        userMessage: 'An unexpected error occurred. Please try again.',
        severity: 'HIGH' as any,
        timestamp: new Date(),
        context: {
          reason: event.reason,
          promise: event.promise
        }
      } as AppError);
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.captureError({
        id: this.generateErrorId(),
        type: 'GLOBAL_ERROR' as any,
        message: event.message,
        userMessage: 'An unexpected error occurred. Please refresh the page.',
        severity: 'HIGH' as any,
        timestamp: new Date(),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }
      } as AppError);
    });
  }

  private setupPeriodicCleanup(): void {
    // Reset error metrics every minute
    setInterval(() => {
      this.errorMetrics = { count: 0, lastReset: Date.now() };
    }, 60000);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeSentry(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not needed
      const Sentry = await import('@sentry/browser');
      this.sentryInstance = Sentry;

      const integrations = [new Sentry.BrowserTracing()];

      // Add session replay if enabled
      if (this.config.sessionReplay) {
        try {
          const { Replay } = await import('@sentry/replay');
          integrations.push(new Replay({
            maskAllText: false,
            blockAllMedia: false,
          }) as any);
        } catch (replayError) {
          this.logDebug('Session replay not available:', replayError);
        }
      }

      // Add user feedback integration if enabled
      if (this.config.enableUserFeedback) {
        // User feedback integration is handled differently in newer Sentry versions
        this.logDebug('User feedback integration enabled');
      }

      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: this.config.environment || process.env.NODE_ENV,
        release: this.config.release || process.env.REACT_APP_VERSION,
        integrations,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: this.config.sessionReplay ? 0.1 : 0,
        replaysOnErrorSampleRate: this.config.sessionReplay ? 1.0 : 0,
        beforeSend: (event, hint) => {
          // Apply rate limiting
          if (!this.shouldCaptureError()) {
            this.logDebug('Error rate limit exceeded, dropping event');
            return null;
          }

          // Filter out non-critical errors in production
          if (process.env.NODE_ENV === 'production' && event.level === 'info') {
            return null;
          }

          // Enhanced error context
          if (event.exception) {
            event.tags = {
              ...event.tags,
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString()
            };
          }

          return event;
        },
        beforeBreadcrumb: (breadcrumb) => {
          // Filter sensitive data from breadcrumbs
          if (breadcrumb.data) {
            breadcrumb.data = this.sanitizeSensitiveData(breadcrumb.data);
          }
          return breadcrumb;
        }
      });

      // Set user context
      const userId = localStorage.getItem('userId');
      if (userId) {
        Sentry.setUser({ id: userId });
      }

      // Set initial context
      Sentry.setTag('component', 'monitoring-service');
      Sentry.setContext('browser', {
        name: navigator.userAgent,
        version: navigator.appVersion,
        language: navigator.language
      });

      this.logDebug('Sentry initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      throw error;
    }
  }

  private async initializeLogRocket(): Promise<void> {
    try {
      const LogRocket = await import('logrocket');
      
      LogRocket.init(this.config.logRocketAppId!, {
        console: {
          isEnabled: this.config.enableConsoleCapture ?? true
        },
        network: {
          isEnabled: this.config.enableNetworkCapture ?? true,
          requestSanitizer: (request: any) => {
            // Sanitize sensitive headers and data
            if (request.headers) {
              delete request.headers.authorization;
              delete request.headers.cookie;
            }
            if (request.body) {
              request.body = this.sanitizeSensitiveData(request.body);
            }
            return request;
          },
          responseSanitizer: (response: any) => {
            // Sanitize sensitive response data
            if (response.body) {
              response.body = this.sanitizeSensitiveData(response.body);
            }
            return response;
          }
        },
        dom: {
          isEnabled: this.config.enableUserInteractions ?? true,
          inputSanitizer: true
        }
      });

      // Set user context
      const userId = localStorage.getItem('userId');
      if (userId) {
        LogRocket.identify(userId, {
          environment: this.config.environment || process.env.NODE_ENV,
          version: this.config.release || process.env.REACT_APP_VERSION
        });
      }

      // Get session URL for debugging
      if (this.config.enableDebugLogs) {
        LogRocket.getSessionURL((sessionURL: string) => {
          this.logDebug('LogRocket session:', sessionURL);
          
          // Send session URL to Sentry for correlation
          if (this.sentryInstance) {
            this.sentryInstance.setTag('logRocketSession', sessionURL);
          }
        });
      }

      this.logDebug('LogRocket initialized successfully');

    } catch (error) {
      console.error('Failed to initialize LogRocket:', error);
      throw error;
    }
  }

  public captureError(error: AppError): void {
    if (!this.isInitialized) {
      this.logDebug('Monitoring not initialized, queuing error for later');
      // Could implement a queue here for errors before initialization
      return;
    }

    // Apply rate limiting
    if (!this.shouldCaptureError()) {
      this.logDebug('Error rate limit exceeded, dropping error');
      return;
    }

    try {
      // Enhance error with additional context
      const enhancedError = this.enhanceError(error);

      // Send to Sentry
      if (this.config.sentryDsn) {
        this.sendToSentry(enhancedError);
      }

      // Send to LogRocket
      if (this.config.logRocketAppId) {
        this.sendToLogRocket(enhancedError);
      }

      // Send to custom endpoint
      if (this.config.customEndpoint) {
        this.sendToCustomEndpoint(enhancedError);
      }

      // Increment error count
      this.errorMetrics.count++;

      this.logDebug('Error captured successfully:', enhancedError.id);

    } catch (monitoringError) {
      console.error('Failed to capture error in monitoring service:', monitoringError);
    }
  }

  private shouldCaptureError(): boolean {
    const errorRateLimit = this.config.errorRateLimit || 100; // Default: 100 errors per minute
    const now = Date.now();
    
    // Reset counter if more than a minute has passed
    if (now - this.errorMetrics.lastReset > 60000) {
      this.errorMetrics = { count: 0, lastReset: now };
    }
    
    return this.errorMetrics.count < errorRateLimit;
  }

  private enhanceError(error: AppError): AppError {
    return {
      ...error,
      context: {
        ...error.context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        performance: {
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : undefined,
          timing: {
            loadEventEnd: performance.timing?.loadEventEnd,
            domContentLoadedEventEnd: performance.timing?.domContentLoadedEventEnd
          }
        }
      }
    };
  }

  private async sendToSentry(error: AppError): Promise<void> {
    try {
      const Sentry = await import('@sentry/browser');
      
      Sentry.withScope((scope) => {
        scope.setTag('errorType', error.type);
        scope.setLevel(this.mapSeverityToSentryLevel(error.severity));
        scope.setContext('error', {
          id: error.id,
          timestamp: error.timestamp,
          context: error.context
        });

        if (error.userId) {
          scope.setUser({ id: error.userId });
        }

        Sentry.captureException(new Error(error.message));
      });

    } catch (sentryError) {
      console.error('Failed to send error to Sentry:', sentryError);
    }
  }

  private async sendToLogRocket(error: AppError): Promise<void> {
    try {
      const LogRocket = await import('logrocket');
      
      LogRocket.captureException(new Error(error.message), {
        tags: {
          errorType: error.type,
          severity: error.severity,
          errorId: error.id
        },
        extra: {
          context: error.context,
          timestamp: error.timestamp
        }
      });

    } catch (logRocketError) {
      console.error('Failed to send error to LogRocket:', logRocketError);
    }
  }

  private async sendToCustomEndpoint(error: AppError): Promise<void> {
    try {
      const response = await fetch(this.config.customEndpoint!, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Monitoring-Source': 'frontend',
          'X-Error-ID': error.id
        },
        body: JSON.stringify({
          ...error,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            source: 'monitoring-service'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logDebug('Error sent to custom endpoint successfully');

    } catch (customError) {
      console.error('Failed to send error to custom endpoint:', customError);
      // Retry mechanism could be implemented here
    }
  }

  private sanitizeSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'auth', 'credentials', 'private',
      'ssn', 'social', 'credit', 'card', 'cvv', 'pin'
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const shouldSanitize = sensitiveKeys.some(sensitive => 
        keyLower.includes(sensitive)
      );

      if (shouldSanitize) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeSensitiveData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  private initializePerformanceMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      this.logDebug('PerformanceObserver not supported');
      return;
    }

    try {
      // Monitor Core Web Vitals
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.capturePerformanceMetric({
            name: entry.name,
            duration: entry.duration || 0,
            timestamp: entry.startTime,
            metadata: {
              entryType: entry.entryType,
              ...(entry as any)
            }
          });
        });
      });

      // Observe different types of performance entries
      const entryTypes = ['measure', 'navigation', 'paint', 'largest-contentful-paint', 
                         'first-input', 'layout-shift'];
      
      entryTypes.forEach(type => {
        try {
          this.performanceObserver!.observe({ entryTypes: [type] });
        } catch (e) {
          this.logDebug(`Performance entry type '${type}' not supported`);
        }
      });

      // Monitor custom metrics
      this.monitorCustomMetrics();

      this.logDebug('Performance monitoring initialized');

    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  private monitorCustomMetrics(): void {
    // Monitor memory usage
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.capturePerformanceMetric({
          name: 'memory-usage',
          duration: memory.usedJSHeapSize,
          timestamp: Date.now(),
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
          }
        });
      }, 30000); // Every 30 seconds
    }

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.capturePerformanceMetric({
        name: 'page-visibility',
        duration: 0,
        timestamp: Date.now(),
        metadata: {
          hidden: document.hidden,
          visibilityState: document.visibilityState
        }
      });
    });
  }

  private capturePerformanceMetric(metric: PerformanceMetric): void {
    this.logDebug('Performance metric captured:', metric);

    // Send to Sentry as a measurement
    if (this.sentryInstance && this.config.enablePerformanceMonitoring) {
      this.sentryInstance.addBreadcrumb({
        category: 'performance',
        message: `${metric.name}: ${metric.duration}ms`,
        level: 'info',
        data: metric.metadata
      });
    }

    // Send to LogRocket
    if (this.config.logRocketAppId && this.config.enablePerformanceMonitoring) {
      import('logrocket').then(LogRocket => {
        LogRocket.track('Performance Metric', {
          metric: metric.name,
          duration: metric.duration,
          timestamp: metric.timestamp,
          ...metric.metadata
        });
      }).catch(error => {
        this.logDebug('Failed to send performance metric to LogRocket:', error);
      });
    }
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogs) {
      console.log(`[MonitoringService] ${message}`, ...args);
    }
  }

  private mapSeverityToSentryLevel(severity: string): 'fatal' | 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'CRITICAL': return 'fatal';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'error';
    }
  }

  public setUser(userId: string, userData?: Record<string, any>): void {
    if (!this.isInitialized) {
      this.logDebug('Monitoring not initialized, user data will be set when ready');
      return;
    }

    try {
      const sanitizedUserData = userData ? this.sanitizeSensitiveData(userData) : undefined;

      // Set user in Sentry
      if (this.config.sentryDsn && this.sentryInstance) {
        this.sentryInstance.setUser({ 
          id: userId, 
          ...sanitizedUserData,
          timestamp: new Date()
        });
      }

      // Set user in LogRocket
      if (this.config.logRocketAppId) {
        import('logrocket').then(LogRocket => {
          LogRocket.identify(userId, {
            ...sanitizedUserData,
            lastActivity: new Date()
          });
        }).catch(error => {
          this.logDebug('Failed to set user in LogRocket:', error);
        });
      }

      // Store user ID for later use
      localStorage.setItem('userId', userId);
      
      this.logDebug('User context updated successfully');

    } catch (error) {
      console.error('Failed to set user in monitoring services:', error);
    }
  }

  public addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!this.isInitialized) {
      this.logDebug('Monitoring not initialized, breadcrumb will be added when ready');
      return;
    }

    try {
      const sanitizedData = data ? this.sanitizeSensitiveData(data) : undefined;
      const timestamp = Date.now() / 1000;

      // Add breadcrumb to Sentry
      if (this.config.sentryDsn && this.sentryInstance) {
        this.sentryInstance.addBreadcrumb({
          message,
          category,
          data: sanitizedData,
          timestamp,
          level: 'info'
        });
      }

      // Add breadcrumb to LogRocket
      if (this.config.logRocketAppId) {
        import('logrocket').then(LogRocket => {
          LogRocket.track('Breadcrumb', {
            message,
            category,
            timestamp: new Date(timestamp * 1000).toISOString(),
            ...sanitizedData
          });
        }).catch(error => {
          this.logDebug('Failed to add breadcrumb to LogRocket:', error);
        });
      }

      this.logDebug('Breadcrumb added:', { message, category });

    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }

  // Additional utility methods
  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>): void {
    if (!this.isInitialized) return;

    try {
      const sanitizedExtra = extra ? this.sanitizeSensitiveData(extra) : undefined;

      if (this.config.sentryDsn && this.sentryInstance) {
        this.sentryInstance.captureMessage(message, level, {
          extra: sanitizedExtra,
          timestamp: Date.now()
        });
      }

      if (this.config.logRocketAppId) {
        import('logrocket').then(LogRocket => {
          LogRocket.track('Message', {
            message,
            level,
            timestamp: new Date(),
            ...sanitizedExtra
          });
        }).catch(error => {
          this.logDebug('Failed to capture message in LogRocket:', error);
        });
      }

      this.logDebug('Message captured:', { message, level });

    } catch (error) {
      console.error('Failed to capture message:', error);
    }
  }

  public startTransaction(name: string, operation?: string): any {
    if (!this.isInitialized || !this.sentryInstance) return null;

    try {
      return this.sentryInstance.startTransaction({
        name,
        op: operation || 'custom',
        tags: {
          source: 'monitoring-service'
        }
      });
    } catch (error) {
      this.logDebug('Failed to start transaction:', error);
      return null;
    }
  }

  public measurePerformance<T>(name: string, operation: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      this.capturePerformanceMetric({
        name,
        duration,
        timestamp: startTime,
        metadata: {
          type: 'custom-measurement',
          success: true
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.capturePerformanceMetric({
        name,
        duration,
        timestamp: startTime,
        metadata: {
          type: 'custom-measurement',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }

  public async measureAsyncPerformance<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.capturePerformanceMetric({
        name,
        duration,
        timestamp: startTime,
        metadata: {
          type: 'async-measurement',
          success: true
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.capturePerformanceMetric({
        name,
        duration,
        timestamp: startTime,
        metadata: {
          type: 'async-measurement',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }

  public getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logDebug('Configuration updated:', newConfig);
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.isInitialized = false;
    this.logDebug('Monitoring service destroyed');
  }
}

export default MonitoringService;

// Initialize monitoring service with enhanced configuration
const monitoring = MonitoringService.getInstance({
  // Configure your monitoring services here
  // sentryDsn: process.env.REACT_APP_SENTRY_DSN,
  // logRocketAppId: process.env.REACT_APP_LOGROCKET_APP_ID,
  customEndpoint: '/api/errors',
  enableConsoleCapture: true,
  enableNetworkCapture: true,
  enableUserInteractions: true,
  enablePerformanceMonitoring: true,
  enableDebugLogs: process.env.NODE_ENV === 'development',
  enableUserFeedback: true,
  enableSourceMaps: true,
  sessionReplay: process.env.NODE_ENV === 'production',
  errorRateLimit: 50, // Max 50 errors per minute
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION || '1.0.0'
});

// Initialize on app start with error handling
if (process.env.NODE_ENV === 'production') {
  monitoring.initialize().catch(error => {
    console.error('Failed to initialize monitoring service:', error);
  });
} else {
  // In development, initialize but don't throw on errors
  monitoring.initialize().catch(error => {
    console.warn('Monitoring service initialization failed (development mode):', error);
  });
}

// Export additional utilities
export const captureError = (error: AppError) => monitoring.captureError(error);
export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', extra?: Record<string, any>) => 
  monitoring.captureMessage(message, level, extra);
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => 
  monitoring.addBreadcrumb(message, category, data);
export const setUser = (userId: string, userData?: Record<string, any>) => 
  monitoring.setUser(userId, userData);
export const measurePerformance = <T>(name: string, operation: () => T): T => 
  monitoring.measurePerformance(name, operation);
export const measureAsyncPerformance = <T>(name: string, operation: () => Promise<T>): Promise<T> => 
  monitoring.measureAsyncPerformance(name, operation);

export { monitoring };