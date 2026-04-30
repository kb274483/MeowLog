# Reminder Feature Development Plan

## Goal

Build a PWA-friendly reminder system for Meow Log that can notify family members about pet care events such as vet visits, deworming, and vaccines.

The reminder system should support iOS PWA background notifications by using Web Push / Firebase Cloud Messaging and Firebase Cloud Functions scheduling. The PWA should not rely on frontend background timers.

## MVP Scope

The first version should support:

- PWA install guidance for iOS Safari users.
- Notification opt-in flow inside the installed PWA.
- Push token registration and storage in Firestore.
- Reminder CRUD for vet visits, deworming, and vaccines.
- Reminder offsets for the day before and the day of the event.
- Family-wide delivery to all enabled devices.
- Notification click-through to the related pet page.
- Duplicate-send prevention.
- Invalid push token cleanup.

The first version should not include:

- Complex recurring reminder rules.
- Custom hour/minute offsets.
- Calendar integration.
- AI anomaly alerts.
- Veterinary report export integration.

## High-Level Architecture

```text
Vue / Quasar PWA
  -> User installs PWA to Home Screen
  -> User enables notifications
  -> Firebase Messaging gets an FCM token
  -> Firestore stores push tokens and reminders

Cloud Scheduler
  -> Triggers Cloud Functions on a schedule
  -> Cloud Functions scans due reminders
  -> Firebase Admin SDK sends FCM Web Push notifications
  -> Notification logs prevent duplicate sends

PWA Service Worker
  -> Receives background push notifications
  -> Displays notifications
  -> Handles notification click-through
```

## Phase 1: PWA Install Guidance

### Purpose

iOS does not provide the same install prompt behavior as Android Chrome. For iOS Safari users, the app should show clear guidance for adding Meow Log to the Home Screen.

### Tasks

- Detect whether the app is running as an installed PWA.
- Detect iOS / iPadOS Safari.
- Show install guidance when the user is in Safari and not in standalone mode.
- Support Android Chrome `beforeinstallprompt` when available.
- Hide install guidance once the app is running as a standalone PWA.

### Suggested Files

```text
src/components/pwa/PwaInstallGuide.vue
src/composables/usePwaInstall.js
```

### Detection Notes

```js
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true
```

## Phase 2: Notification Opt-In

### Purpose

The app should ask users with its own UI before triggering the system notification permission dialog. The real browser permission request should happen only after a user action.

### Tasks

- Show a custom notification opt-in dialog after the app is installed and opened as a PWA.
- Trigger `Notification.requestPermission()` only after the user taps an enable button.
- Initialize Firebase Messaging.
- Retrieve an FCM token with `getToken()`.
- Store the token in Firestore.
- Record dismissed or denied states to avoid repeatedly bothering the user.
- Provide a settings entry for enabling or disabling reminders later.

### Suggested Files

```text
src/components/notifications/NotificationOptInDialog.vue
src/composables/usePushNotifications.js
src/services/pushTokenService.js
```

### Push Token Model

```js
pushTokens/{tokenId}
{
  userId,
  familyId,
  token,
  platform: 'ios-pwa' | 'android-pwa' | 'desktop',
  userAgent,
  enabled: true,
  createdAt,
  updatedAt,
  lastUsedAt
}
```

## Phase 3: Reminder Data Model

### Purpose

Reminders should be scoped to a family and optionally linked to a pet. They should support deterministic scheduling and duplicate-send prevention.

### Reminder Model

```js
reminders/{reminderId}
{
  familyId,
  petId,
  type: 'vet' | 'deworm' | 'vaccine',
  title,
  note,
  dueDate: '2026-05-20',
  timezone: 'Asia/Taipei',
  offsets: [-1, 0],
  enabled: true,
  completedAt: null,
  createdBy,
  createdAt,
  updatedAt
}
```

### Notification Log Model

```js
notificationLogs/{logId}
{
  reminderId,
  familyId,
  petId,
  offset: -1,
  scheduledDate: '2026-05-19',
  sentAt,
  tokenCount,
  successCount,
  failureCount
}
```

Use a deterministic log id to prevent duplicate sends:

```text
${reminderId}_${offset}_${scheduledDate}
```

## Phase 4: Reminder Management UI

### Purpose

Users should be able to create and manage care reminders from the app.

### Suggested Product Flow

```text
PetDetailsPage
  -> Reminder section
  -> Add vet visit
  -> Add deworming
  -> Add vaccine
  -> View upcoming reminders
```

An independent reminders route can be added later if the list becomes important across all pets:

```text
/reminders
```

### Suggested Files

```text
src/components/reminders/ReminderList.vue
src/components/reminders/ReminderItem.vue
src/components/reminders/ReminderFormDialog.vue
src/components/reminders/ReminderTypeSelect.vue
src/services/reminderService.js
src/stores/reminderStore.js
```

### Form Fields

