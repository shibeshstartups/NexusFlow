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
      const { Integrations } = await import('@sentry/tracing');

      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: process.env.NODE_ENV,
        integrations: [
          new Integrations.BrowserTracing(),
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
      const LogRocket = await import('logrocket');
      
      LogRocket.init(this.config.logRocketAppId!);

      // Set user context
      const userId = localStorage.getItem('userId');
      if (userId) {
        LogRocket.identify(userId);
      }

      // Capture console logs
      if (this.config.enableConsoleCapture) {
        LogRocket.getSessionURL((sessionURL) => {
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
      await fetch(this.config.customEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });

    } catch (customError) {
      console.error('Failed to send error to custom endpoint:', customError);
    }
  }

  private mapSeverityToSentryLevel(severity: string): any {
    switch (severity) {
      case 'CRITICAL': return 'fatal';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'error';
    }
  }

  public setUser(userId: string, userData?: Record<string, any>): void {
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
        import('logrocket').then(LogRocket => {
          LogRocket.identify(userId, userData);
        });
      }

    } catch (error) {
      console.error('Failed to set user in monitoring services:', error);
    }
  }

  public addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
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