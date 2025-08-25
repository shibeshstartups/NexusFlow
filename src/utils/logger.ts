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
    
    // Limit queue size
    if (this.logQueue.length > 1000) {
      this.logQueue = this.logQueue.slice(-500); // Keep last 500 entries
    }

    // Immediate flush for errors in production
    if (entry.level === 'error' && this.isOnline && process.env.NODE_ENV === 'production') {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0 || !this.isOnline) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend })
      });
    } catch (error) {
      // Re-queue logs if sending failed
      this.logQueue.unshift(...logsToSend);
      console.error('Failed to send logs to server:', error);
    }
  }

  public async exportLogs(): Promise<string> {
    const allLogs = [...this.logQueue];
    return JSON.stringify(allLogs, null, 2);
  }

  public clearLogs(): void {
    this.logQueue = [];
  }
}

export default Logger;

// Convenience exports
const logger = Logger.getInstance();
export const { debug, info, warn, error } = logger;