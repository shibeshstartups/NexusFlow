import React from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import ErrorNotification from './ErrorNotification';

const ErrorNotificationContainer: React.FC = () => {
  const { errors, removeError } = useErrorHandler();

  const handleRetry = (errorId: string) => {
    // Implement retry logic based on error type
    removeError(errorId);
    // You could dispatch a retry action here
  };

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {errors.map((error) => (
        <ErrorNotification
          key={error.id}
          error={error}
          config={{
            showToUser: true,
            autoHide: error.severity !== 'CRITICAL',
            hideAfter: error.severity === 'HIGH' ? 10000 : 5000,
            allowRetry: ['API', 'NETWORK'].includes(error.type),
            showDetails: false
          }}
          onClose={() => removeError(error.id)}
          onRetry={() => handleRetry(error.id)}
        />
      ))}
    </div>
  );
};

export default ErrorNotificationContainer;