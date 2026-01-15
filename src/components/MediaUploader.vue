<template>
  <div class="media-uploader">
    <!-- loading overlay -->
    <div 
      v-if="isUploading" 
      class="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 max-w-sm w-4/5 text-center">
        <q-spinner-dots size="60px" color="amber" class="mb-4 mx-auto" />
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
        class="absolute top-16 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center z-50"
        @click.stop="closeFullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <!-- fullscreen image (pinch to zoom / pan) -->
      <div
        v-if="fullscreenMedia.type === 'image'"
        ref="fullscreenImageViewport"
        class="max-h-[90vh] max-w-[90vw] overflow-hidden"
        @click.stop
        @dblclick.stop="toggleZoomAtCenter"
        @wheel.prevent.stop="onFullscreenWheel"
        @touchstart.prevent.stop="onFullscreenTouchStart"
        @touchmove.prevent.stop="onFullscreenTouchMove"
        @touchend.prevent.stop="onFullscreenTouchEnd"
        @touchcancel.prevent.stop="onFullscreenTouchEnd"
      >
        <img
          ref="fullscreenImageEl"
          :src="getFullscreenImageSource(fullscreenMedia)"
          class="max-h-[90vh] max-w-[90vw] object-contain select-none fullscreen-zoom-img"
          :style="fullscreenImageStyle"
          draggable="false"
          @click.stop
        />
      </div>
      
      <!-- fullscreen video -->
      <video 
        v-else-if="fullscreenMedia.type === 'video'" 
        :src="fullscreenMedia.url" 
        controls 
        class="max-h-[90vh] max-w-[90vw]"
        @click.stop
        autoplay
      ></video>

      <!-- fullscreen pdf/file placeholder -->
      <div v-else class="text-white text-center p-4">
        <q-icon 
          :name="fullscreenMedia.type === 'pdf' ? 'picture_as_pdf' : 'insert_drive_file'" 
          size="64px" 
          class="mb-4"
        />
        <div class="text-lg font-bold mb-2">{{ fullscreenMedia.name }}</div>
        <div class="text-sm text-gray-300">預覽模式僅支援圖片與影片</div>
      </div>
      
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
            <span class="text-xs block truncate px-1">{{ file.name || '影片' }}</span>
          </div>
        </div>

        <!-- pdf/file preview -->
        <div 
          v-else
          class="w-full h-full bg-gray-50 flex items-center justify-center border border-gray-100"
          @click.stop="openFullscreen(file)"
        >
          <div class="text-center w-full px-1">
            <q-icon 
              :name="file.type === 'pdf' ? 'picture_as_pdf' : 'insert_drive_file'" 
              size="32px" 
              :color="file.type === 'pdf' ? 'red-5' : 'grey-6'" 
              class="mb-1"
            />
            <div class="text-xs text-gray-600 truncate w-full">{{ file.name || '檔案' }}</div>
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
import { ref, onBeforeUnmount, nextTick, computed } from 'vue';
import { notification } from 'src/boot/notification';
import { compressImage } from 'src/utils/imageCompression';

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
const fullscreenImageViewport = ref(null);

