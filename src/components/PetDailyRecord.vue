<template>
  <div class="pet-daily-record bg-white rounded-lg shadow-md p-4 mb-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800">
        {{ selectedDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }} 記錄
      </h3>
      
      <button 
        @click="saveRecord" 
        class="px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
        :class="hasChanges ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-300 cursor-not-allowed'"
        :disabled="!hasChanges"
      >
        儲存
      </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <!-- 標記 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <q-icon name="label" size="16px" class="mr-1" />
          標記
        </label>
        <select 
          v-model="formData.tag" 
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
        >
          <option value="">無</option>
          <option value="回診">回診</option>
          <option value="疫苗">疫苗</option>
          <option value="驅蟲">驅蟲</option>
          <option value="洗澡">洗澡</option>
          <option value="美容">美容</option>
          <option value="其他">其他</option>
        </select>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">    
            <q-icon name="dining" size="16px" class="mr-1" />
            飲食次數
          </label>
          <input 
            v-model.number="formData.foodCount" 
            type="number" 
            min="0"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
        
        <!-- 總飲食量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <q-icon name="restaurant" size="16px" class="mr-1" />
            總飲食量 (g)
          </label>
          <input 
            v-model.number="formData.foodAmount" 
            type="number" 
            min="0"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
      </div>
      <!-- 飲食次數 -->
      
      <div class="grid grid-cols-2 gap-4 mb-2">
        <!-- 飲水次數 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <q-icon name="local_drink" size="16px" class="mr-1" />
            飲水次數
          </label>
          <input 
            v-model.number="formData.waterCount" 
            type="number" 
            min="0"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
        
        <!-- 總飲水量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            <q-icon name="water_drop" size="16px" class="mr-1" />
            總飲水量 (ml)
          </label>
          <input 
            v-model.number="formData.waterAmount" 
            type="number" 
            min="0"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          />
        </div>
      </div>
      
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
const uploadProgress = ref(0);
const originalData = ref(null);

// Form data
const formData = reactive({
  tag: '',
  foodCount: null,
  foodAmount: null,
  waterCount: null,
  waterAmount: null,
  hasVomit: false,
  vomitCount: null,
  dailyWeight: null,
  respirationRate: null,
  heartRate: null,
  notes: '',
  mediaFiles: []
});

// Detect changes by comparing with original data
const hasChanges = computed(() => {
  if (!originalData.value) return false;
  
  // Simple comparison of important fields
  return JSON.stringify({
    tag: formData.tag,
    foodCount: formData.foodCount,
    foodAmount: formData.foodAmount,
    waterCount: formData.waterCount,
    waterAmount: formData.waterAmount,
    hasVomit: formData.hasVomit,
    vomitCount: formData.vomitCount,
    dailyWeight: formData.dailyWeight,
    respirationRate: formData.respirationRate,
    heartRate: formData.heartRate,
    notes: formData.notes,
    mediaFilesCount: formData.mediaFiles.length
  }) !== JSON.stringify({
    tag: originalData.value.tag,
    foodCount: originalData.value.foodCount,
    foodAmount: originalData.value.foodAmount,
    waterCount: originalData.value.waterCount,
    waterAmount: originalData.value.waterAmount,
    hasVomit: originalData.value.hasVomit,
    vomitCount: originalData.value.vomitCount,
    dailyWeight: originalData.value.dailyWeight,
    respirationRate: originalData.value.respirationRate,
    heartRate: originalData.value.heartRate,
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
    // Format date as YYYY-MM-DD for record ID
    const dateString = formatDate(date);
    const recordId = `${props.petId}_${dateString}`;
    
    const recordRef = doc(db, 'petDailyRecords', recordId);
    const recordDoc = await getDoc(recordRef);
    
    // Default values
    const defaultData = {
      tag: '',
      foodCount: null,
      foodAmount: null,
      waterCount: null,
      waterAmount: null,
      hasVomit: false,
      vomitCount: null,
      dailyWeight: null,
      respirationRate: null,
      heartRate: null,
      notes: '',
      mediaFiles: [],
    };
    
    if (recordDoc.exists()) {
      // Load existing data
      const recordData = recordDoc.data();
      
      // Process media files data, ensure each file has correct type flags
      const mediaFiles = (recordData.mediaFiles || []).map(file => ({
        ...file,
        loading: false,
        loadError: false
      }));
      
      // Set form data
      Object.assign(formData, {
        ...defaultData,
        ...recordData,
        mediaFiles
      });
      
      // Save original data for change detection
      originalData.value = JSON.parse(JSON.stringify(formData));
    } else {
      // Set to default values
      Object.assign(formData, defaultData);
      originalData.value = JSON.parse(JSON.stringify(defaultData));
    }
  } catch (error) {
    console.error('Failed to load daily record:', error);
    notification.error('載入日期記錄失敗');
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
      tag: formData.tag || null,
      foodCount: formData.foodCount || null,
      foodAmount: formData.foodAmount || null,
      waterCount: formData.waterCount || null,
      waterAmount: formData.waterAmount || null,
      hasVomit: formData.hasVomit || false,
      vomitCount: formData.hasVomit ? (formData.vomitCount || 1) : null,
      dailyWeight: formData.dailyWeight || null,
      respirationRate: formData.respirationRate || null,
      heartRate: formData.heartRate || null,
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
      tag: formData.tag || null,
      hasNotes: !!formData.notes,
      hasVomit: formData.hasVomit,
      weightUpdated: !!formData.dailyWeight
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