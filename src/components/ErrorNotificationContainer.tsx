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
<<<<<<< HEAD
      {errors.map((error) => (
=======
      {errors.map((error, index) => (
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
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