import { AppError, ErrorType, ErrorSeverity, ErrorRecoveryStrategy } from '../types/errors';

class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy> = new Map();
  private errorQueue: AppError[] = [];
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.setupNetworkListeners();
    this.setupGlobalErrorHandlers();
    this.initializeRecoveryStrategies();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueuedErrors();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyOfflineState();
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      const error = this.createError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.message,
        userMessage: 'Something went wrong. Please try refreshing the page.',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        stack: event.error?.stack
      });
      this.handleError(error);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.reason?.message || 'Unhandled promise rejection',
        userMessage: 'An unexpected error occurred. Please try again.',
        context: { reason: event.reason },
        stack: event.reason?.stack
      });
      this.handleError(error);
    });

    // Resource loading error handler
    window.addEventListener('error', (event) => {
      if (event.target !== window && event.target instanceof HTMLElement) {
        const target = event.target as HTMLElement;
        const resourceType = this.getResourceType(target);
        const resourceUrl = this.getResourceUrl(target);

        if (resourceType && resourceUrl) {
          const error = this.createError({
            type: ErrorType.RESOURCE_LOADING,
            severity: ErrorSeverity.MEDIUM,
            message: `Failed to load ${resourceType}: ${resourceUrl}`,
            userMessage: 'Some content failed to load. The page may not display correctly.',
            context: { resourceType, resourceUrl }
          });
          this.handleError(error);
        }
      }
    }, true);
  }

  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      canRecover: (error) => error.type === ErrorType.NETWORK,
<<<<<<< HEAD
      recover: async (_error) => {
=======
      recover: async (error) => {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
        // Retry with exponential backoff
        await this.delay(1000);
        return this.isOnline;
      },
      fallback: () => {
        this.showOfflineMessage();
      }
    });

    // API error recovery
<<<<<<< HEAD
interface ApiError extends AppError {
  statusCode: number;
}

interface ResourceError extends AppError {
  resourceUrl: string;
}

    this.recoveryStrategies.set(ErrorType.API, {
      canRecover: (error) => {
        const apiError = error as ApiError;
        return apiError.statusCode >= 500 || apiError.statusCode === 429;
      },
      recover: async (error) => {
        const apiError = error as ApiError;
=======
    this.recoveryStrategies.set(ErrorType.API, {
      canRecover: (error) => {
        const apiError = error as any;
        return apiError.statusCode >= 500 || apiError.statusCode === 429;
      },
      recover: async (error) => {
        const apiError = error as any;
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
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
<<<<<<< HEAD
        const resourceError = error as ResourceError;
=======
        const resourceError = error as any;
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
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

      // Send to monitoring service
      await this.sendToMonitoring(error);

      // Show user notification
      this.showUserNotification(error);

    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      // Fallback to basic error display
      this.showBasicErrorMessage();
    }
  }

  public createError(params: Partial<AppError> & { 
    type: ErrorType; 
    message: string; 
    userMessage: string 
  }): AppError {
    return {
      id: this.generateErrorId(),
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      ...params
    };
  }

  private async processQueuedErrors(): Promise<void> {
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errors) {
      await this.sendToMonitoring(error);
    }
  }

  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      ...error,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: error.timestamp.toISOString()
    };

    console[logLevel](`[${error.type}] ${error.message}`, logData);
  }

  private async sendToMonitoring(error: AppError): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Send to your monitoring service (Sentry, LogRocket, etc.)
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring:', monitoringError);
    }
  }

  private showUserNotification(error: AppError): void {
    const config = this.getNotificationConfig(error);
    if (!config.showToUser) return;

    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('app-error', {
      detail: { error, config }
    }));
  }

  private getNotificationConfig(error: AppError) {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return { showToUser: true, autoHide: false, allowRetry: true, showDetails: false };
      case ErrorSeverity.HIGH:
        return { showToUser: true, autoHide: true, hideAfter: 10000, allowRetry: true, showDetails: false };
      case ErrorSeverity.MEDIUM:
        return { showToUser: true, autoHide: true, hideAfter: 5000, allowRetry: false, showDetails: false };
      default:
        return { showToUser: false, autoHide: true, hideAfter: 3000, allowRetry: false, showDetails: false };
    }
  }

  // Utility methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined;
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
    return error.type === ErrorType.API || error.type === ErrorType.NETWORK;
  }

  private getResourceType(element: HTMLElement): string | null {
    if (element instanceof HTMLImageElement) return 'image';
    if (element instanceof HTMLScriptElement) return 'script';
    if (element instanceof HTMLLinkElement) return 'stylesheet';
    return null;
  }

  private getResourceUrl(element: HTMLElement): string | null {
    if (element instanceof HTMLImageElement) return element.src;
    if (element instanceof HTMLScriptElement) return element.src;
    if (element instanceof HTMLLinkElement) return element.href;
    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

<<<<<<< HEAD
  private async loadFallbackResource(_url: string): Promise<boolean> {
=======
  private async loadFallbackResource(url: string): Promise<boolean> {
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
    // Implement fallback resource loading logic
    return false;
  }

  private showOfflineMessage(): void {
    window.dispatchEvent(new CustomEvent('show-offline-message'));
  }

  private showResourceFallback(): void {
    window.dispatchEvent(new CustomEvent('show-resource-fallback'));
  }

  private showBasicErrorMessage(): void {
    alert('An unexpected error occurred. Please refresh the page and try again.');
  }

  private notifyOfflineState(): void {
    window.dispatchEvent(new CustomEvent('offline-state-changed', { detail: { isOnline: false } }));
  }
}

export default ErrorHandler;