import { register } from 'register-service-worker'

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

// Quasar exposes process.env.DEV at build time. Only log success / lifecycle
// events in development; production keeps the console clean for end users.
const isDev = process.env.DEV

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(registration) {
    if (isDev) console.log('[SW] active:', registration?.active?.scriptURL)
  },

  registered(registration) {
    if (isDev) console.log('[SW] registered:', registration?.scope)
  },

  cached() {},

  updatefound(registration) {
    if (isDev) console.log('[SW] update found:', registration?.installing?.scriptURL)
  },

  updated(registration) {
    if (isDev) console.log('[SW] updated, new SW waiting:', registration?.waiting?.scriptURL)
  },

  offline() {
    if (isDev) console.warn('[SW] offline mode')
  },

  // Errors stay on in production — silent SW failures are how we ended up
  // debugging this for an hour. If your real users open devtools, they
  // probably want to see real errors.
  error(err) {
    console.error('[SW] registration error:', err)
  },
})
