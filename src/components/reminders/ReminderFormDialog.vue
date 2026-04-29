<template>
  <q-dialog :model-value="modelValue" @update:model-value="close" persistent>
    <q-card class="reminder-form-card">

      <q-card-section class="reminder-form-header">
        <span class="reminder-form-title">{{ isEdit ? '編輯提醒' : '新增提醒' }}</span>
        <q-btn icon="close" flat round dense color="grey" @click="close" />
      </q-card-section>

      <q-card-section class="reminder-form-body">

        <div class="form-field">
          <label class="form-label">提醒類型</label>
          <reminder-type-select v-model="form.type" />
        </div>

        <div class="form-field">
          <label class="form-label">標題</label>
          <input
            v-model="form.title"
            class="form-input"
            type="text"
            placeholder="請輸入標題"
            maxlength="50"
            @input="titleEdited = true"
          />
        </div>

        <div class="form-field">
          <label class="form-label">日期</label>
          <input
            v-model="form.dueDate"
            class="form-input"
            type="date"
          />
        </div>

        <div class="form-field">
          <label class="form-label">備註 <span class="form-label-opt">（選填）</span></label>
          <textarea
            v-model="form.note"
            class="form-input form-textarea"
            placeholder="可填寫看診院所、注意事項等…"
            rows="2"
            maxlength="200"
          />
        </div>

        <div class="form-field">
          <label class="form-label">推播提醒時間點</label>
          <div class="offset-options">
            <label class="offset-option">
              <input type="checkbox" :checked="form.offsets.includes(-1)" @change="toggleOffset(-1)" />
              <span>前一天</span>
            </label>
            <label class="offset-option">
              <input type="checkbox" :checked="form.offsets.includes(0)" @change="toggleOffset(0)" />
              <span>當天</span>
            </label>
          </div>
        </div>

        <div v-if="isEdit" class="form-field form-field--row">
          <label class="form-label">啟用提醒</label>
          <q-toggle v-model="form.enabled" color="amber-8" />
        </div>

      </q-card-section>

      <q-card-actions align="right" class="reminder-form-actions">
        <q-btn flat label="取消" color="grey" @click="close" />
        <q-btn
          :label="isEdit ? '儲存' : '新增'"
          color="amber-8"
          unelevated
          :loading="saving"
          :disable="!isValid"
          @click="submit"
        />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useReminderStore } from 'src/stores/reminderStore'
import { notification } from 'src/boot/notification'
import ReminderTypeSelect from './ReminderTypeSelect.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  petId:      { type: String, required: true },
  petName:    { type: String, default: '' },
  reminder:   { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const reminderStore = useReminderStore()
const saving = ref(false)
const titleEdited = ref(false)

const isEdit = computed(() => !!props.reminder)

const typeLabels = { vet: '看診', deworm: '驅蟲', vaccine: '疫苗' }

const defaultTitle = (type) =>
  props.petName ? `${props.petName} ${typeLabels[type] ?? '提醒'}` : typeLabels[type] ?? '提醒'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const blankForm = () => ({
  type: 'vet',
  title: defaultTitle('vet'),
  dueDate: todayStr(),
  note: '',
  offsets: [-1, 0],
  enabled: true,
})

const form = ref(blankForm())

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    titleEdited.value = false
    if (props.reminder) {
      form.value = {
        type:    props.reminder.type    ?? 'vet',
        title:   props.reminder.title   ?? '',
        dueDate: props.reminder.dueDate ?? todayStr(),
        note:    props.reminder.note    ?? '',
        offsets: props.reminder.offsets ? [...props.reminder.offsets] : [-1, 0],
        enabled: props.reminder.enabled ?? true,
      }
    } else {
      form.value = blankForm()
    }
  },
)

watch(
  () => form.value.type,
  (type) => {
    if (!titleEdited.value) {
      form.value.title = defaultTitle(type)
    }
  },
)

const toggleOffset = (val) => {
  const idx = form.value.offsets.indexOf(val)
  if (idx === -1) {
    form.value.offsets = [...form.value.offsets, val].sort()
  } else {
    form.value.offsets = form.value.offsets.filter((o) => o !== val)
  }
}

const isValid = computed(() => form.value.title.trim() && form.value.dueDate)

const close = () => emit('update:modelValue', false)

const submit = async () => {
  if (!isValid.value || saving.value) return
  saving.value = true
  try {
    const data = {
      petId:   props.petId,
      type:    form.value.type,
      title:   form.value.title.trim(),
      dueDate: form.value.dueDate,
      note:    form.value.note.trim(),
      offsets: form.value.offsets,
      enabled: form.value.enabled,
    }
    if (isEdit.value) {
      await reminderStore.editReminder(props.reminder.id, data)
      notification.success('提醒已更新')
    } else {
      await reminderStore.addReminder(data)
      notification.success('提醒已新增')
    }
    emit('saved')
    close()
  } catch {
    notification.error('儲存失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.reminder-form-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px !important;
}

.reminder-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--ml-border);
}

.reminder-form-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ml-text);
}

.reminder-form-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ml-text-sec);
}

.form-label-opt {
  font-weight: 400;
  color: var(--ml-text-muted);
}

.form-input {
  width: 100%;
  background: var(--ml-bg);
  border: 1.5px solid var(--ml-border);
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--ml-text);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.form-input:focus { border-color: var(--ml-primary); }

.form-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

.offset-options {
  display: flex;
  gap: 16px;
}

.offset-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  color: var(--ml-text);
  cursor: pointer;
  user-select: none;
}
.offset-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--ml-primary);
  cursor: pointer;
}

.reminder-form-actions {
  padding: 8px 16px 16px;
}
</style>
