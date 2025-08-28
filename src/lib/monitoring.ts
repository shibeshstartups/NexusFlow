import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Environment variables
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || 'unknown';
const SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || '1.0');
const TRACES_SAMPLE_RATE = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1');
const ENABLE_ERROR_REPORTING = import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true';
const ENABLE_SESSION_REPLAY = import.meta.env.VITE_ENABLE_SESSION_REPLAY === 'true';

// LogRocket integration
let LogRocket: any = null;

async function initializeLogRocket() {
  if (LOGROCKET_APP_ID && ENABLE_SESSION_REPLAY) {
    try {
      const LogRocketModule = await import('logrocket');
      LogRocket = LogRocketModule.default;
      
      LogRocket.init(LOGROCKET_APP_ID, {
        release: RELEASE,
        console: {
          shouldAggregateConsoleErrors: true,
        },
        network: {
          requestSanitizer: (request: any) => {
            // Sanitize sensitive data from requests
            if (request.headers && request.headers.authorization) {
              request.headers.authorization = '***';
            }
            return request;
          },
          responseSanitizer: (response: any) => {
            // Sanitize sensitive data from responses
            return response;
          },
        },
        dom: {
          inputSanitizer: true,
          textSanitizer: true,
        },
      });

      console.log('LogRocket initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize LogRocket:', error);
    }
  }
}

// Sentry configuration
export function initializeMonitoring() {
  // Initialize LogRocket first
  initializeLogRocket();

  // Initialize Sentry if enabled
  if (SENTRY_DSN && ENABLE_ERROR_REPORTING) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: RELEASE,
      sampleRate: SAMPLE_RATE,
      tracesSampleRate: TRACES_SAMPLE_RATE,
      
      integrations: [
        new BrowserTracing({
          // Automatically instrument common user interactions
          markBackgroundTransactions: true,
        }),
      ],

      beforeSend(event, hint) {
        // Filter out specific errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Filter out network errors and other non-critical errors
          if (error && typeof error === 'object' && 'message' in error) {
            const message = (error as Error).message.toLowerCase();
            if (
              message.includes('network error') ||
              message.includes('loading chunk') ||
              message.includes('dynamically imported module')
            ) {
              return null;
            }
          }
        }

        // Add LogRocket session URL to Sentry events
        if (LogRocket) {
          event.extra = event.extra || {};
          event.extra.sessionURL = LogRocket.sessionURL;
        }

        return event;
      },

      beforeSendTransaction(transaction) {
        // Filter out transactions you don't want to send
        return transaction;
      },
    });

    console.log('Sentry initialized successfully');
  }

  // Set up global error handler
  window.addEventListener('unhandledrejection', (event) => {
    if (ENABLE_ERROR_REPORTING) {
      console.error('Unhandled promise rejection:', event.reason);
      Sentry.captureException(event.reason);
    }
  });
}

// Utility functions for logging and error tracking
export const monitoring = {
  // Log user actions
  logUserAction: (action: string, data?: Record<string, any>) => {
    if (LogRocket) {
      LogRocket.track(action, data);
    }
    
    if (ENABLE_ERROR_REPORTING) {
      Sentry.addBreadcrumb({
        message: action,
        data,
        level: 'info',
        category: 'user-action',
      });
    }
  },

  // Identify user
  identifyUser: (user: { id: string; email?: string; name?: string }) => {
    if (LogRocket) {
      LogRocket.identify(user.id, {
        name: user.name,
        email: user.email,
      });
    }

    if (ENABLE_ERROR_REPORTING) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    }
  },

  // Capture error
  captureError: (error: Error, context?: Record<string, any>) => {
    console.error('Captured error:', error, context);
    
    if (ENABLE_ERROR_REPORTING) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach((key) => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureException(error);
      });
    }
  },

  // Capture message
  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    
    if (ENABLE_ERROR_REPORTING) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach((key) => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureMessage(message, level);
      });
    }
  },

  // Performance monitoring
  startTransaction: (name: string, operation: string) => {
    if (ENABLE_ERROR_REPORTING) {
      return Sentry.startTransaction({ name, op: operation });
    }
    return null;
  },

  // Add breadcrumb
  addBreadcrumb: (message: string, data?: Record<string, any>, level: 'info' | 'warning' | 'error' = 'info') => {
    if (ENABLE_ERROR_REPORTING) {
      Sentry.addBreadcrumb({
        message,
        data,
        level,
        timestamp: Date.now() / 1000,
      });
    }
  },

  // Set context
  setContext: (key: string, context: Record<string, any>) => {
    if (ENABLE_ERROR_REPORTING) {
      Sentry.setContext(key, context);
    }
  },

  // Get session URL for support
  getSessionURL: () => {
    if (LogRocket) {
      return LogRocket.sessionURL;
    }
    return null;
  },
};

export default monitoring;