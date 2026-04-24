<template>
  <q-dialog
    :model-value="modelValue"
    class="pet-export-dialog"
    maximized
    persistent
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="export-dialog-card">
      <q-card-section class="export-dialog-header">
        <div class="text-h6" style="color:#fff; font-weight:700;">資料匯出</div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense style="color:#fff;" />
      </q-card-section>

      <q-card-section class="q-px-md q-py-sm export-dialog-body">
        <!-- Quick ranges -->
        <div class="export-section mb-3">
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="r in quickRanges"
              :key="r.key"
              class="export-range-chip"
              :class="{ active: activeQuickRange === r.key }"
              @click="setExportQuickRange(r.key)"
            >{{ r.label }}</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="ml-field-label">開始日期</div>
              <input v-model="exportRange.start" type="date" class="export-date-input" />
            </div>
            <div>
              <div class="ml-field-label">結束日期</div>
              <input v-model="exportRange.end" type="date" class="export-date-input" />
            </div>
          </div>
        </div>

        <!-- Export fields -->
        <div class="export-section mb-3">
          <div class="flex items-center justify-between mb-2">
            <div class="ml-field-label" style="margin-bottom:0;">匯出項目（可複選）</div>
            <div class="flex gap-2">
              <button class="export-range-chip active" style="padding:4px 10px;font-size:11px;" @click="selectAllExportFields">全選</button>
              <button class="export-range-chip" style="padding:4px 10px;font-size:11px;" @click="clearExportSelectedFields">全取消</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="option in exportFieldOptions"
              :key="option.key"
              class="export-field-label"
            >
              <div
                class="export-checkbox"
                :class="{ active: exportSelectedFields.includes(option.key) }"
                @click="toggleExportField(option.key)"
              >
                <svg v-if="exportSelectedFields.includes(option.key)" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{{ option.label }}</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 mb-4">
          <button class="export-btn" @click="fetchExportRecords" :disabled="exportLoading">
            {{ exportLoading ? '查詢中...' : '查詢' }}
          </button>
          <button
            class="export-btn"
            style="background: linear-gradient(145deg,#3A3A3A,#1A1A1A);"
            @click="exportToPdf"
            :disabled="!exportReadyToPrint"
          >匯出 PDF</button>
          <span v-if="exportReadyToPrint" style="font-size:11px; color:var(--ml-text-muted);">使用瀏覽器列印儲存為 PDF</span>
        </div>

        <!-- Results -->
        <div v-if="exportHasSearched" ref="exportPrintAreaRef" class="export-print-area">
          <div v-if="!exportHasResults" class="text-center py-8" style="color:var(--ml-text-muted); font-size:14px;">
            該日期區間沒有可顯示的資料
          </div>
          <div v-else class="space-y-6">
            <div
              v-for="month in exportMonths"
              :key="month.key"
              class="export-month bg-white rounded-lg border border-gray-200 p-2"
            >
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-base font-semibold" style="color:var(--ml-text);">
                  {{ month.year }}年 {{ month.month + 1 }}月
                </h3>
                <span style="font-size:11px; color:var(--ml-text-muted);">
                  {{ exportRange.start }} ~ {{ exportRange.end }}
                </span>
              </div>

              <!-- Calendar grid -->
              <div class="grid grid-cols-7 mb-1">
                <div v-for="day in weekdays" :key="day" class="text-center" style="font-size:10px; color:var(--ml-text-muted); padding:2px 0;">{{ day }}</div>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <div
                  v-for="_ in month.firstDayOfMonth"
                  :key="`empty-${month.key}-${_}`"
                  class="h-24 border border-gray-100 bg-gray-50 rounded"
                ></div>
                <div
                  v-for="day in month.daysInMonth"
                  :key="`day-${month.key}-${day}`"
                  class="min-h-24 border rounded p-1"
                  :class="isExportDateInRange(month.year, month.month, day) ? 'border-gray-200' : 'bg-gray-50 text-gray-300'"
                >
                  <div class="flex justify-between">
                    <span style="font-size:10px; font-weight:500;">{{ day }}</span>
                  </div>
                  <div
                    v-if="isExportDateInRange(month.year, month.month, day)"
                    class="text-[10px] mt-1 flex flex-col gap-0.5"
                  >
                    <template v-for="fieldKey in exportSelectedFieldsWithoutNotes" :key="`${month.key}-${day}-${fieldKey}`">
                      <span
                        v-if="getExportFieldDisplay(getExportDateKey(month.year, month.month, day), fieldKey) !== null"
                        :class="getExportFieldClass(fieldKey)"
                      >
                        {{ getExportFieldDisplay(getExportDateKey(month.year, month.month, day), fieldKey) }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Notes list (below calendar) -->
              <div v-if="exportSelectedFields.includes('notes') && monthHasNotes(month)" class="export-notes-section">
                <div class="export-notes-title">本月備註</div>
                <div
                  v-for="day in month.daysInMonth"
                  :key="`note-${month.key}-${day}`"
                >
                  <div
                    v-if="isExportDateInRange(month.year, month.month, day) && exportRecords[getExportDateKey(month.year, month.month, day)]?.notes"
                    class="export-note-item"
                  >
                    <span class="export-note-date">{{ getExportDateKey(month.year, month.month, day) }}</span>
                    <span class="export-note-sep"> --- </span>
                    <span class="export-note-content">{{ exportRecords[getExportDateKey(month.year, month.month, day)].notes }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { db, collection, query, where, getDocs, doc, getDoc } from 'src/boot/firebase';
import { orderBy } from 'firebase/firestore';
import { notification } from 'src/boot/notification';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  petId:      { type: String, required: true },
  familyId:   { type: String, required: true },
  petName:    { type: String, default: '' },
});
defineEmits(['update:modelValue']);

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const quickRanges = [
  { key: 'thisMonth',       label: '本月' },
  { key: 'lastMonth',       label: '上個月' },
  { key: 'lastThreeMonths', label: '近三個月' },
  { key: 'lastSixMonths',   label: '近六個月' },
  { key: 'lastNineMonths',  label: '近九個月' },
  { key: 'lastYear',        label: '近一年' },
];

