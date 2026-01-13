const DB_NAME = 'meow-log-idb';
const DB_VERSION = 1;
const STORE_KV = 'kv';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('indexedDB not available'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function waitTx(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function jsonReplacer(_key, value) {
  // Firestore Timestamp (and similar) often has toMillis()
  if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      // ignore
    }
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function makeCloneable(value) {
  // Prefer structuredClone when available, then fall back to JSON for non-cloneable values
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fall through
    }
  }
  return JSON.parse(JSON.stringify(value, jsonReplacer));
}

/**
 * @param {string} key
 * @param {{ maxAgeMs?: number }} [opts]
 * @returns {Promise<any|null>}
 */
export async function cacheGet(key, opts = {}) {
  if (!hasIndexedDb()) return null;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_KV, 'readwrite');
    const store = tx.objectStore(STORE_KV);
    const rec = await new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!rec) return null;
    const { maxAgeMs } = opts;
    if (typeof maxAgeMs === 'number' && maxAgeMs >= 0) {
      const age = Date.now() - (rec.ts || 0);
      if (age > maxAgeMs) {
        // 過期就直接刪除（best-effort）
        try {
          store.delete(key);
          await waitTx(tx);
        } catch {
          // ignore
        } finally {
          db.close?.();
        }
        return null;
      }
    }
    // finish tx to avoid blocking other writers in some browsers
    await waitTx(tx);
    db.close?.();
    return rec.value ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @returns {Promise<boolean>}
 */
export async function cacheSet(key, value) {
  if (!hasIndexedDb()) return false;

  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_KV, 'readwrite');
      tx.objectStore(STORE_KV).put({ key, value, ts: Date.now() });
      await waitTx(tx);
    } catch {
      // Fallback: make it structured-cloneable (e.g. Vue Proxy / Firestore Timestamp)
      const tx2 = db.transaction(STORE_KV, 'readwrite');
      const safeValue = makeCloneable(value);
      tx2.objectStore(STORE_KV).put({ key, value: safeValue, ts: Date.now() });
      await waitTx(tx2);
    }
    db.close?.();
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function cacheDel(key) {
  if (!hasIndexedDb()) return false;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_KV, 'readwrite');
    tx.objectStore(STORE_KV).delete(key);
    await waitTx(tx);
    db.close?.();
    return true;
  } catch {
    return false;
  }
}

