// Error type definitions and interfaces

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
  context?: Record<string, any>;
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
  UI = 'UI',
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
  responseBody?: any;
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

export interface StorageError extends AppError {
  type: ErrorType.STORAGE;
  operation: 'read' | 'write' | 'delete';
  storageType: 'localStorage' | 'sessionStorage' | 'indexedDB';
}

export interface UIError extends AppError {
  type: ErrorType.UI;
  component?: string;
  action?: string;
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

// Error handler configuration
export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
  enableRecovery: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Error context for enhanced debugging
export interface ErrorContext {
  url?: string;
  userAgent?: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  buildVersion?: string;
  feature?: string;
  [key: string]: any;
}