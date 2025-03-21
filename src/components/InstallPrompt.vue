<template>
  <q-dialog v-model="showInstallPrompt" persistent>
    <q-card class="install-prompt">
      <q-card-section class="row items-center">
        <div class="text-h6">Install Meow Log</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="dismiss" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p>Add Meow Log to your home screen for easy access to your pet's health records!</p>
        <div class="row items-center justify-center q-pa-md">
          <q-icon name="pets" size="48px" color="amber-6" />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="下次再说" color="grey" v-close-popup @click="dismiss" />
        <q-btn label="安装" color="amber-8" @click="install" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const showInstallPrompt = ref(false);
let deferredPrompt = null;

const handleBeforeInstallPrompt = (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt.value = true;
};

const install = async () => {
  if (!deferredPrompt) {
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User install choice: ${outcome}`);
  
  deferredPrompt = null;
  showInstallPrompt.value = false;
};

const dismiss = () => {
  showInstallPrompt.value = false;
  localStorage.setItem('installPromptDismissed', Date.now().toString());
};

onMounted(() => {
  const lastDismissed = localStorage.getItem('installPromptDismissed');
  const shouldShowPrompt = !lastDismissed || 
                          (Date.now() - parseInt(lastDismissed)) > (3 * 24 * 60 * 60 * 1000); // 3天
  
  if (shouldShowPrompt) {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }
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
</style>
