import { useState, useEffect, useCallback } from 'react';

// Extend ServiceWorkerRegistration interface to include sync
declare global {
  interface ServiceWorkerRegistration {
    sync: {
      register(tag: string): Promise<void>;
    };
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  serviceWorkerReady: boolean;
  updateAvailable: boolean;
  backgroundSyncSupported: boolean;
  notificationPermission: NotificationPermission;
}

interface UploadData {
  file: File;
  projectId: string;
  isPublic?: boolean;
}

interface ApiData {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface AnalyticsData {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

type SyncData = UploadData | ApiData | AnalyticsData;

interface OfflineAction {
  type: 'file-upload' | 'api-call';
  data: Record<string, unknown>;
  timestamp: number;
}

interface SyncQueueItem {
  id: string;
  type: 'upload' | 'api' | 'analytics';
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  data: SyncData;
  timestamp: number;
  retries: number;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstallable: false,
    isInstalled: false,
    serviceWorkerReady: false,
    updateAvailable: false,
    backgroundSyncSupported: false,
    notificationPermission: 'default'
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);

  // Initialize PWA features
  useEffect(() => {
    initializePWA();
    setupEventListeners();
    checkServiceWorkerStatus();
    checkNotificationPermission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePWA = async () => {
    // Check if PWA is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as NavigatorWithStandalone).standalone ||
                       document.referrer.includes('android-app://');
    
    // Check background sync support
    const backgroundSyncSupported = 'serviceWorker' in navigator && 
                                   'sync' in window.ServiceWorkerRegistration.prototype;

    setPwaState(prev => ({
      ...prev,
      isInstalled,
      backgroundSyncSupported
    }));
  };

  const setupEventListeners = () => {
    // Online/offline detection
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt as EventListener);

    // App installed
    window.addEventListener('appinstalled', handleAppInstalled);

    // Service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  };

  const checkServiceWorkerStatus = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        setPwaState(prev => ({ ...prev, serviceWorkerReady: true }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setPwaState(prev => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPwaState(prev => ({
        ...prev,
        notificationPermission: Notification.permission
      }));
    }
  };

  const handleOnlineStatusChange = () => {
    const isOnline = navigator.onLine;
    setPwaState(prev => ({ ...prev, isOnline }));

    if (isOnline) {
      // Trigger background sync when coming online
      triggerBackgroundSync();
      processOfflineActions();
    }
  };

  const handleInstallPrompt = (event: Event) => {
    const beforeInstallPromptEvent = event as BeforeInstallPromptEvent;
    beforeInstallPromptEvent.preventDefault();
    setDeferredPrompt(beforeInstallPromptEvent);
    setPwaState(prev => ({ ...prev, isInstallable: true }));
  };

  const handleAppInstalled = () => {
    setDeferredPrompt(null);
    setPwaState(prev => ({ 
      ...prev, 
      isInstalled: true, 
      isInstallable: false 
    }));
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'sync-success':
        updateSyncQueueItem(data.requestId, 'completed');
        break;
      case 'sync-failed':
        updateSyncQueueItem(data.requestId, 'failed');
        break;
      case 'cache-updated':
        // Handle cache updates
        break;
      default:
        console.log('Unknown service worker message:', event.data);
    }
  };

  // PWA Installation
  const installPWA = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const outcome = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setPwaState(prev => ({ ...prev, isInstallable: false }));
      
      return outcome.outcome === 'accepted';
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  };

  // Notification Management
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      setPwaState(prev => ({ ...prev, notificationPermission: permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  };

  const showNotification = async (title: string, options: NotificationOptions = {}) => {
    if (pwaState.notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker to show notification
      navigator.serviceWorker.controller.postMessage({
        type: 'show-notification',
        title,
        options
      });
    } else {
      // Fallback to direct notification
      new Notification(title, options);
    }

    return true;
  };

  // Sync Processing Functions
  const processUploadSync = async (data: SyncData) => {
    const uploadData = data as UploadData;
    // Implementation for upload sync
    const formData = new FormData();
    formData.append('file', uploadData.file);
    
    const response = await fetch('/api/files', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Upload sync failed');
    }
  };

  const processApiSync = async (data: SyncData) => {
    const apiData = data as ApiData;
    // Implementation for API sync
    const response = await fetch(apiData.url, {
      method: apiData.method,
      headers: apiData.headers,
      body: apiData.body
    });
    
    if (!response.ok) {
      throw new Error('API sync failed');
    }
  };

  const processAnalyticsSync = async (data: SyncData) => {
    const analyticsData = data as AnalyticsData;
    // Implementation for analytics sync
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(analyticsData)
    });
    
    if (!response.ok) {
      throw new Error('Analytics sync failed');
    }
  };

  const updateSyncQueueItem = (id: string, status: SyncQueueItem['status']) => {
    setSyncQueue(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, status, retries: status === 'failed' ? item.retries + 1 : item.retries }
          : item
      )
    );
  };

  const processSyncItem = useCallback(async (item: SyncQueueItem) => {
    try {
      updateSyncQueueItem(item.id, 'syncing');
      
      // Process based on type
      switch (item.type) {
        case 'upload':
          await processUploadSync(item.data);
          break;
        case 'api':
          await processApiSync(item.data);
          break;
        case 'analytics':
          await processAnalyticsSync(item.data);
          break;
      }
      
      updateSyncQueueItem(item.id, 'completed');
    } catch (error) {
      console.error('Sync item processing failed:', error);
      updateSyncQueueItem(item.id, 'failed');
    }
  }, []);

  // Background Sync Management
  const queueForSync = useCallback((type: SyncQueueItem['type'], data: SyncData) => {
    const item: SyncQueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      data,
      timestamp: Date.now(),
      retries: 0
    };

    setSyncQueue(prev => [...prev, item]);
    
    // Register background sync if supported
    if (pwaState.backgroundSyncSupported && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register(`${type}-retry`);
      });
    } else {
      // Fallback: try to sync immediately
      processSyncItem(item);
    }

    return item.id;
  }, [pwaState.backgroundSyncSupported, processSyncItem]);

  const triggerBackgroundSync = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('api-retry');
        registration.sync.register('upload-retry');
        registration.sync.register('analytics-sync');
      });
    }
  };

  // Offline Action Management
  const addOfflineAction = (action: Omit<OfflineAction, 'timestamp'>) => {
    setOfflineActions(prev => [...prev, { ...action, timestamp: Date.now() }]);
  };

  const processOfflineActions = async () => {
    for (const action of offlineActions) {
      try {
        await processAction(action);
        setOfflineActions(prev => prev.filter(a => a.timestamp !== action.timestamp));
      } catch (error) {
        console.error('Failed to process offline action:', error);
      }
    }
  };

  const processAction = async (action: OfflineAction) => {
    // Process different types of offline actions
    switch (action.type) {
      case 'file-upload':
        // Process file upload
        break;
      case 'api-call':
        // Process API call
        break;
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  };

  // Cache Management
  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  };

  const getCacheSize = async (): Promise<number> => {
    if (!('caches' in window)) return 0;
    
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const size = (await response.blob()).size;
          totalSize += size;
        }
      }
    }
    
    return totalSize;
  };

  // Update Management
  const updateServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  return {
    // State
    ...pwaState,
    syncQueue,
    offlineActions,
    
    // Installation
    installPWA,
    
    // Notifications
    requestNotificationPermission,
    showNotification,
    
    // Background Sync
    queueForSync,
    triggerBackgroundSync,
    
    // Offline Actions
    addOfflineAction,
    
    // Cache Management
    clearCache,
    getCacheSize,
    
    // Updates
    updateServiceWorker
  };
};

export default usePWA;