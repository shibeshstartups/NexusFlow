import { useState, useEffect, useCallback } from 'react';
import ErrorHandler from '../utils/errorHandler';
import { AppError, ErrorType, ErrorSeverity } from '../types/errors';

interface UseErrorHandlerReturn {
  errors: AppError[];
  addError: (error: Partial<AppError> & { type: ErrorType; message: string; userMessage: string }) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
  criticalErrors: AppError[];
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const errorHandler = ErrorHandler.getInstance();

  const addError = useCallback((errorParams: Partial<AppError> & { 
    type: ErrorType; 
    message: string; 
    userMessage: string 
  }) => {
    const error = errorHandler.createError(errorParams);
    setErrors(prev => [...prev, error]);
    errorHandler.handleError(error);
  }, [errorHandler]);

  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  useEffect(() => {
    const handleAppError = (event: CustomEvent) => {
      const { error } = event.detail;
      setErrors(prev => {
        // Avoid duplicates
        if (prev.some(e => e.id === error.id)) return prev;
        return [...prev, error];
      });
    };

    window.addEventListener('app-error', handleAppError as EventListener);
    return () => {
      window.removeEventListener('app-error', handleAppError as EventListener);
    };
  }, []);

  const criticalErrors = errors.filter(error => error.severity === ErrorSeverity.CRITICAL);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    hasErrors: errors.length > 0,
    criticalErrors
  };
};

// Hook for API calls with built-in error handling
export const useApiCall = () => {
  const { addError } = useErrorHandler();

  const apiCall = useCallback(async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        addError({
          type: ErrorType.API,
          severity: response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
          message: `API Error: ${response.status} ${response.statusText}`,
          userMessage: errorData.message || 'An error occurred while processing your request.',
          context: {
            url,
            method: options.method || 'GET',
            statusCode: response.status,
            responseBody: errorData
          }
        });

        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        addError({
          type: ErrorType.NETWORK,
          severity: ErrorSeverity.HIGH,
          message: 'Network connection failed',
          userMessage: 'Unable to connect to our servers. Please check your internet connection.',
          context: { url, method: options.method || 'GET' }
        });
      }
      throw error;
    }
  }, [addError]);

  return { apiCall };
};

// Hook for form validation with error handling
export const useFormValidation = () => {
  const { addError } = useErrorHandler();

  const validateField = useCallback((
    fieldName: string,
    value: any,
    rules: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp }
  ): boolean => {
    if (rules.required && (!value || value.toString().trim() === '')) {
      addError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `${fieldName} is required`,
        userMessage: `Please enter a valid ${fieldName.toLowerCase()}.`,
        context: { field: fieldName, rule: 'required' }
      });
      return false;
    }

    if (rules.minLength && value.toString().length < rules.minLength) {
      addError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `${fieldName} must be at least ${rules.minLength} characters`,
        userMessage: `${fieldName} must be at least ${rules.minLength} characters long.`,
        context: { field: fieldName, rule: 'minLength', value: rules.minLength }
      });
      return false;
    }

    if (rules.maxLength && value.toString().length > rules.maxLength) {
      addError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `${fieldName} must be no more than ${rules.maxLength} characters`,
        userMessage: `${fieldName} must be no more than ${rules.maxLength} characters long.`,
        context: { field: fieldName, rule: 'maxLength', value: rules.maxLength }
      });
      return false;
    }

    if (rules.pattern && !rules.pattern.test(value.toString())) {
      addError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `${fieldName} format is invalid`,
        userMessage: `Please enter a valid ${fieldName.toLowerCase()}.`,
        context: { field: fieldName, rule: 'pattern' }
      });
      return false;
    }

    return true;
  }, [addError]);

  return { validateField };
};