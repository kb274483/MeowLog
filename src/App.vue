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
import { onMounted, onUnmounted } from 'vue'
// import { useRouter } from 'vue-router'
import { state as notificationState } from 'src/boot/notification'
import NotificationModal from 'src/components/NotificationModal.vue'
import OfflineIndicator from 'src/components/OfflineIndicator.vue'
import { useUserStore } from 'src/stores/userStore'
import { usePetStore } from 'src/stores/petStore'
import { saveAppSnapshot } from 'src/services/appSnapshotService'

// const router = useRouter()
const userStore = useUserStore()
const petStore = usePetStore()

const closeNotification = () => {
  notificationState.show = false
}

const persistSnapshot = () => {
  if (!userStore.user?.uid) return
  const snapshotData = {
    userId: userStore.user.uid,
    familyId: userStore.family?.id ?? null,
    user: userStore.user,
    family: userStore.family ?? null,
    pets: petStore.pets ?? []
  }
  if (petStore.lastViewedPetForSnapshot) {
    snapshotData.lastViewedPet = petStore.lastViewedPetForSnapshot
  }
  void saveAppSnapshot(snapshotData)
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    persistSnapshot()
  }
}

const handlePageHide = () => {
  persistSnapshot()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', handlePageHide)
})
</script>
