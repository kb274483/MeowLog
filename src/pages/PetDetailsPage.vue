<template>
  <div class="bg-gray-50 min-h-screen relative">
    <!-- Header -->
    <div 
      class="bg-white shadow-sm py-2 flex items-center fixed left-0 right-0 z-20 print-hidden" style="top: 50px;">
      <button 
        @click="goBack" 
        class="mr-4 p-4 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div v-if="pet" class="flex items-center flex-1 min-w-0">
        <img 
          :src="pet.photoURL || defaultImage" 
          :alt="pet.name" 
          class="w-10 h-10 rounded-full object-cover mr-3"
        />
        <div class="min-w-0">
          <h1 class="text-lg font-semibold text-gray-800">{{ pet.name }}</h1>
          <div class="flex text-xs text-gray-500 space-x-2">
            <span>{{ displayAge }} 歲</span>
            <span>{{ pet.weight }} kg</span>
            <span 
              :class="healthStatusClass"
              class="px-1.5 py-0.5 rounded-full text-xs"
            >
              {{ pet.healthStatus || '健康狀態未知' }}
            </span>
          </div>
        </div>
      </div>

      <button
        v-if="pet"
        @click="goToFiles"
        class="ml-2 mr-2 p-3 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
        title="檔案管理"
      >
        <q-icon name="folder" size="24px" />
      </button>
    </div>
    
    <!-- loading -->
    <div v-if="loading" class="flex justify-center items-center h-[90vh] print-hidden">
      <div class="text-center">
        <q-spinner-dots size="60px" color="amber" />
        <p class="mt-4 text-gray-600">
          Loading...
        </p>
      </div>
    </div>
    
    <div v-else-if="!pet" class="flex justify-center items-center h-[90vh] print-hidden">
      <div class="text-center">
        <p class="text-xl text-gray-600">
          找不到此寵物
        </p>
        <button 
          @click="goBack" 
          class="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
        >
          返回首頁
        </button>
      </div>
    </div>
    
    <div v-else class="container mx-auto p-4 print-hidden" style="padding-top: 94px;">
      <div 
        class="bg-white rounded-lg shadow-md p-2 mb-4 cursor-pointer hover:bg-amber-50 transition-colors"
        @click="showDataChart = true"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <q-icon name="show_chart" size="md" color="amber" class="mr-3" />
            <h3 class="text-lg font-semibold text-gray-800">
              健康記錄分析
            </h3>
          </div>
          <q-icon name="chevron_right" size="sm" color="grey" />
        </div>
        
        <p class="text-sm text-gray-600 mt-2">
          查看『{{ pet.name }}』的體重、飲食與體溫變化趨勢
        </p>
      </div>

      <div class="flex justify-end mb-4">
        <button
          class="px-3 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          @click="openExportDialog"
        >
          資料匯出
        </button>
      </div>
      <!-- Calendar -->
      <div class="bg-white rounded-lg shadow-md p-1 mb-4">
        <div class="flex justify-between items-center mb-4">
          <button 
            @click="previousMonth" 
            class="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 class="text-xl font-semibold text-gray-800">
            {{ currentYear }}年 {{ currentMonth + 1 }}月
          </h2>
          
          <button 
            @click="nextMonth" 
            class="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Weekdays -->
        <div class="grid grid-cols-7 mb-2">
          <div v-for="day in weekdays" :key="day" class="text-center text-sm font-medium text-gray-600 py-2">
            {{ day }}
          </div>
        </div>
        
        <div class="grid grid-cols-7 gap-1">
          <div 
            v-for="_ in firstDayOfMonth" 
            :key="`empty-${_}`" 
            class="h-28 sm:h-36 border border-gray-100 bg-gray-50 rounded"
          ></div>
      
          <div 
            v-for="day in daysInMonth" 
            :key="day" 
            class="min-h-28 sm:min-h-36 border rounded p-1 transition-all duration-150"
            :class="{
              'bg-amber-100 border-amber-300': isToday(day),
              'border-amber-500 border-2 ring-2 ring-amber-300 shadow-md': isSelectedDay(day),
              'border-gray-200 hover:bg-amber-50': !isToday(day) && !isSelectedDay(day),
              'cursor-pointer': true
            }"
            @click="selectDate(day)"
          >
            <div class="flex justify-between">
              <span class="text-sm font-medium"
                :class="{
                  'font-bold text-amber-600': isToday(day),
                  'text-amber-800 font-bold': isSelectedDay(day) && !isToday(day),
                  'text-gray-600': !isToday(day) && !isSelectedDay(day)
                }"
              >
                {{ day }}
              </span>

              <!-- 備註標記 -->
              <div v-if="hasNotes(day)" class="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>

            <!-- 日期內容 -->
            <div class="text-xs text-gray-600 mt-1 flex flex-col gap-0.5 break-words whitespace-normal">
              <!-- 嘔吐標記 -->
              <span v-if="hasVomit(day)" class="inline-block px-1 py-0.5 rounded bg-red-100 text-red-800 text-[10px] mb-0.5">
                嘔吐
              </span>
              
              <!-- 腹瀉標記 -->
              <span v-if="hasDiarrhea(day)" class="inline-block px-1 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] mb-0.5">
                腹瀉
              </span>
              
              <!-- 標記內容 -->
              <span v-if="getDailyTag(day)" class="inline-block px-1 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                {{ getDailyTag(day) }}
              </span>

              <!-- 體重/體溫摘要 -->
              <span v-if="getDailyWeight(day)" class="inline-block px-1 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                {{ formatWeight(getDailyWeight(day)) }}kg
              </span>
              <span v-if="getDailyTemperature(day)" :class="['inline-block px-1 py-0.5 rounded text-[10px]', temperatureBadgeClass(day)]">
                {{ formatTemperature(getDailyTemperature(day)) }}°C
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Daily Record -->
      <pet-daily-record 
        v-if="selectedDateObj" 
        :pet-id="pet.id" 
        :selected-date="selectedDateObj"
        @saved="handleRecordSaved"
      />

      <!-- Export Dialog -->
      <q-dialog
        v-model="showExportDialog"
        class="pet-export-dialog"
        maximized
        persistent
        transition-show="slide-up"
        transition-hide="slide-down"
      >
        <q-card class="bg-white">
          <q-card-section class="row items-center bg-amber-600 text-white q-py-sm">
            <div class="text-h6">資料匯出</div>
            <q-space />
            <q-btn v-close-popup icon="close" flat round dense />
          </q-card-section>

          <q-card-section class="q-px-md q-py-sm export-dialog-body">
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
              <div class="flex flex-wrap gap-2 items-center mb-2">
                <button
                  class="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                  @click="setExportQuickRange('thisMonth')"
                >
                  本月
                </button>
                <button
                  class="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                  @click="setExportQuickRange('lastMonth')"
                >
                  上個月
                </button>
                <button
                  class="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                  @click="setExportQuickRange('lastThreeMonths')"
                >
                  近三個月
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-gray-600 mb-1">開始日期</label>
                  <input
                    v-model="exportRange.start"
                    type="date"
                    class="w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 mb-1">結束日期</label>
                  <input
                    v-model="exportRange.end"
                    type="date"
                    class="w-full rounded-md border-gray-300 shadow-sm p-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
              <div class="text-sm font-medium text-gray-700 mb-2">匯出項目（可複選）</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label
                  v-for="option in exportFieldOptions"
                  :key="option.key"
                  class="flex items-center text-sm text-gray-700"
                >
                  <input
                    v-model="exportSelectedFields"
                    type="checkbox"
                    :value="option.key"
                    class="mr-2"
                  />
                  {{ option.label }}
                </label>
              </div>
            </div>

            <div class="flex items-center gap-2 mb-3">
              <button
                class="px-3 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                @click="fetchExportRecords"
                :disabled="exportLoading"
              >
                {{ exportLoading ? '查詢中...' : '查詢' }}
              </button>
              <button
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors"
                @click="exportToPdf"
                :disabled="!exportReadyToPrint"
              >
                匯出 PDF
              </button>
              <span v-if="exportReadyToPrint" class="text-xs text-gray-500">
                使用瀏覽器列印儲存為 PDF
              </span>
            </div>

            <div v-if="exportHasSearched" ref="exportPrintAreaRef" class="export-print-area">
              <div v-if="!exportHasResults" class="text-center text-gray-500 text-sm py-6">
                該日期區間沒有可顯示的資料
              </div>

              <div v-else class="space-y-6">
                <div
                  v-for="month in exportMonths"
                  :key="month.key"
                  class="export-month bg-white rounded-lg border border-gray-200 p-2"
                >
                  <div class="flex justify-between items-center mb-2">
                    <h3 class="text-base font-semibold text-gray-800">
                      {{ month.year }}年 {{ month.month + 1 }}月
                    </h3>
                    <span class="text-xs text-gray-500">
                      {{ exportRange.start }} ~ {{ exportRange.end }}
                    </span>
                  </div>

                  <div class="grid grid-cols-7 mb-2">
                    <div v-for="day in weekdays" :key="day" class="text-center text-xs font-medium text-gray-500 py-1">
                      {{ day }}
                    </div>
                  </div>

                  <div class="grid grid-cols-7 gap-1">
                    <div
                      v-for="_ in month.firstDayOfMonth"
                      :key="`empty-${month.key}-${_}`"
                      class="h-24 sm:h-28 border border-gray-100 bg-gray-50 rounded"
                    ></div>

                    <div
                      v-for="day in month.daysInMonth"
                      :key="`day-${month.key}-${day}`"
                      class="min-h-24 sm:min-h-28 border rounded p-1"
                      :class="{
                        'bg-gray-50 text-gray-300': !isExportDateInRange(month.year, month.month, day),
                        'border-gray-200': isExportDateInRange(month.year, month.month, day)
                      }"
                    >
                      <div class="flex justify-between">
                        <span class="text-xs font-medium">
                          {{ day }}
                        </span>
                      </div>

                      <div
                        v-if="isExportDateInRange(month.year, month.month, day)"
                        class="text-[10px] text-gray-700 mt-1 flex flex-col gap-0.5 break-words whitespace-normal"
                      >
                        <template v-for="fieldKey in exportSelectedFields" :key="`${month.key}-${day}-${fieldKey}`">
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
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>
      
      <!-- Chart Dialog -->
      <pet-data-chart-dialog
        v-model="showDataChart"
        :pet-id="pet.id"
        :family-id="userStore.family.id"
        title="健康記錄分析"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePetStore } from 'src/stores/petStore';
