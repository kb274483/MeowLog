<template>
  <div v-if="isOffline" class="offline-indicator">
    <div class="offline-content">
      <q-icon name="wifi_off" size="sm" color="white" />
      <span>Offline Mode</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isOffline = ref(false);

function updateOnlineStatus() {
  isOffline.value = !navigator.onLine;
}

onMounted(() => {
  isOffline.value = !navigator.onLine;
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #F59E0B;
  color: white;
  text-align: center;
  padding: 6px 12px;
  z-index: 9999;
  font-size: 14px;
}

.offline-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
