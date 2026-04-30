'use strict';

const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');

const CHUNK_SIZE = 30; // Firestore 'in' operator max

/**
 * Disable invalid FCM tokens discovered during a send run.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string[]} invalidTokens  FCM token strings that returned invalid errors
 */
async function cleanupInvalidTokens(db, invalidTokens) {
  if (!invalidTokens?.length) return;

  const unique = [...new Set(invalidTokens)];
  logger.info('cleanupInvalidTokens: processing', { count: unique.length });

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);

    const snap = await db.collection('pushTokens').where('token', 'in', chunk).get();
    if (snap.empty) continue;

    const batch = db.batch();
    snap.docs.forEach((d) => {
      batch.update(d.ref, {
        enabled: false,
        disabledAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    logger.info('cleanupInvalidTokens: disabled batch', { count: snap.size });
  }
}

module.exports = { cleanupInvalidTokens };
