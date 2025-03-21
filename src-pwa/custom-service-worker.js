/* eslint-env serviceworker */

/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

self.skipWaiting()
clientsClaim()

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()

// Non-SSR fallbacks to index.html
// Production SSR fallbacks to offline.html (except for dev)
if (process.env.MODE !== 'ssr' || process.env.PROD) {
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML),
      { denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/] }
    )
  )
}

/*
 * This file (custom-service-worker.js) is used to customize your service worker.
 */

const CACHE_PREFIX = 'meow-log-cache';

const SHELL_CACHE = `${CACHE_PREFIX}-shell-v1`;

const DATA_CACHE = `${CACHE_PREFIX}-data-v1`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-96x96.png',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => {
        console.log('caching shell files');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate 
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== SHELL_CACHE && key !== DATA_CACHE && 
            key.startsWith(CACHE_PREFIX)) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      return self.clients.claim();
    })
  );
});

// Intercept requests
self.addEventListener('fetch', (event) => {
  // Skip requests that don't support caching
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Firebase API request handling
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebasestorage.googleapis.com')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // If successful, clone and store the response in the cache
            if (response.status === 200) {
              cache.put(event.request.url, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Network request failed, try to provide from cache
            return cache.match(event.request);
          });
      })
    );
  } else {
    // Static assets use "cache first, network fallback" strategy
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // For navigation requests, always refresh the cache
            if (event.request.mode === 'navigate') {
              caches.open(SHELL_CACHE).then((cache) => {
                cache.put(event.request, fetchResponse.clone());
              });
            }
            return fetchResponse;
          });
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pets-data') {
    event.waitUntil(syncPetsData());
  }
});

// Push Notification
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-128x128.png',
      badge: '/icons/badge-48x48.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Background Sync
async function syncPetsData() {
  console.log('background sync');
}
