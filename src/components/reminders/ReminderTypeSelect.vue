<template>
  <div class="reminder-type-select">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="type-pill"
      :class="{ 'type-pill--active': modelValue === opt.value, [`type-pill--${opt.value}`]: true }"
      @click="$emit('update:modelValue', opt.value)"
    >
      <span class="type-pill__icon">{{ opt.icon }}</span>
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'vet' },
})
defineEmits(['update:modelValue'])

const options = [
  { value: 'vet', label: '看診', icon: '🏥' },
  { value: 'deworm', label: '驅蟲', icon: '🐛' },
  { value: 'vaccine', label: '疫苗', icon: '💉' },
]
</script>

<style scoped>
.reminder-type-select {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--ml-border);
  background: var(--ml-bg);
  color: var(--ml-text-sec);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.type-pill:hover { border-color: var(--ml-primary); color: var(--ml-primary); }

.type-pill--active.type-pill--vet    { background: var(--ml-blue-bg); border-color: var(--ml-blue); color: var(--ml-blue); }
.type-pill--active.type-pill--deworm { background: var(--ml-green-bg); border-color: var(--ml-green); color: var(--ml-green); }
.type-pill--active.type-pill--vaccine{ background: var(--ml-amber-bg); border-color: var(--ml-amber); color: var(--ml-amber); }
</style>
