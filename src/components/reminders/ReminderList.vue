<template>
  <div class="reminder-list mx-4 mb-4">
    <!-- Section header -->
    <div class="reminder-list__header">
      <div class="reminder-list__title">
        <q-icon name="notifications_active" style="font-size: 18px; color: var(--ml-primary)" />
        即將到來的提醒
        <span v-if="activeCount > 0" class="reminder-count">{{ activeCount }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="reminder-list__empty">
      <q-spinner-dots size="32px" color="primary" />
    </div>

    <!-- Active reminders -->
    <div v-else-if="activeReminders.length > 0" class="reminder-list__items">
      <reminder-item
        v-for="r in activeReminders"
        :key="r.id"
        :reminder="r"
        :read-only="true"
        @complete="confirmComplete"
        @toggle="handleToggle"
        @delete="confirmDelete"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="reminder-list__empty">
      <q-icon name="event_available" style="font-size: 32px; color: var(--ml-text-muted)" />
      <p>標記回診、疫苗或驅蟲時可設置通知</p>
    </div>

    <!-- Completed section toggle -->
    <button
      v-if="completedReminders.length > 0"
      class="completed-toggle"
      @click="showCompleted = !showCompleted"
    >
      <q-icon :name="showCompleted ? 'expand_less' : 'expand_more'" style="font-size: 16px" />
      已完成（{{ completedReminders.length }}）
    </button>

    <div v-if="showCompleted" class="reminder-list__items reminder-list__items--completed">
      <reminder-item
        v-for="r in completedReminders"
        :key="r.id"
        :reminder="r"
        :read-only="true"
        @complete="confirmComplete"
        @toggle="handleToggle"
        @delete="confirmDelete"
      />
    </div>

    <!-- Delete confirm -->
    <confirm-dialog
      v-if="deleteTargetId"
      v-model="showDeleteConfirm"
      title="刪除提醒"
      message="確定要刪除這個提醒嗎？此操作無法復原。"
      confirm-label="刪除"
      confirm-color="negative"
      :loading="actionLoading"
      @confirm="executeDelete"
      @cancel="deleteTargetId = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReminderStore } from 'src/stores/reminderStore'
import { notification } from 'src/boot/notification'
import ReminderItem from './ReminderItem.vue'
import ConfirmDialog from 'src/components/ConfirmDialog.vue'

const props = defineProps({
  petId: { type: String, required: true },
  petName: { type: String, default: '' },
})

const reminderStore = useReminderStore()
const { loading } = reminderStore

const showCompleted = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref(null)
const actionLoading = ref(false)

const petReminders = computed(() =>
  reminderStore.reminders.filter((r) => r.petId === props.petId),
)

const activeReminders = computed(() =>
  petReminders.value
    .filter((r) => !r.completedAt)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
)

const completedReminders = computed(() =>
  petReminders.value
    .filter((r) => !!r.completedAt)
    .sort((a, b) => (a.dueDate > b.dueDate ? -1 : a.dueDate < b.dueDate ? 1 : 0)),
)

const activeCount = computed(() => activeReminders.value.filter((r) => r.enabled).length)

const confirmComplete = async (id) => {
  const ok = await reminderStore.markComplete(id)
  if (ok) notification.success('已標記為完成')
  else notification.error('操作失敗，請稍後再試')
}

const handleToggle = async (reminder) => {
  if (reminder.enabled) {
    const ok = await reminderStore.turnOffReminder(reminder.id)
    if (ok) notification.info('提醒已停用')
    else notification.error('操作失敗，請稍後再試')
  } else {
    const ok = await reminderStore.editReminder(reminder.id, { enabled: true })
    if (ok) notification.success('提醒已啟用')
    else notification.error('操作失敗，請稍後再試')
  }
}

const confirmDelete = (id) => {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

const executeDelete = async () => {
  if (!deleteTargetId.value) return
  actionLoading.value = true
  try {
    const ok = await reminderStore.removeReminder(deleteTargetId.value)
    if (ok) notification.success('提醒已刪除')
    else notification.error('刪除失敗，請稍後再試')
  } finally {
    actionLoading.value = false
    deleteTargetId.value = null
    showDeleteConfirm.value = false
  }
}

onMounted(() => {
  reminderStore.loadPetReminders(props.petId)
})
</script>

<style scoped>
.reminder-list {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  box-shadow: var(--ml-shadow);
  overflow: hidden;
}

.reminder-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--ml-border);
}

.reminder-list__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ml-text);
}

.reminder-count {
  background: var(--ml-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  min-width: 20px;
  text-align: center;
}

.reminder-list__items {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reminder-list__items--completed {
  padding-top: 0;
}

.reminder-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: var(--ml-text-muted);
  font-size: 13px;
  text-align: center;
}

.reminder-list__empty p {
  margin: 0;
}

.completed-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 9px 16px;
  background: var(--ml-bg);
  border: none;
  border-top: 1px solid var(--ml-border);
  color: var(--ml-text-sec);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.completed-toggle:hover {
  background: var(--ml-primary-l);
}
</style>
