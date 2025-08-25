import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    const handleShowOfflineMessage = () => {
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('show-offline-message', handleShowOfflineMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('show-offline-message', handleShowOfflineMessage);
    };
  }, []);

  if (isOnline && !showOfflineMessage) return null;

  return (
    <>
      {/* Offline Banner */}
      <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white px-4 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 mr-2" />
            <span className="font-medium">
              You're currently offline. Some features may not be available.
            </span>
          </div>
          
          {isOnline && (
            <button
              onClick={() => setShowOfflineMessage(false)}
              className="text-orange-100 hover:text-white transition-colors"
            >
              <Wifi className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Offline Modal for Critical Actions */}
      {!isOnline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Connection Lost
              </h2>
              
              <p className="text-gray-600 mb-6">
                You've lost your internet connection. NexusFlow will continue to work 
                with limited functionality until your connection is restored.
              </p>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• View previously loaded files</li>
                  <li>• Browse cached content</li>
                  <li>• Access help documentation</li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-900 mb-2">Requires Connection:</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Upload new files</li>
                  <li>• Download files</li>
                  <li>• Sync changes</li>
                  <li>• Account management</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Check Connection & Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;