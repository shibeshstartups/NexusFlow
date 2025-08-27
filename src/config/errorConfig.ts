// Error handling configuration
export const ERROR_CONFIG = {
  // Monitoring service configuration
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: '/api/errors',
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000
  },

  // Error notification settings
  notifications: {
    maxVisible: 3,
    defaultDuration: 5000,
    criticalDuration: 0, // Never auto-hide critical errors
    position: 'top-right' as const
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  },

  // Offline handling
  offline: {
    queueSize: 100,
    syncInterval: 60000, // 1 minute
    enableBackgroundSync: true
  },

  // Error categorization
  categories: {
    [ErrorType.NETWORK]: {
      severity: ErrorSeverity.HIGH,
      userMessage: 'Network connection issue. Please check your internet connection.',
      allowRetry: true,
      showDetails: false
    },
    [ErrorType.API]: {
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Server error occurred. Please try again.',
      allowRetry: true,
      showDetails: false
    },
    [ErrorType.VALIDATION]: {
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'Please check your input and try again.',
      allowRetry: false,
      showDetails: true
    },
    [ErrorType.AUTHENTICATION]: {
      severity: ErrorSeverity.HIGH,
      userMessage: 'Authentication failed. Please sign in again.',
      allowRetry: false,
      showDetails: false
    },
    [ErrorType.AUTHORIZATION]: {
      severity: ErrorSeverity.HIGH,
      userMessage: 'You don\'t have permission to perform this action.',
      allowRetry: false,
      showDetails: false
    },
    [ErrorType.RESOURCE_LOADING]: {
      severity: ErrorSeverity.LOW,
      userMessage: 'Some content failed to load.',
      allowRetry: true,
      showDetails: false
    }
  }
};

// Error message templates
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_TIMEOUT: 'Request timed out. Please check your connection and try again.',
  NETWORK_OFFLINE: 'You appear to be offline. Please check your internet connection.',
  NETWORK_SLOW: 'Your connection seems slow. This may take a moment.',

  // API errors
  API_SERVER_ERROR: 'Our servers are experiencing issues. Please try again in a moment.',
  API_NOT_FOUND: 'The requested resource was not found.',
  API_RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  API_UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  API_FORBIDDEN: 'You don\'t have permission to access this resource.',

  // Upload/Download errors
  UPLOAD_FAILED: 'File upload failed. Please check your connection and try again.',
  UPLOAD_TOO_LARGE: 'File is too large. Please choose a smaller file.',
  UPLOAD_INVALID_TYPE: 'File type not supported. Please choose a different file.',
  DOWNLOAD_FAILED: 'File download failed. Please try again.',

  // Storage errors
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please upgrade your plan or delete some files.',
  STORAGE_ACCESS_DENIED: 'Unable to access storage. Please check your permissions.',

  // Generic fallbacks
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  RETRY_FAILED: 'Multiple attempts failed. Please contact support if this continues.'
};

import { ErrorType, ErrorSeverity } from '../types/errors';