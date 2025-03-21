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
      
      <!-- 飲食次數 -->
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
      
      <!-- 飲水次數 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <q-icon name="water_full" size="16px" class="mr-1" />
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
      
      <!-- 嘔吐 -->
      <div>
        <div class="flex items-center mb-1">
          <label class="block text-sm font-medium text-gray-700 mr-3">
            <q-icon name="sentiment_stressed" size="16px" class="mr-1" />
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
      
      <!-- 新增每日體重欄位 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <q-icon name="monitor_weight" size="16px" class="mr-1" />
          當日體重 (kg)
        </label>
        <div class="flex">
          <input 
            v-model.number="formData.dailyWeight" 
            type="number" 
            min="0" 
            step="0.01"
            placeholder="可選"
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
      notes: '',
      mediaFiles: []
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
      updatedMediaFiles = await uploadMediaFiles(
        formData.mediaFiles, 
        uploadOptions, 
        handleProgress
      );
    }
    
    // Update form data
    formData.mediaFiles = updatedMediaFiles;
    const cleanMediaFiles = getCleanMediaFiles(formData.mediaFiles);
    
    // Prepare record data
    const recordData = {
      petId: props.petId,
      familyId: userStore.family.id,
      date: dateString,
      tag: formData.tag || null,
      foodCount: formData.foodCount,
      foodAmount: formData.foodAmount,
      waterCount: formData.waterCount,
      waterAmount: formData.waterAmount,
      hasVomit: formData.hasVomit,
      vomitCount: formData.hasVomit ? formData.vomitCount : null,
      dailyWeight: formData.dailyWeight,
      notes: formData.notes || null,
      mediaFiles: cleanMediaFiles,
      updatedAt: serverTimestamp(),
      updatedBy: userStore.user.uid
    };
    
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
</script> 