<template>
  <q-dialog :model-value="modelValue" @update:model-value="updateModelValue" persistent>
    <q-card class="w-full max-w-md">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ title }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup @click="onCancel" />
      </q-card-section>

      <q-card-section>
        <p class="text-gray-700">{{ message }}</p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn 
          flat 
          :label="cancelLabel" 
          color="grey" 
          v-close-popup 
          @click="onCancel" 
        />
        <q-btn 
          :label="confirmLabel" 
          :color="confirmColor" 
          :loading="loading"
          @click="onConfirm" 
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: '確認'
  },
  message: {
    type: String,
    required: true
  },
  confirmLabel: {
    type: String,
    default: '確認'
  },
  cancelLabel: {
    type: String,
    default: '取消'
  },
  confirmColor: {
    type: String,
    default: 'amber-8'
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const updateModelValue = (value) => {
  emit('update:modelValue', value);
};

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('update:modelValue', false);
  emit('cancel');
};
</script> 