import { useUserStore } from 'src/stores/userStore';
import { notification } from 'src/boot/notification';
import PetDailyRecord from 'src/components/PetDailyRecord.vue';
import PetDataChartDialog from 'src/components/PetDataChartDialog.vue';
import { db, collection, query, where, getDocs, doc, getDoc } from 'src/boot/firebase';
import { orderBy } from 'firebase/firestore';
import { cacheGet, cacheSet } from 'src/utils/idbCache';
import { loadAppSnapshot, updateLastViewedPet } from 'src/services/appSnapshotService';

const route = useRoute();
const router = useRouter();
const petStore = usePetStore();
const userStore = useUserStore();

// Pet State
const pet = ref(null);
const loading = ref(true);
const defaultImage = 'https://via.placeholder.com/200x150?text=No+Image';

// Calendar State
const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay();
});

// 新增狀態
const selectedDay = ref(null);
const selectedDateObj = ref(null);
const dailyRecords = reactive({});
const showDataChart = ref(false);
const fetchRecordsSeq = ref(0);
const showExportDialog = ref(false);
const exportRange = reactive({ start: '', end: '' });
const exportSelectedFields = ref([]);
const exportLoading = ref(false);
const exportHasSearched = ref(false);
const exportRecords = reactive({});
const exportPrintAreaRef = ref(null);

