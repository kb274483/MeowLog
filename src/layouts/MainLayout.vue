<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-amber-600/70">
      <q-toolbar>
        <q-icon name="pets" class="text-3xl text-white" />

        <q-toolbar-title>
          Meow Log
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container style="padding-top: 64px;">
      <router-view />
    </q-page-container>
    
    <install-prompt />
  </q-layout>
</template>

<script setup>
import InstallPrompt from 'src/components/InstallPrompt.vue';
</script>
