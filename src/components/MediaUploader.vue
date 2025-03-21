<template>
  <div class="media-uploader">
    <!-- loading overlay -->
    <div 
      v-if="isUploading" 
      class="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 max-w-sm w-4/5 text-center">
        <q-spinner-dots size="60px" color="amber" class="mb-4" />
        <h3 class="text-lg font-medium text-gray-800 mb-2">還在上傳...</h3>
        <p class="text-sm text-gray-600 mb-4">請不要關閉或離開頁面</p>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="bg-amber-600 h-4 rounded-full transition-all duration-300" :style="{ width: `${uploadProgress}%` }"></div>
        </div>
        <p class="mt-2 text-amber-600 font-medium">{{ uploadProgress }}%</p>
      </div>
    </div>

    <!-- upload button -->
    <div class="flex justify-between items-center mb-2">
      <label class="block text-sm font-medium text-gray-700">
        <q-icon name="photo_library" size="16px" class="mr-1" />
        {{ label }}
      </label>
      <label class="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md transition-colors text-sm">
        <input 
          type="file" 
          ref="fileInput" 
          multiple 
          :accept="accept" 
          class="hidden" 
          @change="handleFileChange"
        />
        上傳檔案
      </label>
    </div>
    
    <!-- fullscreen preview layer -->
    <div 
      v-if="fullscreenMedia" 
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      @click="closeFullscreen"
    >
      <!-- close -->
      <button 
        class="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
        @click.stop="closeFullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <!-- fullscreen image -->
      <img 
        v-if="fullscreenMedia.type === 'image'" 
        :src="getFullscreenImageSource(fullscreenMedia)" 
        class="max-h-[90vh] max-w-[90vw] object-contain" 
        @click.stop
      />
      
      <!-- fullscreen video -->
      <video 
        v-else-if="fullscreenMedia.type === 'video'" 
        :src="fullscreenMedia.url" 
        controls 
        class="max-h-[90vh] max-w-[90vw]"
        @click.stop
        autoplay
      ></video>
      
      <!-- fullscreen loading -->
      <div v-if="fullscreenLoading" class="absolute inset-0 flex items-center justify-center">
        <q-spinner-dots size="60px" color="amber" />
      </div>
    </div>
    
    <!-- preview uploaded or existing files -->
    <div v-if="modelValue.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      <div 
        v-for="(file, index) in modelValue" 
        :key="index"
        class="relative rounded-md overflow-hidden border border-gray-200 h-24 cursor-pointer"
      >
        <!-- image preview -->
        <img 
          v-if="file.type === 'image'" 
          :src="getImageSource(file)"
          class="w-full h-full object-cover"
          alt="圖片預覽"
          @error="handleImageError(file, index)"
          @click.stop="openFullscreen(file)"
        />
        
        <!-- video preview -->
        <div 
          v-else-if="file.type === 'video'" 
          class="w-full h-full bg-gray-100 flex items-center justify-center"
          @click.stop="openFullscreen(file)"
        >
          <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span class="text-xs block truncate">{{ file.name || '影片' }}</span>
          </div>
        </div>
        
        <!-- image loading or error -->
        <div v-if="file.loadError || file.loading" class="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div v-if="file.loadError" class="text-center text-xs text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            圖片預覽失敗
          </div>
          <q-spinner-dots v-else size="24px" color="amber" />
        </div>
        
        <!-- remove -->
        <button 
          @click="removeFile(index)" 
          class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <div v-else class="border-2 border-dashed border-gray-200 rounded-md p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="mt-2 text-sm text-gray-500">尚未上傳照片或影片</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue';
import { notification } from 'src/boot/notification';

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: '照片 / 影片'
  },
  accept: {
    type: String,
    default: 'image/*,video/*'
  },
  isUploading: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:modelValue', 'file-change']);

const fileInput = ref(null);
const objectUrls = ref([]);

// fullscreen related state
const fullscreenMedia = ref(null);
const fullscreenLoading = ref(false);

// get fullscreen image source
const getFullscreenImageSource = (file) => {
  // Priority: uploaded URL > preview URL > generate URL
  if (file.url) {
    return file.url;
  } else if (file.previewUrl) {
    return file.previewUrl;
  } else if (file.file) {
    const url = URL.createObjectURL(file.file);
    objectUrls.value.push(url);
    return url;
  }
  return '';
};

// open fullscreen
const openFullscreen = (file) => {
  if (file.loadError) return; // Skip if file has load error
  
  fullscreenLoading.value = true;
  fullscreenMedia.value = file;
  
  // Prevent background scrolling
  document.body.style.overflow = 'hidden';
  
  // Preload video if it's video with URL
  if (file.type === 'video' && file.url) {
    const video = document.createElement('video');
    video.src = file.url;
    video.onloadeddata = () => {
      fullscreenLoading.value = false;
    };
    video.onerror = () => {
      fullscreenLoading.value = false;
      notification.error('Cannot load video');
    };
    
    // Set timeout to avoid infinite loading
    setTimeout(() => {
      fullscreenLoading.value = false;
    }, 5000);
  } else {
    // For images, hide loading after a short delay
    setTimeout(() => {
      fullscreenLoading.value = false;
    }, 500);
  }
};

// close fullscreen
const closeFullscreen = () => {
  fullscreenMedia.value = null;
  
  // Restore background scrolling
  document.body.style.overflow = '';
};