const exportFieldOptions = [
  { key: 'foodAmount',      label: '乾糧攝取量', unit: 'g',    type: 'number' },
  { key: 'wetFoodAmount',   label: '濕食攝取量', unit: '罐',   type: 'number' },
  { key: 'dailyWeight',     label: '體重',        unit: 'kg',   type: 'number' },
  { key: 'temperature',     label: '體溫',        unit: '°C',   type: 'number' },
  { key: 'hasVomit',        label: '是否嘔吐',    type: 'boolean' },
  { key: 'hasDiarrhea',     label: '是否腹瀉',    type: 'boolean' },
  { key: 'heartRate',       label: '心跳',        unit: '次/分', type: 'number' },
  { key: 'respirationRate', label: '呼吸',        unit: '次/分', type: 'number' },
  { key: 'notes',           label: '備註',        type: 'text' },
];

const exportRange = reactive({ start: '', end: '' });
const exportSelectedFields = ref([]);
const exportLoading = ref(false);
const exportHasSearched = ref(false);
const exportRecords = reactive({});
const exportPrintAreaRef = ref(null);
const activeQuickRange = ref('');

const exportSelectedFieldsWithoutNotes = computed(() =>
  exportSelectedFields.value.filter(k => k !== 'notes')
);

const exportRangeValid = computed(() =>
  !!(exportRange.start && exportRange.end && exportRange.start <= exportRange.end)
);
const exportHasResults = computed(() => Object.keys(exportRecords).length > 0);
const exportReadyToPrint = computed(() =>
  exportHasSearched.value && exportSelectedFields.value.length > 0
);

watch(() => props.modelValue, (val) => {
  if (val && !exportRange.start) setExportQuickRange('thisMonth');
});

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatNumber = (v, decimals = 0) =>
  (v === null || v === undefined) ? '' : Number(v).toFixed(decimals);
const formatWeight = (w) =>
  (w === null || w === undefined) ? '' : Number(w).toFixed(2);
const formatTemperature = (t) =>
  (t === null || t === undefined) ? '' : Number(t).toFixed(1);
const formatSymptomExportLabel = (label, count) =>
  `${label} ${Number(count ?? 1)}次`;

const toggleExportField = (key) => {
  const idx = exportSelectedFields.value.indexOf(key);
  if (idx >= 0) exportSelectedFields.value.splice(idx, 1);
  else exportSelectedFields.value.push(key);
};

const selectAllExportFields = () => {
  exportSelectedFields.value = exportFieldOptions.map(o => o.key);
};
const clearExportSelectedFields = () => {
  exportSelectedFields.value = [];
};