const exportFieldOptions = [
  { key: 'foodAmount', label: '乾糧攝取量', unit: 'g', type: 'number' },
  { key: 'wetFoodAmount', label: '濕食攝取量', unit: '/10', type: 'number' },
  { key: 'dailyWeight', label: '體重', unit: 'kg', type: 'number' },
  { key: 'temperature', label: '體溫', unit: '°C', type: 'number' },
  { key: 'hasVomit', label: '是否嘔吐', type: 'boolean' },
  { key: 'hasDiarrhea', label: '是否腹瀉', type: 'boolean' },
  { key: 'heartRate', label: '心跳', unit: '次/分', type: 'number' },
  { key: 'respirationRate', label: '呼吸', unit: '次/分', type: 'number' }
];

const monthKey = computed(() => {
  return `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`;
});

// Go Back
const goBack = () => {
  router.push('/');
};

const goToFiles = () => {
  if (!pet.value?.id) return;
  router.push({ name: 'pet-files', params: { id: pet.value.id } });
};

const openExportDialog = () => {
  showExportDialog.value = true;
  if (!exportRange.start || !exportRange.end) {
    setExportQuickRange('thisMonth');
  }
};

// 
const previousMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
};

// 
const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
};

// Is Today
const isToday = (day) => {
  const d = new Date();
  return day === d.getDate() && 
    currentMonth.value === d.getMonth() && 
    currentYear.value === d.getFullYear();
};