// improve HEIC processing logic
const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  
  // create a copy of the current file list
  const updatedFiles = [...props.modelValue];
  let heic2any;
  
  try {
    // dynamically import HEIC conversion library
    heic2any = (await import('heic2any')).default;
  } catch (error) {
    console.error('Error loading HEIC conversion library:', error);
  }
  
  for (const file of files) {
    try {
      // check if it's HEIC/HEIF format
      const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                    file.name.toLowerCase().endsWith('.heif') ||
                    file.type === 'image/heic' || 
                    file.type === 'image/heif';
      
      // add file with loading state first
      const fileIndex = updatedFiles.length;
      const initialFileState = {
        type: isHeic ? 'image' : (file.type.startsWith('image/') ? 'image' : 
                              file.type.startsWith('video/') ? 'video' : 'unknown'),
        name: file.name,
        size: file.size,
        loading: true,
        loadError: false,
        isHeic,
        isNew: true,
        // add original file reference but not make it a reactive object
        _file: file
      };
      
      updatedFiles.push(initialFileState);
      
      // immediately update model value to show loading state
      emit('update:modelValue', [...updatedFiles]);
      
      // process file in next microtask to avoid Vue reactive system issues
      await nextTick();
      
      // process HEIC file (if conversion library is available)
      if (isHeic && heic2any) {
        try {
          notification.info('處理HEIC格式圖片中，請等等...');
          
          // convert to JPEG
          const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          
          // create new File object
          const processedFile = new File(
            [blob], 
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
          
          // create preview URL
          const previewUrl = URL.createObjectURL(processedFile);
          objectUrls.value.push(previewUrl);
          
          // update file information
          const updatedFile = {
            file: processedFile,
            type: 'image',
            name: processedFile.name,
            size: processedFile.size,
            url: null,
            previewUrl,
            loading: false,
            loadError: false,
            isHeic: false,
            isNew: true,
            wasHeic: true
          };
          
          // update array using index
          updatedFiles[fileIndex] = updatedFile;
          
          notification.success('HEIC格式圖片處理成功');
        } catch (error) {
          console.error('HEIC 轉換失敗:', error);
          
          // mark as load error
          updatedFiles[fileIndex] = {
            type: 'image',
            name: file.name,
            size: file.size,
            loading: false,
            loadError: true,
            isHeic: true,
            isNew: true,
            error: '無法處理HEIC格式'
          };
          
          notification.error('無法處理HEIC格式圖片，請嘗試轉換為JPG後再上傳');
        }
      } else if (file.type.startsWith('image/')) {
        // process regular image
        const previewUrl = URL.createObjectURL(file);
        objectUrls.value.push(previewUrl);
        
        updatedFiles[fileIndex] = {
          file,
          type: 'image',
          name: file.name,
          size: file.size,
          url: null,
          previewUrl,
          loading: false,
          loadError: false,
          isNew: true
        };
      } else if (file.type.startsWith('video/')) {
        // process video
        updatedFiles[fileIndex] = {
          file,
          type: 'video',
          name: file.name,
          size: file.size,
          url: null,
          loading: false,
          loadError: false,
          isNew: true
        };
      } else {
        // unsupported format
        notification.warning(`不支援的檔案類型: ${file.type || '未知類型'}`);
        
        updatedFiles[fileIndex] = {
          type: 'unknown',
          name: file.name,
          size: file.size,
          loading: false,
          loadError: true,
          isNew: true,
          error: '不支援的檔案類型'
        };
      }
    } catch (error) {
      console.error('處理文件時發生錯誤:', error, file);
      // add a file with error state to ensure user knows there's an issue
      updatedFiles.push({
        type: 'unknown',
        name: file.name || '未知文件',
        size: file.size || 0,
        loading: false,
        loadError: true,
        isNew: true,
        error: '處理文件時出錯'
      });
    }
  }
  
  // reset file input
  fileInput.value.value = '';
  
  // update model value with new array, avoid directly modifying reactive object
  emit('update:modelValue', [...updatedFiles]);
  
  // notify parent component that files have been added
  emit('file-change', updatedFiles);
};

// improve image load error handling
const handleImageError = (file, index) => {
  console.error('圖片預覽失敗:', file);
  
  try {
    // create a new array to avoid directly modifying reactive object
    const updatedFiles = [...props.modelValue];
    
    if (updatedFiles[index]) {
      // create a new object instead of modifying the original object
      updatedFiles[index] = {
        ...updatedFiles[index],
        loadError: true
      };
      
      // replace the array completely
      emit('update:modelValue', updatedFiles);
    }
  } catch (error) {
    console.error('Error handling image:', error);
  }
};

// improve image source retrieval function
const getImageSource = (file) => {
  try {
    if (file.previewUrl) {
      return file.previewUrl;
    } else if (file.url) {
      return file.url;
    } else if (file.isNew && file.file) {
      try {
        const url = URL.createObjectURL(file.file);
        objectUrls.value.push(url);
        nextTick(() => {
          const updatedFiles = [...props.modelValue];
          const index = updatedFiles.findIndex(f => f === file);
          if (index !== -1) {
            updatedFiles[index] = { ...file, previewUrl: url };
            emit('update:modelValue', updatedFiles);
          }
        });
        return url;
      } catch (error) {
        console.error('Error:', error);
        return '';
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  return '';
};

// Remove file
const removeFile = (index) => {
  const updatedFiles = [...props.modelValue];
  updatedFiles.splice(index, 1);
  emit('update:modelValue', updatedFiles);
  emit('file-change', updatedFiles);
};

// Clean up object URLs when component is unmounted
onBeforeUnmount(() => {
  objectUrls.value.forEach(url => {
    URL.revokeObjectURL(url);
  });
  
  if (fullscreenMedia.value) {
    closeFullscreen();
  }
  
  // Page State
  if (props.isUploading) {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
  }
});
</script>

<style scoped>
/* Prevent scrollbar jump when opening fullscreen */
:deep(body.no-scroll) {
  overflow: hidden;
  padding-right: 17px; /* Scrollbar width */
}

</style> 