// fullscreen zoom/pan state (for images)
const zoomScale = ref(1);
const zoomTranslateX = ref(0);
const zoomTranslateY = ref(0);
const isGestureActive = ref(false);
const gesture = ref({
  mode: null, // 'pan' | 'pinch'
  startX: 0,
  startY: 0,
  startTranslateX: 0,
  startTranslateY: 0,
  startScale: 1,
  startDistance: 0,
  startMidX: 0,
  startMidY: 0,
  rectLeft: 0,
  rectTop: 0,
  rectWidth: 0,
  rectHeight: 0
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getViewportRect = () => {
  const el = fullscreenImageViewport.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

const clampTranslateToBounds = () => {
  const rect = getViewportRect();
  if (!rect) return;
  const maxX = ((zoomScale.value - 1) * rect.width) / 2;
  const maxY = ((zoomScale.value - 1) * rect.height) / 2;

  if (zoomScale.value <= 1) {
    zoomTranslateX.value = 0;
    zoomTranslateY.value = 0;
    return;
  }

  zoomTranslateX.value = clamp(zoomTranslateX.value, -maxX, maxX);
  zoomTranslateY.value = clamp(zoomTranslateY.value, -maxY, maxY);
};

const resetFullscreenZoom = () => {
  zoomScale.value = 1;
  zoomTranslateX.value = 0;
  zoomTranslateY.value = 0;
  isGestureActive.value = false;
  gesture.value.mode = null;
};

const toggleZoomAtCenter = () => {
  // simple desktop UX: dblclick toggles between 1x and 2x at center
  if (!fullscreenMedia.value || fullscreenMedia.value.type !== 'image') return;
  if (zoomScale.value > 1) {
    resetFullscreenZoom();
  } else {
    zoomScale.value = 2;
    zoomTranslateX.value = 0;
    zoomTranslateY.value = 0;
  }
};

const getTouchPoint = (touch, rect) => ({
  x: touch.clientX - rect.left,
  y: touch.clientY - rect.top
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const onFullscreenTouchStart = (e) => {
  if (!fullscreenMedia.value || fullscreenMedia.value.type !== 'image') return;
  const rect = getViewportRect();
  if (!rect) return;

  isGestureActive.value = true;
  gesture.value.rectLeft = rect.left;
  gesture.value.rectTop = rect.top;
  gesture.value.rectWidth = rect.width;
  gesture.value.rectHeight = rect.height;
  gesture.value.startTranslateX = zoomTranslateX.value;
  gesture.value.startTranslateY = zoomTranslateY.value;
  gesture.value.startScale = zoomScale.value;

  if (e.touches.length >= 2) {
    gesture.value.mode = 'pinch';
    const p1 = getTouchPoint(e.touches[0], rect);
    const p2 = getTouchPoint(e.touches[1], rect);
    const mid = midpoint(p1, p2);
    gesture.value.startDistance = distance(p1, p2);
    gesture.value.startMidX = mid.x;
    gesture.value.startMidY = mid.y;
  } else {
    gesture.value.mode = 'pan';
    gesture.value.startX = e.touches[0].clientX;
    gesture.value.startY = e.touches[0].clientY;
  }
};

const onFullscreenTouchMove = (e) => {
  if (!isGestureActive.value) return;
  const rect = getViewportRect();
  if (!rect) return;

  if (gesture.value.mode === 'pinch' && e.touches.length >= 2) {
    const p1 = getTouchPoint(e.touches[0], rect);
    const p2 = getTouchPoint(e.touches[1], rect);
    const mid = midpoint(p1, p2);
    const d = distance(p1, p2);
    const ratio = gesture.value.startDistance ? d / gesture.value.startDistance : 1;
    const nextScale = clamp(gesture.value.startScale * ratio, 1, 4);

    // Keep the content under the fingers stable:
    // Using a center-origin model:
    // m = c + (p - c)*s + t  => keep p constant, solve t for new s
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const startT = { x: gesture.value.startTranslateX, y: gesture.value.startTranslateY };
    const startS = gesture.value.startScale || 1;

    const p = {
      x: cx + (gesture.value.startMidX - cx - startT.x) / startS,
      y: cy + (gesture.value.startMidY - cy - startT.y) / startS
    };

    zoomScale.value = nextScale;
    zoomTranslateX.value = mid.x - cx - (p.x - cx) * nextScale;
    zoomTranslateY.value = mid.y - cy - (p.y - cy) * nextScale;
    clampTranslateToBounds();
    return;
  }

  // Pan (single finger)
  if (gesture.value.mode === 'pan' && e.touches.length === 1) {
    if (zoomScale.value <= 1) return; // no need to pan at 1x
    const dx = e.touches[0].clientX - gesture.value.startX;
    const dy = e.touches[0].clientY - gesture.value.startY;
    zoomTranslateX.value = gesture.value.startTranslateX + dx;
    zoomTranslateY.value = gesture.value.startTranslateY + dy;
    clampTranslateToBounds();
  }
};

const onFullscreenTouchEnd = (e) => {
  // If one finger remains after pinch, switch to pan smoothly
  if (e.touches && e.touches.length === 1) {
    gesture.value.mode = 'pan';
    gesture.value.startX = e.touches[0].clientX;
    gesture.value.startY = e.touches[0].clientY;
    gesture.value.startTranslateX = zoomTranslateX.value;
    gesture.value.startTranslateY = zoomTranslateY.value;
    gesture.value.startScale = zoomScale.value;
    return;
  }

  isGestureActive.value = false;
  gesture.value.mode = null;
  if (zoomScale.value <= 1) {
    resetFullscreenZoom();
  } else {
    clampTranslateToBounds();
  }
};

const onFullscreenWheel = (e) => {
  if (!fullscreenMedia.value || fullscreenMedia.value.type !== 'image') return;
  const rect = getViewportRect();
  if (!rect) return;

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const delta = -e.deltaY;
  const zoomFactor = delta > 0 ? 1.1 : 1 / 1.1;
  const startS = zoomScale.value;
  const nextS = clamp(startS * zoomFactor, 1, 4);
  if (nextS === startS) return;

  const startT = { x: zoomTranslateX.value, y: zoomTranslateY.value };
  const p = {
    x: cx + (mx - cx - startT.x) / startS,
    y: cy + (my - cy - startT.y) / startS
  };

  zoomScale.value = nextS;
  zoomTranslateX.value = mx - cx - (p.x - cx) * nextS;
  zoomTranslateY.value = my - cy - (p.y - cy) * nextS;
  clampTranslateToBounds();
};

const fullscreenImageStyle = computed(() => {
  const transition = isGestureActive.value ? 'none' : 'transform 120ms ease-out';
  return {
    transformOrigin: 'center center',
    transform: `translate3d(${zoomTranslateX.value}px, ${zoomTranslateY.value}px, 0) scale(${zoomScale.value})`,
    transition,
    willChange: 'transform'
  };
});

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
  resetFullscreenZoom();
  
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
  resetFullscreenZoom();
  
  // Restore background scrolling
  document.body.style.overflow = '';
};

  // 處理文件壓縮
  const processFiles = async (files) => {
    return Promise.all(
      files.map(async (file) => {
        console.log('處理文件:', file.name, file.type, file.size);
        
        let processedFile = file;
        let type = 'file';
        
        if (file.type.startsWith('image/')) {
          type = 'image';
          try {
            console.log('Compressing preview image...');
            processedFile = await compressImage(file);
            console.log(`Compressed size: ${(processedFile.size / 1024 / 1024).toFixed(2)} MB`);
          } catch (e) {
            console.warn('Compression failed, using original', e);
          }
        } else if (file.type.startsWith('video/')) {
          type = 'video';
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          type = 'pdf';
        }

        // 創建一個URL用於預覽
        const previewURL = URL.createObjectURL(processedFile);

        return {
          isNew: true,
          file: processedFile, // 確保存儲處理後的文件對象
          url: previewURL,
          type: type,
          name: file.name,
          loading: false,
          loadError: false,
          timestamp: Date.now()
        };
      })
    );
  };

  // improve HEIC processing logic
  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    console.log(`選擇了 ${files.length} 個文件`);
    
    // 將檔案轉換為預覽格式並壓縮
    const newMediaFiles = await processFiles(Array.from(files));
    
    console.log('創建的新媒體文件:', newMediaFiles);
    
    // 更新modelValue
    emit('update:modelValue', [...props.modelValue, ...newMediaFiles]);
    
    // 重置input以允許再次選擇相同的文件
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    
    // 通知父元件文件已變更
    emit('file-change', newMediaFiles);
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

.fullscreen-zoom-img {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
}

</style> 