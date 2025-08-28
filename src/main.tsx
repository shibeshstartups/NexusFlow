import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/pwaUtils';
import { QueryProvider } from './lib/queryClient';
import { initializeMonitoring } from './lib/monitoring';

// Initialize monitoring (Sentry & LogRocket) before app starts
initializeMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);

// Register service worker for PWA functionality
registerServiceWorker();