// Integration with monitoring services (Sentry, LogRocket, etc.)
import { AppError } from '../types/errors';

interface MonitoringConfig {
  sentryDsn?: string;
  logRocketAppId?: string;
  customEndpoint?: string;
  enableConsoleCapture?: boolean;
  enableNetworkCapture?: boolean;
  enableUserInteractions?: boolean;
}

class MonitoringService {
  private static instance: MonitoringService;
  private config: MonitoringConfig;
  private isInitialized: boolean = false;

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
      // Initialize Sentry if DSN is provided
      if (this.config.sentryDsn) {
        await this.initializeSentry();
      }

      // Initialize LogRocket if App ID is provided
      if (this.config.logRocketAppId) {
        await this.initializeLogRocket();
      }

      this.isInitialized = true;
      console.log('Monitoring services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring services:', error);
    }
  }

  private async initializeSentry(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not needed
      const Sentry = await import('@sentry/browser');
<<<<<<< HEAD
=======
      const { Integrations } = await import('@sentry/tracing');
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc

      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: process.env.NODE_ENV,
        integrations: [
<<<<<<< HEAD
          new Sentry.BrowserTracing(),
=======
          new Integrations.BrowserTracing(),
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend: (event) => {
          // Filter out non-critical errors in production
          if (process.env.NODE_ENV === 'production' && event.level === 'info') {
            return null;
          }
          return event;
        }
      });

      // Set user context
      const userId = localStorage.getItem('userId');
      if (userId) {
        Sentry.setUser({ id: userId });
      }

    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  private async initializeLogRocket(): Promise<void> {
    try {
<<<<<<< HEAD
      // Use dynamic require to avoid TypeScript module resolution issues
      const LogRocket = (await eval('import("logrocket")')) as any;
=======
      const LogRocket = await import('logrocket');
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
      
      LogRocket.init(this.config.logRocketAppId!);

      // Set user context
      const userId = localStorage.getItem('userId');
      if (userId) {
        LogRocket.identify(userId);
      }

      // Capture console logs
      if (this.config.enableConsoleCapture) {
<<<<<<< HEAD
        LogRocket.getSessionURL((sessionURL: string) => {
=======
        LogRocket.getSessionURL((sessionURL) => {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
          console.log('LogRocket session:', sessionURL);
        });
      }

    } catch (error) {
      console.error('Failed to initialize LogRocket:', error);
    }
  }

  public captureError(error: AppError): void {
    if (!this.isInitialized) return;

    try {
      // Send to Sentry
      if (this.config.sentryDsn) {
        this.sendToSentry(error);
      }

      // Send to LogRocket
      if (this.config.logRocketAppId) {
        this.sendToLogRocket(error);
      }

      // Send to custom endpoint
      if (this.config.customEndpoint) {
        this.sendToCustomEndpoint(error);
      }

    } catch (monitoringError) {
      console.error('Failed to capture error in monitoring service:', monitoringError);
    }
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
<<<<<<< HEAD
      const LogRocket = (await eval('import("logrocket")')) as any;
=======
      const LogRocket = await import('logrocket');
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
      
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
      await fetch(this.config.customEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });

    } catch (customError) {
      console.error('Failed to send error to custom endpoint:', customError);
    }
  }

<<<<<<< HEAD
  private mapSeverityToSentryLevel(severity: string): 'fatal' | 'error' | 'warning' | 'info' {
=======
  private mapSeverityToSentryLevel(severity: string): any {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
    switch (severity) {
      case 'CRITICAL': return 'fatal';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'error';
    }
  }

<<<<<<< HEAD
  public setUser(userId: string, userData?: Record<string, unknown>): void {
=======
  public setUser(userId: string, userData?: Record<string, any>): void {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
    if (!this.isInitialized) return;

    try {
      // Set user in Sentry
      if (this.config.sentryDsn) {
        import('@sentry/browser').then(Sentry => {
          Sentry.setUser({ id: userId, ...userData });
        });
      }

      // Set user in LogRocket
      if (this.config.logRocketAppId) {
<<<<<<< HEAD
        eval('import("logrocket")').then((LogRocket: any) => {
          LogRocket.identify(userId, userData);
        }).catch((error: any) => {
          console.error('Failed to import LogRocket:', error);
=======
        import('logrocket').then(LogRocket => {
          LogRocket.identify(userId, userData);
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
        });
      }

    } catch (error) {
      console.error('Failed to set user in monitoring services:', error);
    }
  }

<<<<<<< HEAD
  public addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
=======
  public addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
    if (!this.isInitialized) return;

    try {
      // Add breadcrumb to Sentry
      if (this.config.sentryDsn) {
        import('@sentry/browser').then(Sentry => {
          Sentry.addBreadcrumb({
            message,
            category,
            data,
            timestamp: Date.now() / 1000
          });
        });
      }

    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }
}

export default MonitoringService;

// Initialize monitoring service
const monitoring = MonitoringService.getInstance({
  // Configure your monitoring services here
  // sentryDsn: process.env.REACT_APP_SENTRY_DSN,
  // logRocketAppId: process.env.REACT_APP_LOGROCKET_APP_ID,
  customEndpoint: '/api/errors',
  enableConsoleCapture: true,
  enableNetworkCapture: true,
  enableUserInteractions: true
});

// Initialize on app start
if (process.env.NODE_ENV === 'production') {
  monitoring.initialize();
}

export { monitoring };