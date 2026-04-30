<template>
  <div
    class="reminder-item"
    :class="{
      'reminder-item--completed': isCompleted,
      'reminder-item--disabled': !reminder.enabled && !isCompleted,
      'reminder-item--overdue': isOverdue,
    }"
  >
    <!-- Type badge + title row -->
    <div class="reminder-item__top">
      <span class="type-badge" :class="`type-badge--${reminder.type}`">
        <q-icon
          v-if="typeConfig[reminder.type]?.icon"
          :name="typeConfig[reminder.type].icon"
          class="type-badge__icon"
        />
        {{ typeConfig[reminder.type]?.label }}
      </span>
      <span v-if="isCompleted" class="status-chip status-chip--done">已完成</span>
      <span v-else-if="!reminder.enabled" class="status-chip status-chip--off">已停用</span>
      <span v-else-if="isOverdue" class="status-chip status-chip--overdue">已過期</span>
    </div>

    <div class="reminder-item__title">{{ reminder.title }}</div>

    <div class="reminder-item__meta">
      <q-icon name="event" style="font-size: 13px;" />
      <span>{{ formattedDate }}</span>
      <span v-if="reminder.note" class="reminder-item__note">· {{ reminder.note }}</span>
    </div>

    <!-- Actions -->
    <div v-if="!isCompleted" class="reminder-item__actions">
      <button class="action-btn action-btn--complete" @click="$emit('complete', reminder.id)" title="標記為完成">
        <q-icon name="check_circle_outline" style="font-size: 16px;" />
        完成
      </button>
      <button v-if="!readOnly" class="action-btn" @click="$emit('edit', reminder)" title="編輯">
        <q-icon name="edit" style="font-size: 15px;" />
      </button>
      <button class="action-btn" @click="$emit('toggle', reminder)" :title="reminder.enabled ? '停用' : '啟用'">
        <q-icon :name="reminder.enabled ? 'notifications_off' : 'notifications'" style="font-size: 15px;" />
      </button>
      <button class="action-btn action-btn--danger" @click="$emit('delete', reminder.id)" title="刪除">
        <q-icon name="delete_outline" style="font-size: 15px;" />
      </button>
    </div>
    <div v-else class="reminder-item__actions">
      <button class="action-btn action-btn--danger" @click="$emit('delete', reminder.id)" title="刪除">
        <q-icon name="delete_outline" style="font-size: 15px;" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  reminder: { type: Object, required: true },
  readOnly: { type: Boolean, default: false },
})

defineEmits(['edit', 'complete', 'toggle', 'delete'])

const typeConfig = {
  vet:      { label: '看診', icon: 'medical_services' },
  deworm:   { label: '驅蟲', icon: 'pest_control' },
  vaccine:  { label: '疫苗', icon: 'vaccines' },
  bath:     { label: '洗澡', icon: 'bathtub' },
  grooming: { label: '美容', icon: 'content_cut' },
  other:    { label: '提醒', icon: 'event_note' },
}

const isCompleted = computed(() => !!props.reminder.completedAt)

const isOverdue = computed(() => {
  if (isCompleted.value || !props.reminder.enabled) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(props.reminder.dueDate + 'T00:00:00')
  return due < today
})

const formattedDate = computed(() => {
  if (!props.reminder.dueDate) return ''
  const [y, m, d] = props.reminder.dueDate.split('-')
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = due - today
  const diffDays = Math.round(diffMs / 86400000)

  const base = `${y}年${m}月${d}日`
  if (diffDays === 0) return `今天（${base}）`
  if (diffDays === 1) return `明天（${base}）`
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} 天後（${base}）`
  return base
})
</script>

<style scoped>
.reminder-item {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  padding: 12px 14px;
  border: 1.5px solid var(--ml-border);
  transition: box-shadow 0.15s;
}
.reminder-item:hover { box-shadow: var(--ml-shadow); }

.reminder-item--completed { opacity: 0.55; }
.reminder-item--disabled  { opacity: 0.6; }
.reminder-item--overdue   { border-color: var(--ml-r-smed); }

.reminder-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

/* Type badge */
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
}
.type-badge__icon    { font-size: 13px; }
.type-badge--vet      { background: var(--ml-blue-bg);   color: var(--ml-blue); }
.type-badge--deworm   { background: var(--ml-green-bg);  color: var(--ml-green); }
.type-badge--vaccine  { background: var(--ml-amber-bg);  color: var(--ml-amber); }
.type-badge--bath     { background: var(--ml-primary-l); color: var(--ml-primary); }
.type-badge--grooming { background: var(--ml-bg);        color: var(--ml-text-sec); border: 1px solid var(--ml-border); }
.type-badge--other    { background: var(--ml-bg);        color: var(--ml-text-muted); border: 1px solid var(--ml-border); }

/* Status chips */
.status-chip {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 20px;
}
.status-chip--done    { background: var(--ml-green-bg);  color: var(--ml-green); }
.status-chip--off     { background: var(--ml-bg);        color: var(--ml-text-muted); border: 1px solid var(--ml-border); }
.status-chip--overdue { background: var(--ml-r-smed-bg); color: var(--ml-r-smed); }

.reminder-item__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ml-text);
  margin-bottom: 4px;
}

.reminder-item__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ml-text-sec);
  margin-bottom: 10px;
}

.reminder-item__note {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ml-text-muted);
}

/* Action buttons */
.reminder-item__actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--ml-border);
  background: var(--ml-bg);
  color: var(--ml-text-sec);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
}
.action-btn:hover { border-color: var(--ml-primary); color: var(--ml-primary); background: var(--ml-primary-l); }

.action-btn--complete {
  border-color: var(--ml-green);
  color: var(--ml-green);
  background: var(--ml-green-bg);
}
.action-btn--complete:hover { opacity: 0.8; }

.action-btn--danger:hover { border-color: var(--ml-r-smed); color: var(--ml-r-smed); background: var(--ml-r-smed-bg); }
</style>
