import { cacheGet, cacheSet, cacheDel } from 'src/utils/idbCache'

const SNAPSHOT_KEY = 'appSnapshot:latest'
const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * @param {Object} snapshotData
 * @param {string} snapshotData.userId
 * @param {string|null} snapshotData.familyId
 * @param {Object} snapshotData.user
 * @param {Object|null} snapshotData.family
 * @param {Array} snapshotData.pets
 * @param {{ petId: string, monthKey: string, dailyRecords: Object, pet: Object }} [snapshotData.lastViewedPet]
 * @returns {Promise<boolean>}
 */
export async function saveAppSnapshot(snapshotData) {
  if (!snapshotData || !snapshotData.userId) return false
  const snapshot = {
    ...snapshotData,
    savedAt: Date.now(),
  }
  return cacheSet(SNAPSHOT_KEY, snapshot)
}

/**
 * @returns {Promise<Object|null>}
 */
export async function loadAppSnapshot() {
  return cacheGet(SNAPSHOT_KEY, { maxAgeMs: SNAPSHOT_MAX_AGE_MS })
}

/**
 * @returns {Promise<boolean>}
 */
export async function clearSnapshot() {
  return cacheDel(SNAPSHOT_KEY)
}

/**
 * @param {string} petId
 * @param {string} monthKey
 * @param {Object} dailyRecords
 * @param {Object} pet
 * @returns {Promise<boolean>}
 */
export async function updateLastViewedPet(petId, monthKey, dailyRecords, pet) {
  const existing = await loadAppSnapshot()
  if (!existing) return false
  const updated = {
    ...existing,
    lastViewedPet: { petId, monthKey, dailyRecords, pet },
    savedAt: Date.now(),
  }
  return cacheSet(SNAPSHOT_KEY, updated)
}
