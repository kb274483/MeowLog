<template>
  <div class="pet-daily-record relative bg-white rounded-lg shadow-md p-4 mb-4">
    <div v-if="isSaving || isUploading" class="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
      <q-spinner-dots size="40px" color="amber" />
    </div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800">
        {{ selectedDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }} 記錄
      </h3>
      
      <button 
        @click="saveRecord" 
        class="px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
        :class="hasChanges && !isSaving ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-300 cursor-not-allowed'"
        :disabled="!hasChanges || isSaving"
      >
        <span v-if="!isSaving">儲存</span>
        <span v-else>儲存中...</span>
      </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <!-- 標記 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <q-icon name="label" size="16px" class="mr-1" />
          標記 (可複選)
        </label>
        <q-select 
          v-model="formData.tags" 
          multiple
          :options="['回診', '疫苗', '驅蟲', '洗澡', '美容', '其他']"
          dense
          outlined
          use-chips
          class="w-full"
        />
      </div>
      
      <div class="grid grid-cols-1 gap-4 mb-2">
        <!-- 飲食記錄區塊 -->
        <div class="bg-amber-50 p-3 rounded-lg border border-amber-100">
          <p class="text-sm font-medium text-amber-800 mb-2 flex items-center">
            <q-icon name="restaurant" size="16px" class="mr-1" />
            飲食記錄
          </p>
          
          <!-- 濕食攝取量 -->
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              濕食攝取量 - {{ formData.wetFoodAmount }}/10
            </label>
            <div class="flex items-center">
              <span class="text-xs text-gray-500 mr-2">0</span>
              <input 
                type="range" 
                v-model.number="formData.wetFoodAmount" 
                min="0" 
                max="10" 
                step="1"
                class="w-full accent-amber-600"
              />
              <span class="text-xs text-gray-500 ml-2">10</span>
            </div>
          </div>

          <!-- 乾糧攝取量 -->
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              乾糧攝取量 (g)
            </label>
            <input 
              v-model.number="formData.foodAmount" 
              type="number" 
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2 text-sm"
            />
          </div>

          <!-- 熱量攝取量 -->
          <div class="bg-white p-2 rounded border border-amber-200 flex justify-between items-center">
            <span class="text-xs text-gray-600">總熱量攝取</span>
            <span class="text-sm font-bold text-amber-700">{{ calculatedCalories }} kcal</span>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <!-- 嘔吐 -->
        <div>
          <div class="flex items-center mb-1">
            <label class="block text-sm font-medium text-gray-700 mr-3">
              <q-icon name="sick" size="16px" class="mr-1" />
              是否嘔吐
            </label>
            <q-toggle v-model="formData.hasVomit" color="amber" />
          </div>
          
          <input 
            v-if="formData.hasVomit"
            v-model.number="formData.vomitCount" 
            type="number" 
            min="1"
            placeholder="嘔吐次數"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
        
        <!-- 腹瀉 -->
        <div>
          <div class="flex items-center mb-1">
            <label class="block text-sm font-medium text-gray-700 mr-3">
              <q-icon name="wc" size="16px" class="mr-1" />
              是否腹瀉
            </label>
            <q-toggle v-model="formData.hasDiarrhea" color="amber" />
          </div>
          
          <input 
            v-if="formData.hasDiarrhea"
            v-model.number="formData.diarrheaCount" 
            type="number" 
            min="1"
            placeholder="腹瀉次數"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-2">
        <!-- 呼吸次數 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <span class="material-symbols-outlined text-lg text-gray-700 font-bold">
              pulmonology
            </span>
            呼吸次數 (次/分)
          </label>
          <input 
            v-model.number="formData.respirationRate" 
            type="number" 
            min="0"
            placeholder="正常值: 20-35"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
        
        <!-- 心跳次數（新增） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <span class="material-symbols-outlined text-lg text-gray-700 font-bold">
              cardiology
            </span>
            心跳次數 (次/分)
          </label>
          <input 
            v-model.number="formData.heartRate" 
            type="number" 
            min="0"
            placeholder="正常值: 120-180"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <!-- 新增每日體重欄位 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <q-icon name="monitor_weight" size="16px" class="mr-1" />
            體重 (kg)
          </label>
          <div class="flex">
            <input 
              v-model.number="formData.dailyWeight" 
              type="number" 
              min="0" 
              step="0.01"
              placeholder="Kg"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
            />
          </div>
        </div>
  
        <!-- 體溫 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <q-icon name="device_thermostat" size="16px" class="mr-1" />
            體溫 (°C)
          </label>
          <div class="flex">
            <input 
              v-model.number="formData.temperature" 
              type="number" 
              min="0" 
              step="0.1"
              placeholder="°C"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 備註 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">
        <q-icon name="note_alt" size="16px" class="mr-1" />
        備註
      </label>
      <textarea 
        v-model="formData.notes" 
        rows="3" 
        class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
      ></textarea>
    </div>
    
    <!-- 使用新的媒體上傳元件 -->
    <media-uploader
      v-model="formData.mediaFiles"
      :is-uploading="isUploading"
      :upload-progress="uploadProgress"
      @file-change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { 
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'src/boot/firebase';
import { notification } from 'src/boot/notification';
import { useUserStore } from 'src/stores/userStore';
import MediaUploader from 'src/components/MediaUploader.vue';
import { uploadMediaFiles, getCleanMediaFiles } from 'src/services/mediaUploadService';
import { cacheGet, cacheSet } from 'src/utils/idbCache';

const props = defineProps({
  petId: {
    type: String,
    required: true
  },
  selectedDate: {
    type: Date,
    required: true
  }
});

const emit = defineEmits(['saved']);

const userStore = useUserStore();
const isUploading = ref(false);
const isSaving = ref(false);
const uploadProgress = ref(0);
const originalData = ref(null);
const currentRecordId = ref(null);
const loadSeq = ref(0);

// Form data
const formData = reactive({
  tags: [],
  foodAmount: null, // Dry food amount (g)
  wetFoodAmount: 0, // 0-10
  calories: null, // Stored calories from DB (historical truth)
  hasVomit: false,
  vomitCount: null,
  hasDiarrhea: false,
  diarrheaCount: null,
  dailyWeight: null,
  respirationRate: null,
  heartRate: null,
  temperature: null,
  notes: '',
  mediaFiles: []
});

// Calculate calories based on CURRENT family settings (for live edits)
const caloriesFromInputs = computed(() => {
  if (!userStore.family) return 0;
  
  const wetCalsPerUnit = userStore.family.wetFoodCalories || 0;
  const dryCalsPerGram = userStore.family.dryFoodCalories || 0;
  
  const wetCals = (formData.wetFoodAmount / 10) * wetCalsPerUnit;
  const dryCals = (formData.foodAmount || 0) * dryCalsPerGram;
  
  return Math.round(wetCals + dryCals);
});

// When DB has calories, prefer it unless the user changed intake amounts for the day
const shouldUseStoredCalories = computed(() => {
  if (!originalData.value) return false;
  const hasStoredCalories = formData.calories !== null && formData.calories !== undefined;
  if (!hasStoredCalories) return false;

  const inputsUnchanged =
    formData.foodAmount === originalData.value.foodAmount &&
    formData.wetFoodAmount === originalData.value.wetFoodAmount;

  return inputsUnchanged;
});

// Calories shown in UI / saved to DB
const calculatedCalories = computed(() => {
  if (shouldUseStoredCalories.value) {
    return Number(formData.calories) || 0;
  }
  return caloriesFromInputs.value;
});

// Detect changes by comparing with original data
const hasChanges = computed(() => {
  if (!originalData.value) return false;
  
  // Simple comparison of important fields
  return JSON.stringify({
    tags: formData.tags,
    foodAmount: formData.foodAmount,
    wetFoodAmount: formData.wetFoodAmount,
    hasVomit: formData.hasVomit,
    vomitCount: formData.vomitCount,
    hasDiarrhea: formData.hasDiarrhea,
    diarrheaCount: formData.diarrheaCount,
    dailyWeight: formData.dailyWeight,
    respirationRate: formData.respirationRate,
    heartRate: formData.heartRate,
    temperature: formData.temperature,
    notes: formData.notes,
    mediaFilesCount: formData.mediaFiles.length
  }) !== JSON.stringify({
    tags: originalData.value.tags,
    foodAmount: originalData.value.foodAmount,
    wetFoodAmount: originalData.value.wetFoodAmount,
    hasVomit: originalData.value.hasVomit,
    vomitCount: originalData.value.vomitCount,
    hasDiarrhea: originalData.value.hasDiarrhea,
    diarrheaCount: originalData.value.diarrheaCount,
    dailyWeight: originalData.value.dailyWeight,
    respirationRate: originalData.value.respirationRate,
    heartRate: originalData.value.heartRate,
    temperature: originalData.value.temperature,
    notes: originalData.value.notes,
    mediaFilesCount: originalData.value.mediaFiles.length
  });
});

// Listen for date changes to load new data
watch(() => props.selectedDate, (newDate) => {
  loadDailyRecord(newDate);
}, { immediate: false });

// Load record data when component mounts
onMounted(() => {
  loadDailyRecord(props.selectedDate);
});

// Load daily record from Firestore
const loadDailyRecord = async (date) => {
  if (!userStore.isLoggedIn || !userStore.hasFamily || !props.petId) return;
  
  try {
    const seq = ++loadSeq.value;
    // Format date as YYYY-MM-DD for record ID
    const dateString = formatDate(date);
    const recordId = `${props.petId}_${dateString}`;
    currentRecordId.value = recordId;

    const cacheKey = `petDailyRecord:${userStore.family.id}:${recordId}`;
    
    // Default values
    const defaultData = {
      tags: [],
      foodAmount: null,
      wetFoodAmount: 0,
      calories: null,
      hasVomit: false,
      vomitCount: null,
      hasDiarrhea: false,
      diarrheaCount: null,
      dailyWeight: null,
      respirationRate: null,
      heartRate: null,
      temperature: null,
      notes: '',
      mediaFiles: [],
    };

    // Cache-first：先用快取秒顯示，再抓 Firestore 更新最新
    const cached = await cacheGet(cacheKey, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 });
    if (cached && typeof cached === 'object') {
      Object.assign(formData, {
        ...defaultData,
        ...cached,
        mediaFiles: (cached.mediaFiles || []).map(file => ({
          ...file,
          loading: false,
          loadError: false
        }))
      });
      originalData.value = JSON.parse(JSON.stringify(formData));
    }

    const recordRef = doc(db, 'petDailyRecords', recordId);
    const recordDoc = await getDoc(recordRef);
    
    if (recordDoc.exists()) {
      // Load existing data
      const recordData = recordDoc.data();
      
      // Migration: Handle old tag field
      if (recordData.tag && !recordData.tags) {
        recordData.tags = [recordData.tag];
      } else if (!recordData.tags) {
        recordData.tags = [];
      }
      
      // Process media files data, ensure each file has correct type flags
      const mediaFiles = (recordData.mediaFiles || []).map(file => ({
        ...file,
        loading: false,
        loadError: false
      }));
      
      // Set form data
      // 若使用者已開始編輯，不用網路資料覆蓋
      if (seq === loadSeq.value && currentRecordId.value === recordId && !hasChanges.value) {
        Object.assign(formData, {
          ...defaultData,
          ...recordData,
          mediaFiles
        });
        // Save original data for change detection
        originalData.value = JSON.parse(JSON.stringify(formData));
      }

      // Cache a sanitized shape (avoid Firestore Timestamp in cache)
      const {...cacheSafeData } = recordData || {};
      void cacheSet(cacheKey, {
        ...cacheSafeData,
        mediaFiles: (recordData.mediaFiles || []).map(file => ({
          url: file?.url || null,
          type: file?.type || 'image',
          name: file?.name || 'file',
          timestamp: file?.timestamp || Date.now()
        })).filter(f => !!f.url)
      });
    } else {
      // Set to default values
      if (seq === loadSeq.value && !cached) {
        Object.assign(formData, defaultData);
        originalData.value = JSON.parse(JSON.stringify(defaultData));
      }
    }
  } catch (error) {
    console.error('Failed to load daily record:', error);
    // 若已有快取顯示，離線/錯誤就先不干擾使用者
    if (!originalData.value) {
      notification.error('載入日期記錄失敗');
    }
  }
};

