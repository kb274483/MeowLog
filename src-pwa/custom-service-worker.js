/* eslint-env serviceworker */

/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkOnly, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

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

/**
 * Runtime caching policy
 *
 * 1) Firebase APIs MUST NOT be cached by the SW (avoid token/staleness/inconsistency).
 *    App-level caching is handled via IndexedDB in the application code.
 *
 * 2) Only cache static assets/images with TTL + max entries to prevent cache bloat.
 */

// Never cache Firestore API responses
registerRoute(
  ({ url }) => url.hostname === 'firestore.googleapis.com',
  new NetworkOnly()
)

// Never cache Firebase Storage API responses (download URLs include tokens and can be huge)
registerRoute(
  ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
  new NetworkOnly()
)

// Same-origin scripts/styles/workers: fast updates without going stale forever
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'worker'),
  new StaleWhileRevalidate({
    cacheName: 'meow-log-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 })
    ]
  })
)

// Images (icons/photos): cache-first with eviction
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'meow-log-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })
    ]
  })
)

// Fonts: cache-first (rarely change)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'meow-log-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
)

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
