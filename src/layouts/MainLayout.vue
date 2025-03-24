<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-[#F59E0B]">
      <q-toolbar>
        <q-icon name="pets" class="text-3xl text-white" />

        <q-toolbar-title>
          Meow Log
        </q-toolbar-title>
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
