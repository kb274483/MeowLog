'use strict';

const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const TYPE_LABELS = { vet: '看診', deworm: '驅蟲', vaccine: '疫苗' };

// Set APP_DOMAIN in Firebase Functions environment:
//   firebase functions:secrets:set APP_DOMAIN
// or via .env.local for emulator.
const APP_DOMAIN = process.env.APP_DOMAIN || 'https://meow-log.web.app';

/**
 * Send push notifications for one reminder + offset pair.
 * Uses a deterministic log ID as an atomic lock to prevent duplicate sends.
 *
 * Log ID format: `${reminderId}_${offset}_${scheduledDate}`
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {object}  reminder      - Firestore reminder document data + id
 * @param {number}  offset        - e.g. -1 (day before) or 0 (day of)
 * @param {string}  scheduledDate - YYYY-MM-DD (= dueDate + offset days)
 * @returns {Promise<{ failedTokens: string[] }>}
 */
async function sendReminderNotification(db, reminder, offset, scheduledDate) {
  const logId = `${reminder.id}_${offset}_${scheduledDate}`;
  const logRef = db.doc(`notificationLogs/${logId}`);

  // Atomic lock: DocumentReference.create() throws ALREADY_EXISTS if the log
  // was already written, preventing duplicate sends on function retries or overlaps.
  try {
    await logRef.create({
      reminderId: reminder.id,
      familyId: reminder.familyId,
      petId: reminder.petId || null,
      offset,
      scheduledDate,
      pending: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    const isAlreadyExists =
      err.code === 6 ||
      err.code === 'already-exists' ||
      err.message?.includes('ALREADY_EXISTS');

    if (isAlreadyExists) {
      logger.info('sendReminderNotification: duplicate skipped', { logId });
      return { failedTokens: [] };
    }
    throw err;
  }

  // Load all enabled push tokens for this family
  const tokensSnap = await db
    .collection('pushTokens')
    .where('familyId', '==', reminder.familyId)
    .where('enabled', '==', true)
    .get();

  const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);

  if (tokens.length === 0) {
    logger.info('sendReminderNotification: no enabled tokens', { familyId: reminder.familyId });
    await logRef.update({
      pending: false,
      tokenCount: 0,
      successCount: 0,
      failureCount: 0,
      sentAt: FieldValue.serverTimestamp(),
    });
    return { failedTokens: [] };
  }

  // Build notification payload
  const typeLabel = TYPE_LABELS[reminder.type] || '提醒';
  const notifTitle = offset === -1
    ? `明天「${typeLabel}」提醒`
    : `今天「${typeLabel}」提醒`;
  const notifBody = reminder.title || `${typeLabel}時間到了`;
  const petUrl = reminder.petId
    ? `${APP_DOMAIN}/pet/${reminder.petId}`
    : APP_DOMAIN;

  const message = {
    tokens,
    notification: { title: notifTitle, body: notifBody },
    webpush: {
      fcmOptions: { link: petUrl },
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `reminder-${reminder.id}-${offset}`,
        renotify: true,
      },
    },
    data: {
      reminderId: reminder.id,
      petId: reminder.petId || '',
      type: reminder.type || '',
    },
  };

  let successCount = 0;
  let failureCount = 0;
  const failedTokens = [];

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    successCount = response.successCount;
    failureCount = response.failureCount;

    response.responses.forEach((resp, i) => {
      if (resp.success) return;
      const errCode = resp.error?.code || '';
      logger.warn('sendReminderNotification: FCM token failed', {
        tokenSuffix: tokens[i].slice(-8),
        errCode,
      });
      // Collect tokens that are permanently invalid for cleanup
      if (
        errCode.includes('invalid-registration-token') ||
        errCode.includes('registration-token-not-registered') ||
        errCode.includes('invalid-argument')
      ) {
        failedTokens.push(tokens[i]);
      }
    });
  } catch (err) {
    logger.error('sendReminderNotification: FCM multicast error', err);
    failureCount = tokens.length;
  }

  await logRef.update({
    pending: false,
    tokenCount: tokens.length,
    successCount,
    failureCount,
    sentAt: FieldValue.serverTimestamp(),
  });

  logger.info('sendReminderNotification: done', { logId, successCount, failureCount });
  return { failedTokens };
}

module.exports = { sendReminderNotification };
