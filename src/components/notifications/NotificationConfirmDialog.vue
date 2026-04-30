<template>
  <q-dialog v-model="visible" persistent>
    <q-card class="notif-confirm">
      <q-card-section class="header">
        <q-icon name="notifications_active" class="header-icon" />
        <div class="title">要設置通知嗎？</div>
      </q-card-section>

      <q-card-section class="body">
        <p class="desc">
          系統會在
          <strong>前一天</strong>與<strong>當天早上 10 點</strong>
          推播提醒。
        </p>
        <ul class="tag-list">
          <li v-for="c in candidates" :key="c.tag">
            <q-icon name="event" size="14px" />
            <span class="tag-name">{{ c.tag }}</span>
            <span class="tag-date">{{ formattedDate }}</span>
          </li>
        </ul>
      </q-card-section>

      <q-card-actions align="right" class="actions">
        <q-btn flat label="不用了" :disable="loading" @click="onSkip" />
        <q-btn
          unelevated
          color="primary"
          label="設置通知"
          :loading="loading"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  candidates: { type: Array, default: () => [] }, // [{ tag, type }]
  dueDate: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'skip'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)

const formattedDate = computed(() => {
  if (!props.dueDate) return ''
  const [y, m, d] = props.dueDate.split('-')
  return `${y}/${m}/${d}`
})

const onConfirm = async () => {
  loading.value = true
  try {
    await emit('confirm', props.candidates)
  } finally {
    loading.value = false
    visible.value = false
  }
}

const onSkip = () => {
  emit('skip')
  visible.value = false
}

watch(
  () => props.modelValue,
  (v) => {
    if (!v) loading.value = false
  },
)
</script>

<style scoped>
.notif-confirm {
  width: min(360px, 92vw);
  border-radius: 16px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 18px 6px;
}

.header-icon {
  font-size: 22px;
  color: var(--ml-primary);
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ml-text);
}

.body {
  padding: 4px 18px 8px;
}

.desc {
  font-size: 13.5px;
  color: var(--ml-text-sec);
  margin: 0 0 12px;
  line-height: 1.55;
}

.tag-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ml-primary-l);
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
}

.tag-name {
  font-weight: 600;
  color: var(--ml-text);
}

.tag-date {
  margin-left: auto;
  font-size: 12px;
  color: var(--ml-text-muted);
}

.actions {
  padding: 8px 12px 12px;
}
</style>
