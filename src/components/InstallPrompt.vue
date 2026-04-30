<template>
  <q-dialog v-model="showInstallPrompt" persistent>
    <q-card class="install-prompt">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ isIOS ? '加入主畫面' : '安裝 Meow Log' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="dismiss" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <template v-if="isIOS">
          <p>把 Meow Log 加到主畫面，才能收到日曆標記的提醒通知喔！</p>
          <ol class="ios-steps">
            <li>
              點選 Safari 下方的
              <q-icon name="ios_share" size="20px" color="amber-8" class="q-mx-xs" />
              「分享」按鈕
            </li>
            <li>選擇「加入主畫面」</li>
            <li>點右上角「新增」即可</li>
          </ol>
          <div class="row items-center justify-center q-pa-md">
            <q-icon name="pets" size="48px" color="amber-6" />
          </div>
        </template>
        <template v-else>
          <p>把 Meow Log 加到主畫面，方便快速查看毛孩的健康紀錄！</p>
          <div class="row items-center justify-center q-pa-md">
            <q-icon name="pets" size="48px" color="amber-6" />
          </div>
        </template>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="下次再說" color="grey" v-close-popup @click="dismiss" />
        <q-btn
          v-if="!isIOS"
          label="安裝"
          color="amber-8"
          :disable="!deferredPrompt"
          @click="install"
        />
        <q-btn v-else label="知道了" color="amber-8" v-close-popup @click="dismiss" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const showInstallPrompt = ref(false);
const isIOS = ref(false);
const deferredPrompt = ref(null);

const DISMISS_KEY = 'installPromptDismissed';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

const detectStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const detectIOS = () => {
  const ua = window.navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  // iPadOS 13+ 會回報為 Mac，再用 touch 判斷一次
  const isIPadOS =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIPadOS;
};

const recentlyDismissed = () => {
  const lastDismissed = localStorage.getItem(DISMISS_KEY);
  if (!lastDismissed) return false;
  return Date.now() - parseInt(lastDismissed) < DISMISS_COOLDOWN_MS;
};

const handleBeforeInstallPrompt = (e) => {
  e.preventDefault();
  deferredPrompt.value = e;
  showInstallPrompt.value = true;
};

const install = async () => {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  await deferredPrompt.value.userChoice;
  deferredPrompt.value = null;
  showInstallPrompt.value = false;
};

const dismiss = () => {
  showInstallPrompt.value = false;
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
};

onMounted(() => {
  if (detectStandalone()) return;
  if (recentlyDismissed()) return;

  isIOS.value = detectIOS();

  if (isIOS.value) {
    showInstallPrompt.value = true;
    return;
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});
</script>

<style scoped>
.install-prompt {
  max-width: 350px;
  width: 90%;
}
.ios-steps {
  padding-left: 1.2rem;
  line-height: 1.8;
}
.ios-steps li {
  margin-bottom: 4px;
}
</style>
