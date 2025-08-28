// PWA utility functions

const isStackBlitz = (): boolean => {
  return window.location.hostname.includes('stackblitz') || 
         window.location.hostname.includes('webcontainer');
};

const isDevelopment = (): boolean => {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.port !== '' ||
         isStackBlitz();
};

export const registerServiceWorker = async (): Promise<boolean> => {
  // Skip Service Worker registration in development and StackBlitz environment
  if (isDevelopment()) {
    console.warn('Service Worker registration skipped: Development environment detected');
    // Unregister any existing service workers in development
    await unregisterServiceWorkers();
    return false;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }
  return false;
};

// Unregister all service workers (useful for development)
export const unregisterServiceWorkers = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const promises = registrations.map(registration => registration.unregister());
      await Promise.all(promises);
      if (registrations.length > 0) {
        console.log(`Unregistered ${registrations.length} service worker(s)`);
      }
      return true;
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
      return false;
    }
  }
  return false;
};

export const checkPWAInstallability = (): boolean => {
  // Check if the app is running in standalone mode (already installed)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return false;
  }

  // Check if beforeinstallprompt is supported
  return 'beforeinstallprompt' in window;
};

export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches;
};

export const addToHomeScreenPrompt = (): void => {
  // For iOS Safari users who need manual installation
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    alert('To install this app on your iOS device, tap the Share button and then "Add to Home Screen".');
  }
};

export const trackPWAUsage = (action: string): void => {
  // Track PWA-related events for analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_interaction', {
      event_category: 'PWA',
      event_label: action
    });
  }
};