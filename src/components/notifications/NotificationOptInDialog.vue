<template>
  <q-dialog v-model="show" persistent>
    <q-card class="opt-in-card">
      <q-card-section class="row items-center">
        <div class="text-h6">開啟提醒通知</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDismiss" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>
          開啟通知後，當毛孩有日曆標記的提醒事項時，Meow Log
          會主動通知你和家人。
        </p>
        <ul class="benefit-list">
          <li>前一天和當天早上 10 點提醒</li>
          <li>家庭成員都會收到</li>
          <li>可隨時在設定中關閉</li>
        </ul>
        <div class="row items-center justify-center q-pa-md">
          <q-icon name="notifications_active" size="48px" color="amber-6" />
        </div>
        <q-banner v-if="errorMsg" dense class="text-white bg-red-6 q-mt-sm">
          {{ errorMsg }}
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="下次再說" color="grey" :disable="loading" @click="onDismiss" />
        <q-btn
          label="開啟通知"
          color="amber-8"
          :loading="loading"
          @click="onEnable"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from 'src/stores/userStore'
import { usePushNotifications } from 'src/composables/usePushNotifications'

const userStore = useUserStore()
const { user, family, loading: userLoading } = storeToRefs(userStore)

const {
  canPrompt,
  requestAndStoreToken,
  refreshTokenIfGranted,
  dismiss,
} = usePushNotifications()

const show = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const SHOW_DELAY_MS = 2500

const maybeShow = () => {
  if (!user.value || !family.value) return
  if (!canPrompt.value) return
  setTimeout(() => {
    if (canPrompt.value && user.value && family.value) {
      show.value = true
    }
  }, SHOW_DELAY_MS)
}

const onEnable = async () => {
  errorMsg.value = ''
  loading.value = true
  try {
    await requestAndStoreToken({
      userId: user.value.uid,
      familyId: family.value.id,
    })
    show.value = false
  } catch (err) {
    errorMsg.value = err.message || '開啟通知失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

const onDismiss = () => {
  dismiss()
  show.value = false
}

// 等使用者與家庭都載入後再判斷是否要顯示
watch(
  [user, family, userLoading],
  ([u, f, l]) => {
    if (!l && u && f) maybeShow()
  },
  { immediate: false },
)

onMounted(async () => {
  // 已 granted 的使用者：靜默刷新 token，但不開 dialog
  if (user.value && family.value) {
    await refreshTokenIfGranted({
      userId: user.value.uid,
      familyId: family.value.id,
    })
    maybeShow()
  }
})
</script>

<style scoped>
.opt-in-card {
  max-width: 380px;
  width: 90%;
}
.benefit-list {
  padding-left: 1.2rem;
  line-height: 1.8;
  margin: 0;
}
.benefit-list li {
  margin-bottom: 4px;
}
</style>