// Format date as YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Save record with uploaded media
const saveRecord = async () => {
  if (!userStore.isLoggedIn || !userStore.hasFamily || !props.petId) {
    notification.error('未登入或無家庭資訊');
    return;
  }
  
  try {
    isSaving.value = true;
    // Check if there are new files to upload
    const hasNewFiles = formData.mediaFiles.some(file => file.isNew);
    
    // Set upload status
    isUploading.value = hasNewFiles;
    uploadProgress.value = 0;
    
    // If there are new files, add a delay to ensure UI updates
    if (hasNewFiles) {
      // Lock page scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Format date for record ID and storage path
    const dateString = formatDate(props.selectedDate);
    const recordId = `${props.petId}_${dateString}`;
    
    const uploadOptions = {
      familyId: userStore.family.id,
      petId: props.petId,
      dateString: dateString
    };
    
    // Update progress via callback
    const handleProgress = (progress) => {
      uploadProgress.value = progress;
    };
    
    // Upload media files
    let updatedMediaFiles = [...formData.mediaFiles];
    if (hasNewFiles) {
      try {
        updatedMediaFiles = await uploadMediaFiles(
          formData.mediaFiles, 
          uploadOptions, 
          handleProgress
        );
      } catch (uploadError) {
        console.error('媒體上傳失敗:', uploadError);
        notification.error('部分媒體文件上傳失敗，但記錄仍會儲存');
        // 繼續執行，但標記上傳失敗的文件
        updatedMediaFiles = formData.mediaFiles.map(file => {
          if (file.isNew) {
            return { ...file, loadError: true };
          }
          return file;
        });
      }
    }
    
    // Update form data
    formData.mediaFiles = updatedMediaFiles;
    
    // 處理媒體文件，確保無 undefined 值
    let cleanMediaFiles = [];
    try {
      cleanMediaFiles = getCleanMediaFiles(formData.mediaFiles);
    } catch (cleanError) {
      console.error('清理媒體文件失敗:', cleanError);
      // 手動清理媒體文件數據
      cleanMediaFiles = formData.mediaFiles.map(file => {
        // 只保留必要字段，並確保沒有 undefined 值
        const cleanFile = {
          url: file.url || null,
          type: file.type || 'image',
          name: file.name || 'file',
          timestamp: file.timestamp || Date.now()
        };
        return cleanFile;
      }).filter(file => file.url); // 過濾掉沒有 URL 的文件
    }
    
    // 準備記錄數據，確保所有字段都不為 undefined
    const recordData = {
      petId: props.petId,
      familyId: userStore.family.id,
      date: dateString,
      tags: formData.tags || [],
      // Deprecated: tag
      tag: formData.tags.length > 0 ? formData.tags[0] : null, 
      foodAmount: formData.foodAmount || null,
      wetFoodAmount: formData.wetFoodAmount || 0,
      calories: calculatedCalories.value,
      hasVomit: formData.hasVomit || false,
      vomitCount: formData.hasVomit ? (formData.vomitCount || 1) : null,
      hasDiarrhea: formData.hasDiarrhea || false,
      diarrheaCount: formData.hasDiarrhea ? (formData.diarrheaCount || 1) : null,
      dailyWeight: formData.dailyWeight || null,
      respirationRate: formData.respirationRate || null,
      heartRate: formData.heartRate || null,
      temperature: formData.temperature || null,
      notes: formData.notes || null,
      mediaFiles: cleanMediaFiles || [],
      updatedAt: serverTimestamp(),
      updatedBy: userStore.user.uid
    };
    
    // 最後檢查，確保沒有 undefined 值
    Object.keys(recordData).forEach(key => {
      if (recordData[key] === undefined) {
        recordData[key] = null;
      }
    });
    
    // Save to Firestore
    await setDoc(doc(db, 'petDailyRecords', recordId), recordData);

    // Update IndexedDB cache (fast switching / reopen)
    const cacheKey = `petDailyRecord:${userStore.family.id}:${recordId}`;
    const {...cacheSafeData } = recordData || {};
    void cacheSet(cacheKey, {
      ...cacheSafeData,
      mediaFiles: (cleanMediaFiles || []).map(file => ({
        url: file?.url || null,
        type: file?.type || 'image',
        name: file?.name || 'file',
        timestamp: file?.timestamp || Date.now()
      })).filter(f => !!f.url)
    });

    // Strong consistency: also update the monthly calendar summary cache immediately
    // so the calendar badges match the saved record without waiting for background refresh.
    try {
      const ym = String(dateString || '').slice(0, 7); // YYYY-MM
      const summaryKey = `petDailySummary:${userStore.family.id}:${props.petId}:${ym}`;
      const existing = (await cacheGet(summaryKey, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 })) || {};

      const tags = recordData.tags || (recordData.tag ? [recordData.tag] : []);
      const summary = {
        hasRecord: true,
        tag: recordData.tag || null,
        tags,
        hasNotes: !!recordData.notes,
        hasVomit: recordData.hasVomit || false,
        hasDiarrhea: recordData.hasDiarrhea || false,
        dailyWeight: recordData.dailyWeight || null,
        temperature: recordData.temperature || null
      };

      // merge into month map (keyed by YYYY-MM-DD)
      const merged = { ...(existing && typeof existing === 'object' ? existing : {}) };
      merged[dateString] = summary;
      void cacheSet(summaryKey, merged);
    } catch {
      // best-effort; do not block save UX
    }
    // Keep local state consistent with what we saved (prevents reverting to old calories)
    formData.calories = recordData.calories;
    originalData.value = JSON.parse(JSON.stringify(formData));
    
    // Update pet weight if filled
    if (formData.dailyWeight) {
      await updatePetWeight(formData.dailyWeight);
    }
    
    if (formData.mediaFiles.some(file => file.loadError)) {
      notification.warning('記錄已儲存，但部分媒體文件上傳失敗');
    } else {
      notification.success('記錄已儲存');
    }
    emit('saved', {
      date: props.selectedDate,
      hasRecord: true,
      tags: formData.tags || [],
      tag: formData.tags.length > 0 ? formData.tags[0] : null, // backward compatibility
      hasNotes: !!formData.notes,
      hasVomit: formData.hasVomit,
      hasDiarrhea: formData.hasDiarrhea,
      weightUpdated: !!formData.dailyWeight,
      dailyWeight: formData.dailyWeight || null,
      temperature: formData.temperature || null
    });
    
  } catch (error) {
    console.error('儲存記錄失敗:', error);
    notification.error('儲存記錄失敗: ' + (error.message || '未知錯誤'));
  } finally {
    setTimeout(() => {
      isUploading.value = false;
      uploadProgress.value = 0;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      isSaving.value = false;
    }, 500);
  }
};

// Update pet weight function
const updatePetWeight = async (weight) => {
  try {
    // Get pet data reference
    const petRef = doc(db, 'pets', props.petId);
    
    // Use update operation, only update weight field
    await updateDoc(petRef, {
      weight: weight,
      weightUpdatedAt: serverTimestamp()
    });
    
    console.log('寵物體重已更新:', weight);
  } catch (error) {
    console.error('更新寵物體重失敗:', error);
  }
};

// 在 PetDailyRecord.vue 中添加 handleFileChange 函數（如果尚未存在）
const handleFileChange = (newFiles) => {
  console.log('收到新文件:', newFiles);
  
  // 如果需要進行額外處理，可以在這裡添加
  // 例如，檢查文件大小、限制上傳數量等
  
  // 這個函數主要用於除錯，實際上 v-model 已經處理了文件更新
};
</script> 