const isSelectedDay = (day) => {
  return selectedDay.value === day && 
    currentMonth.value === selectedDateObj.value?.getMonth() && 
    currentYear.value === selectedDateObj.value?.getFullYear();
};

// YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getDailyTag = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  const record = dailyRecords[dateKey];
  if (!record) return null;
  
  if (record.tags && record.tags.length > 0) {
    // Show first tag and maybe indicator if more? 
    // For small calendar cell, maybe just first tag is enough or join with comma if short
    // But space is limited. Let's return first tag for now or "Tag(N)"
    // Or return joined string if space permits.
    // Let's assume badges style.
    // If I return an array, the template needs to handle it.
    // The current template expects a string: {{ getDailyTag(day) }}
    // So I'll join them.
    return record.tags[0] + (record.tags.length > 1 ? '+' : '');
  }
  return record.tag || null;
};

const getDailyWeight = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.dailyWeight || null;
};

const getDailyTemperature = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.temperature || null;
};

// 依體溫設定體溫徽章底色：>39 紅，38~39 藍，<38 綠
const temperatureBadgeClass = (day) => {
  const t = getDailyTemperature(day);
  if (t === null || t === undefined) return 'bg-gray-100 text-gray-700';
  if (t > 39) return 'bg-red-100 text-red-800';
  if (t >= 38 && t <= 39) return 'bg-blue-100 text-blue-800';
  return 'bg-green-100 text-green-800';
};

// 顯示用格式化
const formatWeight = (w) => {
  if (w === null || w === undefined) return '';
  return Number(w).toFixed(2);
};

const formatTemperature = (t) => {
  if (t === null || t === undefined) return '';
  return Number(t).toFixed(1);
};

const formatNumber = (v, decimals = 0) => {
  if (v === null || v === undefined) return '';
  return Number(v).toFixed(decimals);
};

// check if has notes
const hasNotes = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.hasNotes || false;
};

// check if has vomit
const hasVomit = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.hasVomit || false;
};

// check if has diarrhea
const hasDiarrhea = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.hasDiarrhea || false;
};

