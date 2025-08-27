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

// URLs to cache during install
const urlsToCache = [
  '/',
  '/offline.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.error('Failed to cache resources during install:', error);
          // Cache critical resources only
          return cache.addAll(['/']);
        });
      })
  );
  self.skipWaiting();
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

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Enhanced background sync with retry logic
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'upload-retry':
      event.waitUntil(retryFailedUploads());
      break;
    case 'api-retry':
      event.waitUntil(retryFailedApiRequests());
      break;
    case 'analytics-sync':
      event.waitUntil(syncAnalyticsData());
      break;
    default:
      event.waitUntil(retryFailedRequests());
  }
});

// Enhanced push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      image: data.image,
      data: {
        url: data.url,
        timestamp: Date.now(),
        ...data.data
      },
      actions: data.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.tag,
      renotify: data.renotify || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return; // Just close the notification
  }
  
  const url = action === 'view' && data.url ? data.url : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Helper functions for request categorization
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
  return imageExtensions.some(ext => url.pathname.toLowerCase().includes(ext)) ||
         url.searchParams.has('f') || // CDN format parameter
         url.pathname.includes('/images/') ||
         url.pathname.includes('/thumbnails/');
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.startsWith('/static/') ||
         url.pathname.startsWith('/assets/');
}

function isQueueableRequest(request) {
  // Only queue certain types of requests for background sync
  const queueableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const url = new URL(request.url);
  
  return queueableMethods.includes(request.method) &&
         (isApiRequest(url) || url.pathname.includes('/upload'));
}

// Advanced caching strategies
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Use network-first strategy for API requests
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Cache successful GET responses
      if (request.method === 'GET') {
        const cache = await caches.open(CACHE_STRATEGIES.api.name);
        const responseToCache = response.clone();
        
        // Add cache headers
        const cachedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: {
            ...Object.fromEntries(responseToCache.headers.entries()),
            'sw-cache': 'api',
            'sw-cached-at': new Date().toISOString()
          }
        });
        
        await cache.put(request, cachedResponse);
        await cleanupCache(CACHE_STRATEGIES.api);
      }
    }
    
    return response;
  } catch (error) {
    console.log('API request failed, checking cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for failed API requests
    return new Response(JSON.stringify({
      success: false,
      message: 'Offline - request will be retried when connection is restored',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleImageRequest(request) {
  // Use cache-first strategy for images
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(CACHE_STRATEGIES.images.name);
      await cache.put(request, response.clone());
      await cleanupCache(CACHE_STRATEGIES.images);
    }
    
    return response;
  } catch (error) {
    // Return placeholder image for failed image requests
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f0f0"/><text x="150" y="100" text-anchor="middle" fill="#999">Offline</text></svg>',
      {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

async function handleStaticAsset(request) {
  // Use cache-first strategy for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(CACHE_STRATEGIES.static.name);
      await cache.put(request, response.clone());
      await cleanupCache(CACHE_STRATEGIES.static);
    }
    
    return response;
  } catch (error) {
    // Return empty response for failed static assets
    return new Response('', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function handleNavigationRequest(request) {
  // Use network-first strategy for navigation
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Return cached offline page
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function handleNonGetRequest(event) {
  const request = event.request;
  
  if (!isQueueableRequest(request)) {
    return;
  }
  
  event.respondWith(
    fetch(request).catch(async (error) => {
      console.log('Queueing failed request for background sync:', request.url);
      
      // Store failed request for background sync
      await queueFailedRequest(request);
      
      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        await self.registration.sync.register('api-retry');
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Request queued for retry when connection is restored',
        queued: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    })
  );
}

// Background sync implementations
async function retryFailedRequests() {
  console.log('Retrying failed requests...');
  
  try {
    const db = await openIndexedDB();
    const failedRequests = await getFailedRequests(db);
    
    for (const requestData of failedRequests) {
      try {
        const response = await fetch(requestData.url, requestData.options);
        
        if (response.ok) {
          // Remove successful request from queue
          await removeFailedRequest(db, requestData.id);
          
          // Notify clients of successful retry
          await notifyClients({
            type: 'sync-success',
            requestId: requestData.id,
            url: requestData.url
          });
        }
      } catch (error) {
        console.log('Retry failed for:', requestData.url, error);
        // Keep in queue for next sync
      }
    }
  } catch (error) {
    console.error('Error during background sync:', error);
  }
}

async function retryFailedUploads() {
  console.log('Retrying failed uploads...');
  // Implementation for retrying file uploads
  await retryFailedRequests();
}

async function retryFailedApiRequests() {
  console.log('Retrying failed API requests...');
  await retryFailedRequests();
}

async function syncAnalyticsData() {
  console.log('Syncing analytics data...');
  // Implementation for syncing cached analytics data
}

// Cache management functions
async function cleanupCache(strategy) {
  const cache = await caches.open(strategy.name);
  const requests = await cache.keys();
  
  if (requests.length > strategy.maxEntries) {
    // Remove oldest entries
    const sortedRequests = requests.sort((a, b) => {
      // This is a simplified sort - in reality you'd store timestamps
      return a.url.localeCompare(b.url);
    });
    
    const toDelete = sortedRequests.slice(0, requests.length - strategy.maxEntries);
    await Promise.all(toDelete.map(request => cache.delete(request)));
  }
  
  // Remove expired entries
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const cachedAt = response.headers.get('sw-cached-at');
      if (cachedAt) {
        const age = Date.now() - new Date(cachedAt).getTime();
        if (age > strategy.maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}

// IndexedDB functions for offline queue
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexusflow-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('failed-requests')) {
        const store = db.createObjectStore('failed-requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function queueFailedRequest(request) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['failed-requests'], 'readwrite');
    const store = transaction.objectStore('failed-requests');
    
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.clone().text(),
      timestamp: Date.now()
    };
    
    await store.add(requestData);
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

async function getFailedRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['failed-requests'], 'readonly');
    const store = transaction.objectStore('failed-requests');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeFailedRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['failed-requests'], 'readwrite');
    const store = transaction.objectStore('failed-requests');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Client communication
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}