import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { AppError, ErrorSeverity } from '../types/errors';

interface ErrorNotificationProps {
  error: AppError;
  config: {
    showToUser: boolean;
    autoHide: boolean;
    hideAfter?: number;
    allowRetry: boolean;
    showDetails: boolean;
  };
  onClose: () => void;
  onRetry?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  config,
  onClose,
  onRetry
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [timeLeft, setTimeLeft] = useState(config.hideAfter ? Math.ceil(config.hideAfter / 1000) : 0);

  useEffect(() => {
    if (config.autoHide && config.hideAfter) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [config.autoHide, config.hideAfter]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case ErrorSeverity.MEDIUM:
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-50 border-red-200';
      case ErrorSeverity.HIGH:
        return 'bg-orange-50 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getProgressColor = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-600';
      case ErrorSeverity.HIGH:
        return 'bg-orange-600';
      case ErrorSeverity.MEDIUM:
        return 'bg-blue-600';
      default:
        return 'bg-green-600';
    }
  };

  if (!config.showToUser || !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 max-w-md w-full z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-lg border shadow-lg p-4 ${getBackgroundColor()}`}>
        {/* Progress bar for auto-hide */}
        {config.autoHide && config.hideAfter && timeLeft > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
              style={{ width: `${(timeLeft / (config.hideAfter / 1000)) * 100}%` }}
            />
          </div>
        )}

        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' :
               error.severity === ErrorSeverity.HIGH ? 'Error' :
               error.severity === ErrorSeverity.MEDIUM ? 'Warning' : 'Notice'}
            </h4>
            
            <p className="text-sm text-gray-700 mb-2">
              {error.userMessage}
            </p>

            {config.showDetails && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 underline mb-2"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            )}

            {showDetails && (
              <div className="bg-white bg-opacity-50 rounded p-2 mb-2">
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Error ID:</strong> {error.id}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Type:</strong> {error.type}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Time:</strong> {error.timestamp.toLocaleString()}
                </p>
                {error.context && (
                  <p className="text-xs text-gray-600">
                    <strong>Details:</strong> {JSON.stringify(error.context, null, 2)}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              {config.allowRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-white bg-opacity-80 hover:bg-opacity-100 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </button>
              )}

              {config.autoHide && timeLeft > 0 && (
                <span className="text-xs text-gray-500">
                  Auto-close in {timeLeft}s
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;