// select date
const selectDate = (day) => {
  selectedDay.value = day;
  selectedDateObj.value = new Date(currentYear.value, currentMonth.value, day);
  
  setTimeout(() => {
    const recordElement = document.querySelector('.pet-daily-record');
    if (recordElement) {
      recordElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
};

// handle record saved
const handleRecordSaved = async (data) => {
  const dateKey = formatDate(data.date);
  
  // update daily records
  dailyRecords[dateKey] = { 
    hasRecord: true,
    tag: data.tag, // Keep for backward compat
    tags: data.tags || [],
    hasNotes: data.hasNotes,
    hasVomit: data.hasVomit,
    hasDiarrhea: data.hasDiarrhea,
    dailyWeight: data.dailyWeight || null,
    temperature: data.temperature || null
  };
  
  // Update pet weight
  if (data.weightUpdated) {
    await refreshPetData();
  }
};

// refresh pet data
const refreshPetData = async () => {
  try {
    const petId = route.params.id;
    const foundPet = await petStore.getPetById(petId, true);
    
    if (foundPet) {
      pet.value = foundPet;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const exportRangeValid = computed(() => {
  if (!exportRange.start || !exportRange.end) return false;
  return exportRange.start <= exportRange.end;
});

const exportHasResults = computed(() => Object.keys(exportRecords).length > 0);

const exportReadyToPrint = computed(() => {
  return exportHasSearched.value && exportSelectedFields.value.length > 0;
});

const setExportQuickRange = (type) => {
  const today = new Date();
  if (type === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    exportRange.start = formatDate(start);
    exportRange.end = formatDate(end);
    return;
  }
  if (type === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    exportRange.start = formatDate(start);
    exportRange.end = formatDate(end);
    return;
  }
  if (type === 'lastThreeMonths') {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    exportRange.start = formatDate(start);
    exportRange.end = formatDate(end);
  }
};

const clearExportRecords = () => {
  Object.keys(exportRecords).forEach(key => delete exportRecords[key]);
};

const normalizeExportRecord = (recordData) => {
  return {
    date: recordData.date || null,
    foodAmount: recordData.foodAmount ?? null,
    wetFoodAmount: recordData.wetFoodAmount ?? null,
    dailyWeight: recordData.dailyWeight ?? null,
    temperature: recordData.temperature ?? null,
    hasVomit: !!recordData.hasVomit,
    hasDiarrhea: !!recordData.hasDiarrhea,
    heartRate: recordData.heartRate ?? null,
    respirationRate: recordData.respirationRate ?? null
  };
};

const getDateRangeKeys = (startStr, endStr) => {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const fetchExportRecords = async () => {
  if (!pet.value || !userStore.hasFamily) return;
  if (!exportRangeValid.value) {
    notification.error('請先選擇日期區間');
    return;
  }
  if (exportSelectedFields.value.length === 0) {
    notification.error('請至少選擇一個匯出項目');
    return;
  }

  exportLoading.value = true;
  exportHasSearched.value = true;
  clearExportRecords();

  try {
    const startDate = exportRange.start;
    const endDate = exportRange.end;

    try {
      const rangeQuery = query(
        collection(db, 'petDailyRecords'),
        where('petId', '==', pet.value.id),
        where('familyId', '==', userStore.family.id),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(rangeQuery);
      querySnapshot.forEach((d) => {
        const recordData = d.data();
        if (!recordData?.date) return;
        exportRecords[recordData.date] = normalizeExportRecord(recordData);
      });
      return;
    } catch (error) {
      console.warn('Range query failed, falling back to per-day getDoc:', error);
    }

    const dateKeys = getDateRangeKeys(startDate, endDate);
    const reads = dateKeys.map((dateKey) => {
      const recordId = `${pet.value.id}_${dateKey}`;
      const recordRef = doc(db, 'petDailyRecords', recordId);
      return getDoc(recordRef).then((snap) => {
        if (!snap.exists()) return;
        const recordData = snap.data();
        if (!recordData?.date) return;
        exportRecords[recordData.date] = normalizeExportRecord(recordData);
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
  const start = new Date(exportRange.start);
  const end = new Date(exportRange.end);
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      year,
      month,
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      firstDayOfMonth: new Date(year, month, 1).getDay()
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

const getExportDateKey = (year, month, day) => {
  return formatDateKey(year, month, day);
};

const getExportFieldDisplay = (dateKey, fieldKey) => {
  const record = exportRecords[dateKey];
  if (!record) return null;

  switch (fieldKey) {
    case 'foodAmount':
      return record.foodAmount === null ? null : `${formatNumber(record.foodAmount, 0)} g`;
    case 'wetFoodAmount':
      return record.wetFoodAmount === null ? null : `${formatNumber(record.wetFoodAmount, 0)}/10`;
    case 'dailyWeight':
      return record.dailyWeight === null ? null : `${formatWeight(record.dailyWeight)} kg`;
    case 'temperature':
      return record.temperature === null ? null : `${formatTemperature(record.temperature)} °C`;
    case 'hasVomit':
      return record.hasVomit ? '嘔吐' : null;
    case 'hasDiarrhea':
      return record.hasDiarrhea ? '腹瀉' : null;
    case 'heartRate':
      return record.heartRate === null ? null : `${formatNumber(record.heartRate, 0)} 次/分`;
    case 'respirationRate':
      return record.respirationRate === null ? null : `${formatNumber(record.respirationRate, 0)} 次/分`;
    default:
      return null;
  }
};

const getExportFieldClass = (fieldKey) => {
  const base = 'inline-block px-1 py-0.5 rounded text-[10px]';
  if (fieldKey === 'hasVomit' || fieldKey === 'hasDiarrhea') {
    return `${base} bg-red-100 text-red-700 font-semibold`;
  }
  return `${base} bg-amber-50 text-amber-800`;
};

const exportToPdf = () => {
  if (!exportReadyToPrint.value) {
    notification.error('請先完成查詢並選擇匯出項目');
    return;
  }
  if (!exportPrintAreaRef.value) {
    notification.error('找不到匯出內容');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notification.error('無法開啟列印視窗，請允許彈出視窗');
    return;
  }

  const headHtml = document.head.innerHTML || '';
  const bodyHtml = exportPrintAreaRef.value.outerHTML;
  const titleText = `資料匯出-${pet.value?.name || ''}`;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${titleText}</title>
        ${headHtml}
        <style>
          @media print {
            body { margin: 0; }
            .export-toolbar { display: none !important; }
            .export-month { page-break-inside: avoid; }
          }
          body { background: #fff; }
          .export-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
            color: #4b5563;
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 10;
          }
          .export-toolbar button {
            background: #f59e0b;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
          }
          .export-print-area { max-width: 100%; padding: 12px; }
        </style>
      </head>
      <body>
        <div class="export-toolbar">
          <span>列印完成後可點擊「關閉」返回</span>
          <button type="button" onclick="window.close()">關閉</button>
        </div>
        ${bodyHtml}
        ${'<scr' + 'ipt>'}
          (function () {
            var closed = false;
            function tryClose() {
              if (closed) return;
              closed = true;
              try { window.close(); } catch (e) {}
            }
            window.addEventListener('afterprint', function () {
              setTimeout(tryClose, 200);
            });
            // 如果 afterprint 沒觸發，給 20 秒保底自動關閉
            setTimeout(tryClose, 20000);
          })();
        ${'</scr' + 'ipt>'}
      </body>
    </html>`);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
};

const updateAppSnapshotWithRecords = () => {
  if (!pet.value || !userStore.hasFamily) return;
  const recordsPlain = {};
  Object.keys(dailyRecords).forEach(k => { recordsPlain[k] = dailyRecords[k]; });
  petStore.lastViewedPetForSnapshot = { petId: pet.value.id, monthKey: monthKey.value, dailyRecords: recordsPlain, pet: { ...pet.value } };
  void updateLastViewedPet(pet.value.id, monthKey.value, recordsPlain, { ...pet.value });
};

// fetch pet daily records
const fetchPetDailyRecords = async () => {
  if (!pet.value || !userStore.hasFamily) return;
  
  try {
    const seq = ++fetchRecordsSeq.value;
    const expectedMonthKey = monthKey.value;
    const cacheKey = `petDailySummary:${userStore.family.id}:${pet.value.id}:${monthKey.value}`;

    // 先用快取秒顯示
    const cached = await cacheGet(cacheKey, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 });
    const hadCached = !!(cached && typeof cached === 'object');
    if (cached && typeof cached === 'object') {
      // 若已經切到別的月份/有新請求，這次就不要動 UI
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
      Object.entries(cached).forEach(([date, summary]) => {
        dailyRecords[date] = summary;
      });
      updateAppSnapshotWithRecords();
    }

    const monthStart = `${monthKey.value}-01`;
    const monthEnd = formatDate(new Date(currentYear.value, currentMonth.value + 1, 0));

    const summaryForCache = {};

    // 1) 優先嘗試「當月區間」查詢（最快、最少讀取）
    try {
      const petRecordsQuery = query(
        collection(db, 'petDailyRecords'),
        where('petId', '==', pet.value.id),
        where('familyId', '==', userStore.family.id),
        where('date', '>=', monthStart),
        where('date', '<=', monthEnd),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(petRecordsQuery);
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);

      querySnapshot.forEach((d) => {
        const recordData = d.data();
        if (!recordData?.date) return;

        let tags = recordData.tags || [];
        if (!tags.length && recordData.tag) tags = [recordData.tag];

        const summary = {
          hasRecord: true,
          tag: recordData.tag || null,
          tags: tags,
          hasNotes: !!recordData.notes,
          hasVomit: recordData.hasVomit || false,
          hasDiarrhea: recordData.hasDiarrhea || false,
          dailyWeight: recordData.dailyWeight || null,
          temperature: recordData.temperature || null
        };

        dailyRecords[recordData.date] = summary;
        summaryForCache[recordData.date] = summary;
      });

      void cacheSet(cacheKey, summaryForCache);
      updateAppSnapshotWithRecords();
      return;
    } catch (e) {
      console.warn('Monthly query failed, falling back to per-day getDoc:', e);
    }

    // 2) 若缺 index：用 recordId 逐日 getDoc（最多 31 次，通常比全量 query 快很多）
    const days = new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
    const reads = [];
    const tempRecords = {};

    for (let day = 1; day <= days; day++) {
      const dateString = formatDateKey(currentYear.value, currentMonth.value, day);
      const recordId = `${pet.value.id}_${dateString}`;
      const recordRef = doc(db, 'petDailyRecords', recordId);
      reads.push(
        getDoc(recordRef).then((snap) => {
          if (!snap.exists()) return;
          const recordData = snap.data();
          if (!recordData?.date) return;
          let tags = recordData.tags || [];
          if (!tags.length && recordData.tag) tags = [recordData.tag];

          const summary = {
            hasRecord: true,
            tag: recordData.tag || null,
            tags: tags,
            hasNotes: !!recordData.notes,
            hasVomit: recordData.hasVomit || false,
            hasDiarrhea: recordData.hasDiarrhea || false,
            dailyWeight: recordData.dailyWeight || null,
            temperature: recordData.temperature || null
          };

          tempRecords[recordData.date] = summary;
          summaryForCache[recordData.date] = summary;
        })
      );
    }

    await Promise.all(reads);

    const gotAny = Object.keys(tempRecords).length > 0;
    if (gotAny) {
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
      Object.entries(tempRecords).forEach(([date, summary]) => {
        dailyRecords[date] = summary;
      });
      void cacheSet(cacheKey, summaryForCache);
      updateAppSnapshotWithRecords();
    } else if (!hadCached) {
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Calculate Age
const displayAge = computed(() => {
  if (!pet.value) return '未知';
  
  if (!pet.value.birthDate) {
    return pet.value.age || '未知';
  }
  
  const birthDate = new Date(pet.value.birthDate);
  const currentDate = new Date();
  
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  
  // 調整年齡：如果今年的生日還沒到，則年齡減1
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Health Status Class
const healthStatusClass = computed(() => {
  if (!pet.value) return '';
  
  switch(pet.value.healthStatus) {
    case '健康':
      return 'bg-green-100 text-green-800';
    case '需要注意':
      return 'bg-yellow-100 text-yellow-800';
    case '生病':
      return 'bg-red-100 text-red-800';
    case '天使':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

// Fetch Pet Details
const fetchPetDetails = async () => {
  loading.value = true;
  try {
    const petId = route.params.id;

    if (userStore.loading) {
      const snapshot = await loadAppSnapshot();
      if (snapshot?.userId) {
        userStore.hydrateFromSnapshot(snapshot);
        petStore.hydrateFromSnapshot(snapshot);
        userStore.loading = false;
      }
    }

    if (!userStore.isLoggedIn) {
      await userStore.initAuth();
    }

    const foundPet = await petStore.getPetById(petId);

    if (foundPet) {
      pet.value = foundPet;
      const lv = petStore.lastViewedPetForSnapshot;
      if (lv?.petId === petId && lv?.monthKey === monthKey.value && lv?.dailyRecords) {
        Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
        Object.entries(lv.dailyRecords).forEach(([date, summary]) => {
          dailyRecords[date] = summary;
        });
      }
      loading.value = false;
      void fetchPetDailyRecords();
    } else {
      notification.error('找不到此寵物');
    }
  } catch (error) {
    console.error('Error:', error);
    notification.error(error.message || 'Can not fetch pet details');
  } finally {
    if (loading.value) loading.value = false;
  }
};

onMounted(async () => {
  await fetchPetDetails();
  
  // init date
  const today = new Date();
  if (currentMonth.value === today.getMonth() && currentYear.value === today.getFullYear()) {
    selectDate(today.getDate());
  }
});

onUnmounted(() => {
  petStore.lastViewedPetForSnapshot = null;
});

// 月份切換時重新抓取月曆摘要（會先用快取顯示）
watch(currentDate, async () => {
  if (!pet.value) return;
  selectedDay.value = null;
  selectedDateObj.value = null;
  void fetchPetDailyRecords();

  // 只有在「切回今天所在月份」時，自動選取今天並顯示資料
  const today = new Date();
  if (currentMonth.value === today.getMonth() && currentYear.value === today.getFullYear()) {
    selectDate(today.getDate());
  }
});
</script>

<style scoped>
.border-amber-500.border-2 {
  position: relative;
  z-index: 10;
  transition: all 0.2s ease;
}

@media print {
  .print-hidden {
    display: none !important;
  }

  .export-dialog-body {
    max-height: none;
    overflow: visible;
  }

  .pet-export-dialog :deep(.q-dialog__backdrop) {
    display: none !important;
  }

  .pet-export-dialog :deep(.q-dialog__inner) {
    align-items: flex-start !important;
    max-height: none !important;
    height: auto !important;
  }

  .pet-export-dialog :deep(.q-card) {
    box-shadow: none !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
  }

  .pet-export-dialog :deep(.q-card__section) {
    overflow: visible !important;
  }

  .export-print-area {
    overflow: visible !important;
  }

  .export-month {
    page-break-inside: avoid;
  }
}

.export-dialog-body {
  max-height: calc(100vh - 50px);
  overflow-y: auto;
}
</style>