const setExportQuickRange = (type) => {
  activeQuickRange.value = type;
  const today = new Date();
  const ranges = {
    thisMonth:       [new Date(today.getFullYear(), today.getMonth(), 1),      new Date(today.getFullYear(), today.getMonth() + 1, 0)],
    lastMonth:       [new Date(today.getFullYear(), today.getMonth() - 1, 1),  new Date(today.getFullYear(), today.getMonth(), 0)],
    lastThreeMonths: [new Date(today.getFullYear(), today.getMonth() - 2, 1),  new Date(today.getFullYear(), today.getMonth() + 1, 0)],
    lastSixMonths:   [new Date(today.getFullYear(), today.getMonth() - 5, 1),  new Date(today.getFullYear(), today.getMonth() + 1, 0)],
    lastNineMonths:  [new Date(today.getFullYear(), today.getMonth() - 8, 1),  new Date(today.getFullYear(), today.getMonth() + 1, 0)],
    lastYear:        [new Date(today.getFullYear(), today.getMonth() - 11, 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)],
  };
  const [start, end] = ranges[type] || [];
  if (start && end) {
    exportRange.start = formatDate(start);
    exportRange.end   = formatDate(end);
  }
};

const clearExportRecords = () => {
  Object.keys(exportRecords).forEach(key => delete exportRecords[key]);
};

const normalizeExportRecord = (recordData) => ({
  date:            recordData.date || null,
  foodAmount:      recordData.foodAmount ?? null,
  wetFoodAmount:   (() => {
    const v = recordData.wetFoodAmount ?? null;
    if (v === null) return null;
    return recordData.wetFoodAmountV2 ? v : v / 10;
  })(),
  dailyWeight:     recordData.dailyWeight ?? null,
  temperature:     recordData.temperature ?? null,
  hasVomit:        !!recordData.hasVomit,
  vomitCount:      recordData.hasVomit ? Number(recordData.vomitCount ?? 1) : null,
  hasDiarrhea:     !!recordData.hasDiarrhea,
  diarrheaCount:   recordData.hasDiarrhea ? Number(recordData.diarrheaCount ?? 1) : null,
  heartRate:       recordData.heartRate ?? null,
  respirationRate: recordData.respirationRate ?? null,
  notes:           recordData.notes || null,
});

const getDateRangeKeys = (startStr, endStr) => {
  const dates = [];
  const cursor = new Date(startStr);
  const end = new Date(endStr);
  while (cursor <= end) { dates.push(formatDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
};

const fetchExportRecords = async () => {
  if (!props.petId || !props.familyId) return;
  if (!exportRangeValid.value) { notification.error('請先選擇日期區間'); return; }
  if (exportSelectedFields.value.length === 0) { notification.error('請至少選擇一個匯出項目'); return; }

  exportLoading.value = true;
  exportHasSearched.value = true;
  clearExportRecords();

  try {
    try {
      const rangeQuery = query(
        collection(db, 'petDailyRecords'),
        where('petId', '==', props.petId),
        where('familyId', '==', props.familyId),
        where('date', '>=', exportRange.start),
        where('date', '<=', exportRange.end),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(rangeQuery);
      snap.forEach(d => {
        const data = d.data();
        if (data?.date) exportRecords[data.date] = normalizeExportRecord(data);
      });
      return;
    } catch (e) { console.warn('Range query failed, fallback:', e); }

    const reads = getDateRangeKeys(exportRange.start, exportRange.end).map(dateKey => {
      const recordRef = doc(db, 'petDailyRecords', `${props.petId}_${dateKey}`);
      return getDoc(recordRef).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data?.date) exportRecords[data.date] = normalizeExportRecord(data);
      });
    });
    await Promise.all(reads);
  } catch (error) {
    console.error('Error:', error);
    notification.error('查詢失敗，請稍後再試');
  } finally {
    exportLoading.value = false;
  }
};

