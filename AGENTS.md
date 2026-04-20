# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Meow Log** is a PWA (Progressive Web App) for tracking pet health and daily meals. Built with Vue 3 + Quasar Framework + Firebase, deployed as a PWA with offline support.

## Commands

```bash
# Development (opens browser at localhost:9111)
quasar dev

# Build for production
quasar build

# Lint
npm run lint

# Format
npm run format
```

No tests are configured (`npm test` is a no-op).

## Environment Variables

Firebase config is loaded from `.env` via Vite's `import.meta.env`:

```
VITE_API_KEY
VITE_AUTH_DOMAIN
VITE_PROJECT_ID
VITE_STORAGE_BUCKET
VITE_MESSAGING_SENDER_ID
VITE_APP_ID
VITE_MEASUREMENT_ID
```

## Architecture

### Tech Stack
- **Vue 3** (Composition API) + **Quasar v2** (UI framework) + **Tailwind CSS**
- **Pinia** for state management
- **Firebase**: Firestore (database), Auth (Google sign-in), Storage (media files)
- **PWA**: Workbox `InjectManifest` mode with a custom service worker (`src-pwa/custom-service-worker.js`)

### Data Model
The app uses a **family-based multi-user** model:
- Users belong to a `family` — pets and records are scoped to `family.id`
- Firestore collections: `users`, `families`, `pets`, `bowlLogs` (wet food intake logs)
- Pet records include daily food/water tracking, weight, health notes, and file attachments

### State Management (`src/stores/`)
- `userStore.js` — auth state, user profile, family membership. Exposes `initAuth()` which sets up `onAuthStateChanged` listener.
- `petStore.js` — pet list and per-pet daily records. Caches data in IndexedDB via `idbCache`.

### Offline / Performance Pattern
The app uses a **stale-while-revalidate** snapshot strategy:
1. On startup, `appSnapshotService.js` loads a cached app snapshot from IndexedDB (`appSnapshot:latest`, max age 7 days)
2. Stores hydrate from the snapshot for instant paint, then revalidate from Firestore in the background
3. `src/utils/idbCache.js` is the low-level IndexedDB KV store (key/value with timestamp TTL)

### Services (`src/services/`)
- `appSnapshotService.js` — save/load/clear the full app state snapshot in IDB
- `mediaUploadService.js` — handles image upload to Firebase Storage (with HEIC conversion)
- `petFileService.js` — Firestore CRUD for pet file attachments
- `petDataAnalysisService.js` — chart data aggregation for pet health trends

### Routing
History mode (`vue-router`). Routes are lazy-loaded:
- `/` → `IndexPage.vue` (pet list)
- `/pet/:id` → `PetDetailsPage.vue` (daily records)
- `/pet/:id/files` → `PetFilesPage.vue` (file attachments)
- `/bowl-logs` → `BowlLogsPage.vue` (wet food intake log)

### Boot Files (`src/boot/`)
- `firebase.js` — initializes Firebase app and re-exports all Firestore/Auth/Storage helpers (import Firebase utilities from here, not directly from `firebase/*`)
- `axios.js` — Axios instance setup
- `notification.js` — push notification setup

### PWA
- Custom service worker at `src-pwa/custom-service-worker.js` using Workbox
- `skipWaiting` and `clientsClaim` are enabled — new SW activates immediately
- Offline indicator component: `src/components/OfflineIndicator.vue`
