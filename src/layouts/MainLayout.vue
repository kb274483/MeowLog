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
  </q-layout>
</template>

<script setup>
import InstallPrompt from 'src/components/InstallPrompt.vue';
</script>

<style scoped>
.ml-main-header {
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  box-shadow: 0 2px 12px rgba(180, 100, 10, 0.25);
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
