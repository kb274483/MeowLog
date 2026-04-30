import {
  db,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'src/boot/firebase'

const COLLECTION = 'pushTokens'

const sha256Hex = async (input) => {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const detectPlatform = () => {
  const ua = navigator.userAgent
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isIPadOS =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isIOS = isAppleMobile || isIPadOS
  const isAndroid = /Android/.test(ua)

  if (isStandalone && isIOS) return 'ios-pwa'
  if (isStandalone && isAndroid) return 'android-pwa'
  if (isStandalone) return 'desktop-pwa'
  return 'browser'
}

export const buildTokenDocId = async (userId, token) => {
  const tokenHash = await sha256Hex(token)
  return `${userId}_${tokenHash.slice(0, 32)}`
}

/**
 * Upsert a push token for the current user/family.
 * Returns the created/updated docId (deterministic per userId+token).
 */
export const savePushToken = async ({ userId, familyId, token }) => {
  if (!userId || !familyId || !token) {
    throw new Error('savePushToken requires userId, familyId, and token')
  }

  const docId = await buildTokenDocId(userId, token)
  const ref = doc(db, COLLECTION, docId)

  const payload = {
    userId,
    familyId,
    token,
    platform: detectPlatform(),
    userAgent: navigator.userAgent,
    enabled: true,
    updatedAt: serverTimestamp(),
    lastUsedAt: serverTimestamp(),
  }

  await setDoc(
    ref,
    {
      ...payload,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )

  return docId
}

export const disablePushToken = async ({ userId, token }) => {
  if (!userId || !token) return
  const docId = await buildTokenDocId(userId, token)
  const ref = doc(db, COLLECTION, docId)
  await updateDoc(ref, {
    enabled: false,
    updatedAt: serverTimestamp(),
  }).catch((err) => {
    // 文件可能還沒建立過 — 忽略 not-found 不阻塞 UX
    console.warn('disablePushToken failed', err)
  })
}

export const touchPushToken = async ({ userId, token }) => {
  if (!userId || !token) return
  const docId = await buildTokenDocId(userId, token)
  const ref = doc(db, COLLECTION, docId)
  await updateDoc(ref, { lastUsedAt: serverTimestamp() }).catch(() => {})
}
