import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/pwaUtils';
<<<<<<< HEAD
import { QueryProvider } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
=======

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  </StrictMode>
);

// Register service worker for PWA functionality
<<<<<<< HEAD
registerServiceWorker();
=======
registerServiceWorker();
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
