// Structured logging utility
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogEntry[] = [];
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.setupNetworkListeners();
    this.startPeriodicFlush();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushLogs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      if (this.isOnline && this.logQueue.length > 0) {
        this.flushLogs();
      }
    }, 30000); // Flush every 30 seconds
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: localStorage.getItem('userId') || undefined,
      sessionId: sessionStorage.getItem('sessionId') || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  public debug(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, context);
    this.addToQueue(entry);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  public info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, context);
    this.addToQueue(entry);
    console.info(`[INFO] ${message}`, context);
  }

  public warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, context);
    this.addToQueue(entry);
    console.warn(`[WARN] ${message}`, context);
  }

  public error(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, context);
    this.addToQueue(entry);
    console.error(`[ERROR] ${message}`, context);
  }

  private addToQueue(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    // If queue is getting large, flush immediately
    if (this.logQueue.length >= 50) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0 || !this.isOnline) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // If sending fails, add logs back to queue
      this.logQueue.unshift(...logsToSend);
      console.warn('Failed to send logs to server:', error);
    }
  }

  public setContext(key: string, value: any): void {
    // Set global context that will be added to all logs
    if (!window._loggerContext) {
      window._loggerContext = {};
    }
    window._loggerContext[key] = value;
  }

  public clearContext(): void {
    window._loggerContext = {};
  }

  public getLogQueue(): LogEntry[] {
    return [...this.logQueue];
  }

  public clearQueue(): void {
    this.logQueue = [];
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    _loggerContext?: Record<string, any>;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
export default logger;