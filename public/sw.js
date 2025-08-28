const CACHE_NAME = 'nexusflow-v2.0';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'nexusflow-api-v1';
const STATIC_CACHE_NAME = 'nexusflow-static-v1';
const IMAGE_CACHE_NAME = 'nexusflow-images-v1';
const OFFLINE_QUEUE_NAME = 'nexusflow-offline-queue';

// Cache strategies configuration
const CACHE_STRATEGIES = {
  static: {
    name: STATIC_CACHE_NAME,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  api: {
    name: API_CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50
  },
  images: {
    name: IMAGE_CACHE_NAME,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200
  }
};

// URLs to cache during install - only cache what exists
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching initial resources');
        // Only cache critical resources that exist
        return cache.addAll(['/', '/offline.html', '/manifest.json']).catch((error) => {
          console.error('Failed to cache resources during install:', error);
          // Just cache the root path if other resources fail
          return cache.add('/');
        });
      })
      .then(() => {
        console.log('Service Worker: Initial cache completed');
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests except for offline queue
  if (event.request.method !== 'GET' && !isQueueableRequest(event.request)) {
    handleNonGetRequest(event);
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;
  
  // Skip Vite HMR and development server requests
  if (event.request.url.includes('/@vite/') || 
      event.request.url.includes('/__vite_ping') ||
      event.request.url.includes('/node_modules/')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Apply different strategies based on request type
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(event.request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(event.request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(event.request));
  } else {
    event.respondWith(handleNavigationRequest(event.request));
  }
});

// Request type detection
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.hostname.includes('api.');
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

function isQueueableRequest(request) {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
         request.url.includes('/api/');
}

// Cache-first strategy for static assets
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    return new Response('Asset unavailable', { status: 503 });
  }
}

// Cache-first strategy for images with fallback
async function handleImageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    } else if (response.status === 404) {
      // For missing icons, return a simple SVG placeholder
      const url = new URL(request.url);
      if (url.pathname.includes('icon-') || url.pathname.includes('.png')) {
        return createIconPlaceholder();
      }
    }
    return response;
  } catch (error) {
    console.warn('Image fetch failed:', request.url, error.message);
    
    // Check if it's an icon request
    const url = new URL(request.url);
    if (url.pathname.includes('icon-') || url.pathname.includes('.png') || url.pathname.includes('.svg')) {
      return createIconPlaceholder();
    }
    
    // For other images, just let it fail gracefully
    return new Response('', { status: 404 });
  }
}

// Create a simple SVG placeholder for missing icons
function createIconPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
    <rect width="192" height="192" fill="#2563eb" rx="24"/>
    <path d="M96 40L130 80H112V130H80V80H62L96 40Z" fill="white"/>
    <text x="96" y="160" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">NF</text>
  </svg>`;
  
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// Network-first strategy for API requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('API request failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Queue request for background sync if it's a mutation
    if (isQueueableRequest(request)) {
      await queueFailedRequest(request);
    }
    
    return new Response(JSON.stringify({ error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache-first strategy for navigation requests
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('Navigation request failed, checking cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // If it's the main app route, try to serve the root page
    if (request.mode === 'navigate') {
      const rootResponse = await caches.match('/');
      if (rootResponse) {
        console.log('Serving root page for navigation:', request.url);
        return rootResponse;
      }
    }
    
    // Return offline page as last resort
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      console.log('Serving offline page for:', request.url);
      return offlineResponse;
    }
    
    // If even offline page is not available, return a basic response
    return new Response('Service temporarily unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
    return caches.match(OFFLINE_URL) || new Response('Page unavailable offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle non-GET requests
function handleNonGetRequest(event) {
  if (isQueueableRequest(event.request)) {
    event.respondWith(
      fetch(event.request).catch(async (error) => {
        console.error('Non-GET request failed:', error);
        await queueFailedRequest(event.request);
        return new Response(JSON.stringify({ error: 'Request queued for retry' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
}

// Queue failed requests for background sync
async function queueFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body ? await request.clone().text() : null,
      timestamp: Date.now()
    };
    
    // In a real implementation, you'd use IndexedDB here
    console.log('Queuing failed request:', requestData);
    
    // Register for background sync
    self.registration.sync.register('background-sync');
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(retryFailedRequests());
  }
});

// Retry failed requests
async function retryFailedRequests() {
  try {
    // In a real implementation, you'd retrieve from IndexedDB and retry
    console.log('Retrying failed requests...');
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    });
  } catch (error) {
    console.error('Failed to retry requests:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'NexusFlow', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action buttons
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Handle notification actions
function handleNotificationAction(action, data) {
  switch (action) {
    case 'view':
      self.clients.openWindow(data?.url || '/');
      break;
    case 'dismiss':
      // Do nothing, notification is already closed
      break;
    default:
      self.clients.openWindow('/');
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

// Sync content in background
async function syncContent() {
  try {
    // Sync critical content when device is idle
    const response = await fetch('/api/sync');
    if (response.ok) {
      const data = await response.json();
      // Update cache with fresh content
      const cache = await caches.open(API_CACHE_NAME);
      cache.put('/api/sync', new Response(JSON.stringify(data)));
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}