- Pet
- Reminder type
- Date
- Note
- Reminder offsets: day before, day of
- Enabled state

## Phase 5: Firebase Cloud Functions Scheduling

### Purpose

Cloud Functions should be responsible for deciding which reminders are due and sending push notifications. This avoids relying on PWA background JavaScript.

### Scheduling Strategy

Use Cloud Scheduler to run a Cloud Function periodically. A one-hour interval is a reasonable first version.

```text
Every hour
  -> Load enabled reminders
  -> Calculate local date using reminder.timezone
  -> Check whether any offset is due
  -> Create notification log lock
  -> Load enabled push tokens for the family
  -> Send FCM Web Push
  -> Store delivery result
  -> Disable invalid tokens
```

### Suggested Files

```text
functions/src/scheduledSendReminders.js
functions/src/sendReminderNotification.js
functions/src/cleanupInvalidTokens.js
```

### Example Notification Payload

```js
await admin.messaging().sendEachForMulticast({
  tokens,
  notification: {
    title: '明天要回診',
    body: '咪咪明天有回診提醒'
  },
  webpush: {
    fcmOptions: {
      link: 'https://your-domain.com/pet/PET_ID'
    },
    notification: {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `reminder-${reminderId}-${offset}`,
      renotify: true
    }
  },
  data: {
    reminderId,
    petId,
    type: 'vet'
  }
})
```

## Phase 6: Service Worker Integration

### Purpose

The existing Quasar PWA service worker should receive background messages and handle notification clicks without conflicting with another service worker.

The project currently has:

```text
src-pwa/custom-service-worker.js
```

### Tasks

- Prefer integrating Firebase Messaging behavior into the existing custom service worker.
- Avoid registering competing service workers unless the build setup requires it.
- Pass the existing service worker registration to `getToken()` when possible.
- Handle notification clicks.
- Open or focus the app at the related pet detail URL.
- Fall back to the home page if the target URL is unavailable.

## Phase 7: Firestore Security Rules

### Purpose

Reminder and push-token data should stay scoped to the authenticated user's family.

### Rules Requirements

- Users can read reminders only for their own family.
- Users can create reminders only for their own family.
- Users can update reminders only for their own family.
- Users can write push tokens only for their own user id.
- Users can read or disable their own push tokens.
- `notificationLogs` should be written only by trusted server code.

## Phase 8: Testing Plan

### Local / Emulator Tests

- Notification opt-in dialog appears only when appropriate.
- Notification permission is requested only after a user action.
- FCM token is saved to Firestore.
- Reminder create, update, disable, and complete flows work.
- Scheduled function can be triggered manually.
- Duplicate notification logs prevent repeated sends.
- Invalid tokens are disabled or deleted.

### Device Tests

- iPhone on iOS 16.4 or later, installed from Safari to Home Screen.
- iPhone standalone PWA receives background notification.
- Android Chrome PWA receives background notification.
- Desktop Chrome receives background notification.
- Denied notification permission does not create a token.
- iOS notification setting changes are reflected gracefully.
- Notification click opens the related pet detail page.

### Required Cases

```text
Today reminder sends once.
Tomorrow reminder sends once.
Same-family members receive the reminder.
Same user receives reminder on multiple enabled devices.
Completed reminders do not send.
Disabled reminders do not send.
Invalid tokens are cleaned up.
Notification click opens /pet/:id.
```

## Recommended Implementation Order

1. Add PWA install detection and iOS Home Screen guidance.
2. Add notification opt-in dialog.
3. Integrate Firebase Messaging token registration.
4. Store push tokens in Firestore.
5. Add reminder data model and CRUD service.
6. Add reminder UI to pet detail page.
7. Add Cloud Functions scheduled reminder scanner.
8. Add FCM Web Push sending.
9. Add service worker notification click handling.
10. Add Firestore security rules.
11. Test on iOS, Android, and desktop browsers.

## Main Risks

### iOS PWA Requirements

iOS background Web Push requires the web app to be installed to the Home Screen and opened as a PWA. Browser-tab users should be guided to install first.

### Service Worker Conflicts

The app already has a custom PWA service worker. Firebase Messaging setup must not introduce competing service worker behavior.

### Duplicate Sends

Cloud Functions may retry, and scheduled jobs may overlap. Use deterministic `notificationLogs` ids as a lock before sending.

### Timezone Accuracy

Due-date reminders must be calculated in the reminder's timezone. Do not compare only UTC dates.

### Token Lifecycle

Push tokens can expire or become invalid. Delivery errors should disable or remove invalid tokens.

## First Milestone Definition

The first milestone is complete when:

- iOS Safari users see install guidance.
- Installed PWA users can enable notifications.
- FCM tokens are stored in Firestore.
- A user can create a vet, deworming, or vaccine reminder.
- A scheduled function sends the day-before and day-of notifications.
- Duplicate sends are prevented.
- Notification taps open the related pet page.
