/* eslint-env serviceworker */

/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
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
    new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
      denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/],
    }),
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
registerRoute(({ url }) => url.hostname === 'firestore.googleapis.com', new NetworkOnly())

// Never cache Firebase Storage API responses (download URLs include tokens and can be huge)
registerRoute(({ url }) => url.hostname === 'firebasestorage.googleapis.com', new NetworkOnly())

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
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
)

// Images (icons/photos): cache-first with eviction
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'meow-log-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 }),
    ],
  }),
)

// Fonts: cache-first (rarely change)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'meow-log-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pets-data') {
    event.waitUntil(syncPetsData())
  }
})

/**
 * Push Notification
 *
 * Supports two payload shapes:
 * 1. FCM Web Push (Phase 5+): `{ notification, data, fcmOptions }` where
 *    `fcmOptions.link` carries the deep-link URL.
 * 2. Legacy custom payload: `{ title, body, url }`.
 *
 * The FCM JS SDK's auto-display requires `firebase-messaging-sw.js`. Since this
 * project uses a single custom SW, we render the notification ourselves.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { notification: { title: 'Meow Log', body: event.data.text() } }
  }

  const notif = payload.notification || {}
  const data = payload.data || {}
  const link = payload.fcmOptions?.link || data.url || data.link || '/'

  const title = notif.title || payload.title || 'Meow Log'
  const options = {
    body: notif.body || payload.body || '',
    icon: notif.icon || '/icons/icon-192x192.png',
    badge: notif.badge || '/icons/badge-72x72.png',
    tag: notif.tag,
    renotify: notif.renotify === true,
    vibrate: [100, 50, 100],
    data: { ...data, url: link },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Notification Click
 *
 * Focus an existing app window when one is already open at the same origin;
 * otherwise open a new window at the deep-link URL.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const absoluteUrl = new URL(targetUrl, self.location.origin).href
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of allClients) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus()
        }
      }
      for (const client of allClients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              return await client.navigate(absoluteUrl)
            } catch {
              // navigate can fail cross-origin or if client is not controlled; fall through to openWindow
            }
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }
    })(),
  )
})

// Background Sync
async function syncPetsData() {
  console.log('background sync')
}
