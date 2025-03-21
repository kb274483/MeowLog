<template>
  <router-view />
  <notification-modal
    :show="notificationState.show"
    :type="notificationState.type"
    :title="notificationState.title"
    :message="notificationState.message"
    :button-text="notificationState.buttonText"
    :auto-close="notificationState.autoClose"
    :duration="notificationState.duration"
    @close="closeNotification"
  />
  <offline-indicator />
</template>

<script setup>
import { state as notificationState } from 'src/boot/notification'
import NotificationModal from 'src/components/NotificationModal.vue'
import OfflineIndicator from 'src/components/OfflineIndicator.vue'

const closeNotification = () => {
  notificationState.show = false
}
</script>
