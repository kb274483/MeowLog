import { ref, computed } from 'vue'
import {
  getMessagingIfSupported,
  getToken,
  onMessage,
  VAPID_KEY,
} from 'src/boot/firebase'
import {
  savePushToken,
  disablePushToken,
  touchPushToken,
} from 'src/services/pushTokenService'

const STATE_KEY = 'notificationOptInState'
const DISMISSED_AT_KEY = 'notificationOptInDismissedAt'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

// State 共享：multiple components mount 同一份
const optInState = ref(localStorage.getItem(STATE_KEY) || 'pending')
const currentToken = ref(null)
const lastError = ref(null)

const setOptInState = (value) => {
  optInState.value = value
  if (value === 'pending') {
    localStorage.removeItem(STATE_KEY)
  } else {
    localStorage.setItem(STATE_KEY, value)
  }
}

const markDismissed = () => {
  localStorage.setItem(DISMISSED_AT_KEY, Date.now().toString())
}

const recentlyDismissed = () => {
  const ts = localStorage.getItem(DISMISSED_AT_KEY)
  if (!ts) return false
  return Date.now() - parseInt(ts) < DISMISS_COOLDOWN_MS
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const browserPermission = () => {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function usePushNotifications() {
  const canPrompt = computed(() => {
    if (typeof Notification === 'undefined') return false
    if (!isStandalone()) return false
    if (browserPermission() !== 'default') return false
    if (recentlyDismissed()) return false
    return true
  })

  const ensureMessaging = async () => {
    if (!VAPID_KEY) {
      throw new Error(
        'VITE_FIREBASE_VAPID_KEY 未設定，無法取得推播 token。請到 Firebase Console > Cloud Messaging 產生 Web Push 憑證並加到 .env',
      )
    }
    const messaging = await getMessagingIfSupported()
    if (!messaging) {
      throw new Error('此瀏覽器不支援 Web Push')
    }
    return messaging
  }

  /**
   * 嘗試取得並儲存 FCM token。需在使用者點擊後呼叫。
   * 回傳 token；失敗則 throw。
   */
  const requestAndStoreToken = async ({ userId, familyId }) => {
    if (!userId || !familyId) {
      throw new Error('使用者尚未登入或加入家庭')
    }

    lastError.value = null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setOptInState(permission === 'denied' ? 'denied' : 'pending')
      throw new Error(
        permission === 'denied'
          ? '通知權限已被拒絕，請到瀏覽器設定中開啟'
          : '尚未允許通知',
      )
    }

    const messaging = await ensureMessaging()
    const swRegistration = await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })

    if (!token) {
      throw new Error('取得 FCM token 失敗（可能是憑證未設定）')
    }

    await savePushToken({ userId, familyId, token })

    currentToken.value = token
    setOptInState('granted')
    return token
  }

  /**
   * 啟動時若已 granted，靜默刷新 token（不會跳出權限請求）。
   */
  const refreshTokenIfGranted = async ({ userId, familyId }) => {
    if (browserPermission() !== 'granted') return null
    if (!userId || !familyId) return null

    try {
      const messaging = await ensureMessaging()
      const swRegistration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })
      if (!token) return null

      if (token !== currentToken.value) {
        await savePushToken({ userId, familyId, token })
      } else {
        await touchPushToken({ userId, token })
      }
      currentToken.value = token
      setOptInState('granted')
      return token
    } catch (err) {
      console.warn('refreshTokenIfGranted failed', err)
      return null
    }
  }

  const disable = async ({ userId }) => {
    if (currentToken.value && userId) {
      await disablePushToken({ userId, token: currentToken.value })
    }
    currentToken.value = null
    setOptInState('disabled')
  }

  const dismiss = () => {
    markDismissed()
  }

  /**
   * 註冊 foreground 訊息監聽（Phase 5/6 之後才會收到實際內容；先預埋）。
   */
  const listenForeground = async (handler) => {
    const messaging = await getMessagingIfSupported()
    if (!messaging) return () => {}
    return onMessage(messaging, handler)
  }

  return {
    optInState,
    currentToken,
    lastError,
    canPrompt,
    isStandalone,
    browserPermission,
    requestAndStoreToken,
    refreshTokenIfGranted,
    disable,
    dismiss,
    listenForeground,
  }
}
