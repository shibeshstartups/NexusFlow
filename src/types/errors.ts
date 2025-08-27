// Error type definitions and interfaces
export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
<<<<<<< HEAD
  context?: Record<string, unknown>;
=======
  context?: Record<string, any>;
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RESOURCE_LOADING = 'RESOURCE_LOADING',
  STORAGE = 'STORAGE',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface NetworkError extends AppError {
  type: ErrorType.NETWORK;
  statusCode?: number;
  endpoint?: string;
  method?: string;
}

export interface APIError extends AppError {
  type: ErrorType.API;
  statusCode: number;
  endpoint: string;
  method: string;
<<<<<<< HEAD
  responseBody?: unknown;
=======
  responseBody?: any;
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
}

export interface ValidationError extends AppError {
  type: ErrorType.VALIDATION;
  field?: string;
  validationRule?: string;
}

export interface AuthError extends AppError {
  type: ErrorType.AUTHENTICATION | ErrorType.AUTHORIZATION;
  authMethod?: string;
  requiredPermission?: string;
}

export interface ResourceError extends AppError {
  type: ErrorType.RESOURCE_LOADING;
  resourceType: 'image' | 'script' | 'stylesheet' | 'font';
  resourceUrl: string;
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  fallback?: () => void;
}

// User notification preferences
export interface ErrorNotificationConfig {
  showToUser: boolean;
  autoHide: boolean;
  hideAfter?: number;
  allowRetry: boolean;
  showDetails: boolean;
}