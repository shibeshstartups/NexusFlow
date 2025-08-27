// PWA utility functions

const isStackBlitz = (): boolean => {
  return window.location.hostname.includes('stackblitz') || 
         window.location.hostname.includes('webcontainer');
};

export const registerServiceWorker = async (): Promise<boolean> => {
  // Skip Service Worker registration in StackBlitz environment
  if (isStackBlitz()) {
    console.warn('Service Worker registration skipped: Not supported in StackBlitz environment');
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