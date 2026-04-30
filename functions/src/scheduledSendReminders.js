'use strict'

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const { initializeApp, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { sendReminderNotification } = require('./sendReminderNotification')
const { cleanupInvalidTokens } = require('./cleanupInvalidTokens')

if (!getApps().length) initializeApp()
const db = getFirestore()

/**
 * Return the current date in YYYY-MM-DD format for a given timezone.
 */
function getLocalDateString(timezone) {
  // sv-SE locale produces ISO-like YYYY-MM-DD output
  return new Date().toLocaleDateString('sv-SE', { timeZone: timezone || 'Asia/Taipei' })
}

/**
 * Return the current hour (0-23) in a given timezone.
 */
function getLocalHour(timezone) {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Taipei',
    hour: 'numeric',
    hour12: false,
  }).format(new Date())
  // Intl can return "24" for midnight in some envs; normalize.
  const h = parseInt(hourStr, 10)
  return Number.isFinite(h) ? h % 24 : 0
}

// Local hour (in reminder.timezone) at which notifications are dispatched.
// The hourly cron tries to send from this hour onwards; deterministic
// notificationLogs IDs prevent duplicate sends across runs.
const FIRE_HOUR = 10

/**
 * Add `days` to a YYYY-MM-DD date string and return a new YYYY-MM-DD string.
 * Operates in UTC so daylight-saving transitions don't shift the date.
 */
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().split('T')[0]
}

/**
 * Scheduled Cloud Function — runs every hour (Asia/Taipei timezone).
 *
 * Logic:
 *   1. Compute today and tomorrow in Asia/Taipei.
 *   2. Query reminders with dueDate in {today, tomorrow}
 *      (covers offset 0 → fire on dueDate, offset -1 → fire the day before).
 *   3. For each (reminder, offset) where scheduledDate == today, send push.
 *   4. Deduplicate via notificationLogs document locks.
 *   5. Disable any push tokens that returned permanent errors.
 */
exports.scheduledSendReminders = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'Asia/Taipei',
    memory: '256MiB',
    region: 'asia-east1',
  },
  async () => {
    const today = getLocalDateString('Asia/Taipei')
    const tomorrow = addDays(today, 1)

    logger.info('scheduledSendReminders: start', { today, tomorrow })

    // Single-field index on dueDate is auto-created by Firestore.
    const snapshot = await db
      .collection('reminders')
      .where('dueDate', 'in', [today, tomorrow])
      .get()

    if (snapshot.empty) {
      logger.info('scheduledSendReminders: no reminders in range')
      return
    }

    const failedTokens = []
    const tasks = []

    snapshot.forEach((docSnap) => {
      const reminder = { id: docSnap.id, ...docSnap.data() }

      // Skip disabled or already-completed reminders (in-memory filter keeps
      // the Firestore query simple and avoids composite index requirements).
      if (!reminder.enabled || reminder.completedAt) return

      const offsets = Array.isArray(reminder.offsets) ? reminder.offsets : [-1, 0]

      const tz = reminder.timezone || 'Asia/Taipei'
      const localHour = getLocalHour(tz)

      for (const offset of offsets) {
        // scheduledDate = dueDate + offset
        //   offset  0 → fire on dueDate itself
        //   offset -1 → fire the day before dueDate
        const scheduledDate = addDays(reminder.dueDate, offset)
        if (scheduledDate !== today) continue
        // Only dispatch from FIRE_HOUR onwards (in reminder's timezone).
        // Earlier hourly runs that day skip; later runs are deduped by notificationLogs.
        if (localHour < FIRE_HOUR) continue

        tasks.push(
          sendReminderNotification(db, reminder, offset, scheduledDate)
            .then((result) => {
              if (result?.failedTokens?.length) {
                failedTokens.push(...result.failedTokens)
              }
            })
            .catch((err) => {
              logger.error('scheduledSendReminders: send failed', {
                reminderId: reminder.id,
                offset,
                err: err.message,
              })
            }),
        )
      }
    })

    await Promise.allSettled(tasks)

    if (failedTokens.length > 0) {
      await cleanupInvalidTokens(db, failedTokens).catch((err) => {
        logger.error('scheduledSendReminders: cleanup failed', { err: err.message })
      })
    }

    logger.info('scheduledSendReminders: done', { tasksDispatched: tasks.length })
  },
)
