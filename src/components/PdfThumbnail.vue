<template>
  <div class="pdf-thumbnail relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
    <!-- Canvas for PDF rendering -->
    <canvas 
      ref="canvasRef" 
      v-show="!loading && !error" 
      class="max-w-full max-h-full object-contain"
    ></canvas>

    <!-- Loading State -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50/50">
      <q-spinner-dots size="24px" color="amber" />
    </div>

    <!-- Error/Fallback State -->
    <div v-if="error" class="flex flex-col items-center justify-center text-red-400 p-2">
      <q-icon name="picture_as_pdf" size="32px" />
      <span class="text-xs mt-1 text-center truncate w-full">{{ fileName || 'PDF' }}</span>
    </div>
    
    <!-- PDF Badge (when rendered successfully) -->
    <div v-if="!loading && !error" class="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1 rounded shadow-sm opacity-80 font-bold">
      PDF
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
// 使用 Vite 的 ?url 語法載入本地 worker，確保版本一致且無需依賴外部 CDN
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    default: ''
  }
});

const canvasRef = ref(null);
const loading = ref(true);
const error = ref(false);
let pdfDoc = null;
let renderTask = null;

const loadPdf = async () => {
  if (!props.url) return;
  
  loading.value = true;
  error.value = false;

  try {
    // 載入 PDF 文件
    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    // 取得第一頁
    const page = await pdfDoc.getPage(1);

    // 計算縮放比例
    // 我們希望 canvas 寬度適應容器，但這裡我們先用固定比例渲染，再由 CSS 控制顯示
    // 為了清晰度，可以設大一點
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = canvasRef.value;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // 渲染
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    if (renderTask) {
      renderTask.cancel();
    }
    
    renderTask = page.render(renderContext);
    await renderTask.promise;
    
    loading.value = false;
  } catch (err) {
    // 如果是取消錯誤，不視為失敗
    if (err.name === 'RenderingCancelledException') {
      return;
    }
    console.error('PDF Thumbnail render error:', err);
    error.value = true;
    loading.value = false;
  }
};

watch(() => props.url, () => {
  loadPdf();
});

onMounted(() => {
  loadPdf();
});

onBeforeUnmount(() => {
  if (renderTask) {
    renderTask.cancel();
  }
  if (pdfDoc) {
    pdfDoc.destroy();
  }
});
</script>

<style scoped>
.pdf-thumbnail canvas {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}
</style>