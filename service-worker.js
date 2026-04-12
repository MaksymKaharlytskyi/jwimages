/**
 * JW Images Search - Service Worker
 * PWA offline support with cache-first for static assets, network-first for API calls.
 */

const CACHE_NAME = 'jw-images-v1';
const STATIC_CACHE = 'jw-images-static-v1';
const IMAGE_CACHE = 'jw-images-images-v1';
const API_CACHE = 'jw-images-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/terms-of-use.html',
  '/cookie-policy.html',
  '/privacy-policy.html',
  '/css/style.css',
  '/js/app.js',
  '/js/search.js',
  '/js/masonry.js',
  '/js/lightbox.js',
  '/js/cookies.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Google Fonts to cache
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600&display=swap',
];

// Maximum number of cached images
const MAX_IMAGE_CACHE_SIZE = 100;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
      .then(() => caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(FONT_ASSETS);
      }))
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== IMAGE_CACHE && cacheName !== API_CACHE && cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests (network-first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle Google Fonts (cache-first)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Handle image thumbnails (cache-first with size limit)
  if (url.pathname.includes('encrypted-tbn') || url.hostname.includes('gstatic.com')) {
    event.respondWith(cacheFirstWithLimit(request));
    return;
  }

  // Handle static assets (cache-first)
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

/**
 * Cache-first strategy
 * @param {Request} request
 * @param {string} cacheName
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Fetch failed:', error);
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Cache-first strategy with size limit (for images)
 * @param {Request} request
 */
async function cacheFirstWithLimit(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Check cache size and evict oldest if necessary
      const keys = await cache.keys();
      if (keys.length >= MAX_IMAGE_CACHE_SIZE) {
        await cache.delete(keys[0]);
      }
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Image fetch failed:', error);
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network-first strategy (for API calls)
 * @param {Request} request
 */
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache the response with timestamp
      const responseClone = networkResponse.clone();
      const timestampedResponse = new Response(responseClone.body, responseClone);
      timestampedResponse.headers.set('X-Cache-Timestamp', Date.now().toString());
      cache.put(request, timestampedResponse);
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', error);

    // Try to get from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Check if cache is stale (5 minutes)
      const timestamp = cachedResponse.headers.get('X-Cache-Timestamp');
      if (timestamp && (Date.now() - parseInt(timestamp)) < 5 * 60 * 1000) {
        console.log('[ServiceWorker] Serving stale cached response');
        return cachedResponse;
      }
    }

    // Return offline fallback
    return new Response(JSON.stringify({ error: 'You are offline. Please check your connection.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