const exportMonths = computed(() => {
  if (!exportRangeValid.value) return [];
  const months = [];
  const cursor = new Date(new Date(exportRange.start).getFullYear(), new Date(exportRange.start).getMonth(), 1);
  const endMonth = new Date(new Date(exportRange.end).getFullYear(), new Date(exportRange.end).getMonth(), 1);
  while (cursor <= endMonth) {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      year, month,
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      firstDayOfMonth: new Date(year, month, 1).getDay(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
});

const isExportDateInRange = (year, month, day) => {
  if (!exportRangeValid.value) return false;
  const dateKey = formatDateKey(year, month, day);
  return dateKey >= exportRange.start && dateKey <= exportRange.end;
};

const getExportDateKey = (year, month, day) => formatDateKey(year, month, day);

const monthHasNotes = (month) => {
  for (let day = 1; day <= month.daysInMonth; day++) {
    const key = getExportDateKey(month.year, month.month, day);
    if (isExportDateInRange(month.year, month.month, day) && exportRecords[key]?.notes) return true;
  }
  return false;
};

const getExportFieldDisplay = (dateKey, fieldKey) => {
  const record = exportRecords[dateKey];
  if (!record) return null;
  switch (fieldKey) {
    case 'foodAmount':      return record.foodAmount === null ? null : `${formatNumber(record.foodAmount, 0)} g`;
    case 'wetFoodAmount':   return !record.wetFoodAmount ? null : `${formatNumber(record.wetFoodAmount, 2)} 罐`;
    case 'dailyWeight':     return record.dailyWeight === null ? null : `${formatWeight(record.dailyWeight)} kg`;
    case 'temperature':     return record.temperature === null ? null : `${formatTemperature(record.temperature)} °C`;
    case 'hasVomit':        return record.hasVomit ? formatSymptomExportLabel('嘔吐', record.vomitCount) : null;
    case 'hasDiarrhea':     return record.hasDiarrhea ? formatSymptomExportLabel('腹瀉', record.diarrheaCount) : null;
    case 'heartRate':       return record.heartRate === null ? null : `${formatNumber(record.heartRate, 0)} 次/分`;
    case 'respirationRate': return record.respirationRate === null ? null : `${formatNumber(record.respirationRate, 0)} 次/分`;
    default:                return null;
  }
};

const getExportFieldClass = (fieldKey) => {
  const base = 'inline-block px-1 py-0.5 rounded text-[10px]';
  if (fieldKey === 'hasVomit')    return `${base} bg-orange-100 text-orange-700 font-semibold`;
  if (fieldKey === 'hasDiarrhea') return `${base} bg-red-100 text-red-700 font-semibold`;
  if (['dailyWeight', 'temperature', 'heartRate', 'respirationRate'].includes(fieldKey))
    return `${base} bg-slate-200 text-amber-800`;
  return `${base} bg-amber-50 text-amber-800`;
};

const exportToPdf = () => {
  if (!exportReadyToPrint.value || !exportPrintAreaRef.value) {
    notification.error('請先完成查詢並選擇匯出項目'); return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) { notification.error('無法開啟列印視窗，請允許彈出視窗'); return; }
  const bodyHtml = exportPrintAreaRef.value.outerHTML;
  const titleText = `資料匯出-${props.petName}`;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${titleText}</title>${document.head.innerHTML}<style>@media print{body{margin:0}.export-month{page-break-inside:avoid}}body{background:#fff}.export-print-area{max-width:100%;padding:12px}</style></head><body>${bodyHtml}<${'script'}>(function(){var closed=false;function tryClose(){if(closed)return;closed=true;try{window.close()}catch(e){}};window.addEventListener('afterprint',function(){setTimeout(tryClose,200)});setTimeout(tryClose,20000)})();</${'script'}></body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
};

onMounted(()=>{
  setExportQuickRange('thisMonth')
})

</script>

<style scoped>
.export-dialog-card { background: var(--ml-bg); }

.export-dialog-header {
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  display: flex;
  align-items: center;
  padding: 14px 18px;
}

.export-dialog-body {
  max-height: calc(100vh - 58px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-section {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm-sm);
  padding: 14px;
  box-shadow: var(--ml-shadow);
}

.export-date-input {
  width: 100%;
  border: 1px solid var(--ml-border);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--ml-text);
  font-family: inherit;
  outline: none;
  margin-top: 5px;
  background: var(--ml-bg);
}
.export-date-input:focus { border-color: var(--ml-primary); }

.export-field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ml-text);
}

.export-checkbox {
  width: 18px; height: 18px;
  border-radius: 5px;
  border: 2px solid var(--ml-border);
  background: var(--ml-surface);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
  color: #fff;
}
.export-checkbox.active {
  background: var(--ml-primary);
  border-color: var(--ml-primary);
}

.export-btn {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  color: #fff;
  border: none; border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: opacity 0.15s;
}
.export-btn:hover { opacity: 0.9; }
.export-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Notes list ── */
.export-notes-section {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.export-notes-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--ml-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.export-note-item {
  display: flex;
  gap: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ml-text);
  padding: 2px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.export-note-item:last-child { border-bottom: none; }

.export-note-date {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--ml-text-sec);
  font-variant-numeric: tabular-nums;
}

.export-note-sep {
  flex-shrink: 0;
  color: var(--ml-text-muted);
}

.export-note-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

/* ── Print ── */
@media print {
  .export-dialog-body { max-height: none; overflow: visible; }
  .export-month { page-break-inside: avoid; }
  .pet-export-dialog :deep(.q-dialog__backdrop) { display: none !important; }
  .pet-export-dialog :deep(.q-dialog__inner) { align-items: flex-start !important; max-height: none !important; height: auto !important; }
  .pet-export-dialog :deep(.q-card) { box-shadow: none !important; max-height: none !important; height: auto !important; overflow: visible !important; }
  .pet-export-dialog :deep(.q-card__section) { overflow: visible !important; }
  .export-print-area { overflow: visible !important; }
  .export-notes-section { break-inside: avoid; }
}
</style>
