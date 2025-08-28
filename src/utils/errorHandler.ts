import { AppError, ErrorType, ErrorSeverity } from '../types/errors';

interface RecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  fallback?: () => void;
}

export class ErrorHandler {
  private recoveryStrategies = new Map<ErrorType, RecoveryStrategy>();
  private errorQueue: AppError[] = [];
  private isOnline = navigator.onLine;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  constructor() {
    this.initializeRecoveryStrategies();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      canRecover: (error) => error.type === ErrorType.NETWORK,
      recover: async (error) => {
        // Retry with exponential backoff
        await this.delay(1000);
        return this.isOnline;
      },
      fallback: () => {
        this.showOfflineMessage();
      }
    });

    // API error recovery
    this.recoveryStrategies.set(ErrorType.API, {
      canRecover: (error) => {
        const apiError = error as any;
        return apiError.statusCode >= 500 || apiError.statusCode === 429;
      },
      recover: async (error) => {
        const apiError = error as any;
        if (apiError.statusCode === 429) {
          await this.delay(5000); // Rate limit backoff
        } else {
          await this.delay(2000); // Server error backoff
        }
        return true;
      }
    });

    // Resource loading recovery
    this.recoveryStrategies.set(ErrorType.RESOURCE_LOADING, {
      canRecover: (error) => error.type === ErrorType.RESOURCE_LOADING,
      recover: async (error) => {
        const resourceError = error as any;
        // Try loading from CDN fallback
        return this.loadFallbackResource(resourceError.resourceUrl);
      },
      fallback: () => {
        // Show placeholder or graceful degradation
        this.showResourceFallback();
      }
    });
  }

  public async handleError(error: AppError): Promise<void> {
    try {
      // Log error
      this.logError(error);

      // Try recovery if strategy exists
      const strategy = this.recoveryStrategies.get(error.type);
      if (strategy && strategy.canRecover(error)) {
        const recovered = await strategy.recover(error);
        if (recovered) {
          console.log(`Successfully recovered from error: ${error.id}`);
          return;
        }
        // If recovery failed, execute fallback
        strategy.fallback?.();
      }

      // Queue error if offline
      if (!this.isOnline && this.shouldQueueError(error)) {
        this.errorQueue.push(error);
        return;
      }

      // Show error to user based on severity
      this.displayError(error);

    } catch (handlingError) {
      console.error('Error while handling error:', handlingError);
      // Last resort: show generic error message
      this.showGenericError();
    }
  }

  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const context = {
      id: error.id,
      type: error.type,
      severity: error.severity,
      timestamp: error.timestamp,
      stack: error.stack,
      context: error.context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console[logLevel](`[${error.severity}] ${error.message}`, context);

    // Send to external logging service if configured
    this.sendToLoggingService(error, context);
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  private shouldQueueError(error: AppError): boolean {
    // Queue API errors and critical errors for retry when back online
    return error.type === ErrorType.API || error.severity === ErrorSeverity.CRITICAL;
  }

  private async processErrorQueue(): Promise<void> {
    const queuedErrors = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of queuedErrors) {
      try {
        await this.handleError(error);
      } catch (processError) {
        console.error('Failed to process queued error:', processError);
        // Re-queue if still having issues
        this.errorQueue.push(error);
      }
    }
  }

  private displayError(error: AppError): void {
    // Emit custom event for UI components to handle
    const errorEvent = new CustomEvent('appError', {
      detail: {
        error,
        config: this.getDisplayConfig(error)
      }
    });
    window.dispatchEvent(errorEvent);
  }

  private getDisplayConfig(error: AppError) {
    return {
      showToUser: error.severity !== ErrorSeverity.LOW,
      autoHide: error.severity === ErrorSeverity.LOW,
      hideAfter: error.severity === ErrorSeverity.HIGH ? 10000 : 5000,
      allowRetry: ['API', 'NETWORK'].includes(error.type),
      showDetails: false
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async loadFallbackResource(url: string): Promise<boolean> {
    try {
      // Implement fallback resource loading logic
      const fallbackUrl = url.replace('/api/', '/api/fallback/');
      const response = await fetch(fallbackUrl);
      return response.ok;
    } catch {
      return false;
    }
  }

  private showOfflineMessage(): void {
    console.warn('Application is offline. Some features may be limited.');
    // Could show toast notification or update UI state
  }

  private showResourceFallback(): void {
    console.warn('Resource loading failed. Using fallback.');
    // Could show placeholder content
  }

  private showGenericError(): void {
    console.error('An unexpected error occurred. Please refresh the page.');
    // Show generic error UI
  }

  private sendToLoggingService(error: AppError, context: any): void {
    // Send to external logging service (Sentry, LogRocket, etc.)
    // This would be implemented based on your logging service
    try {
      // Example: Send to monitoring service
      if (window.Sentry) {
        window.Sentry.captureException(new Error(error.message), {
          tags: {
            errorType: error.type,
            severity: error.severity
          },
          extra: context
        });
      }
    } catch (loggingError) {
      console.error('Failed to send error to logging service:', loggingError);
    }
  }

  public createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): AppError {
    return {
      id: this.generateErrorId(),
      type,
      message,
      userMessage: this.getUserFriendlyMessage(type, message),
      severity,
      timestamp: new Date(),
      context,
      stack: new Error().stack
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    const friendlyMessages = {
      [ErrorType.NETWORK]: 'Network connection issue. Please check your internet connection.',
      [ErrorType.API]: 'Service temporarily unavailable. Please try again.',
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.AUTHENTICATION]: 'Please sign in to continue.',
      [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorType.RESOURCE_LOADING]: 'Failed to load content. Please refresh the page.',
      [ErrorType.STORAGE]: 'Unable to save data. Please try again.',
      [ErrorType.UI]: 'An interface error occurred.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    return friendlyMessages[type] || originalMessage;
  }

  // Public API for manual error reporting
  public reportError(error: Error, context?: Record<string, any>): void {
    const appError = this.createError(
      ErrorType.UNKNOWN,
      error.message,
      ErrorSeverity.HIGH,
      { ...context, originalStack: error.stack }
    );
    this.handleError(appError);
  }

  public reportNetworkError(url: string, status?: number): void {
    const appError = this.createError(
      ErrorType.NETWORK,
      `Network request failed: ${url}`,
      ErrorSeverity.MEDIUM,
      { url, status }
    );
    this.handleError(appError);
  }

  public reportApiError(url: string, status: number, response?: any): void {
    const severity = status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    const appError = this.createError(
      ErrorType.API,
      `API request failed: ${status}`,
      severity,
      { url, status, response }
    );
    this.handleError(appError);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Set up global error handlers
window.addEventListener('error', (event) => {
  errorHandler.reportError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.reportError(
    new Error(`Unhandled promise rejection: ${event.reason}`),
    { reason: event.reason }
  );
});

export default errorHandler;