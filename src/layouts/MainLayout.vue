<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="ml-main-header">
      <q-toolbar class="ml-toolbar">
        <div class="flex items-center gap-2">
          <q-icon name="pets" class="header-paw" />
          <q-toolbar-title class="header-title">Meow Log</q-toolbar-title>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <install-prompt />
    <notification-opt-in-dialog />
  </q-layout>
</template>

<script setup>
import InstallPrompt from 'src/components/InstallPrompt.vue';
import NotificationOptInDialog from 'src/components/notifications/NotificationOptInDialog.vue';
</script>

<style>
/* 讓 mobile overscroll 下拉露出的背景與 header 同色 */
html,
body,
.q-layout,
.q-page-container {
  background-color: #EC8A20;
}

html,
body {
  overscroll-behavior-y: none;
}
</style>

<style scoped>
.ml-main-header {
  background: #EC8A20;
  box-shadow: none;
}

.ml-toolbar {
  min-height: 52px;
  padding: 0 16px;
}

.header-paw {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.92);
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  padding: 0;
  flex: 0 0 auto;
}
</style>
