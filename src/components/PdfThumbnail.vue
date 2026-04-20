<template>
  <div
    ref="containerRef"
    class="pdf-thumbnail relative w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden"
  >
    <!-- Canvas for PDF rendering -->
    <canvas
      ref="canvasRef"
      v-show="!loading && !error"
      class="max-w-full max-h-full object-contain"
    ></canvas>

    <!-- Idle (尚未進入視窗) / Loading -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50/50">
      <q-spinner-dots v-if="started" size="24px" color="amber" />
      <q-icon v-else name="picture_as_pdf" size="32px" class="text-gray-300" />
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

const containerRef = ref(null);
const canvasRef = ref(null);
const loading = ref(true);
const error = ref(false);
const started = ref(false); // 是否已經開始載入（用來決定是否顯示 spinner）
let pdfDoc = null;
let renderTask = null;
let observer = null;
let hasLoaded = false;

const loadPdf = async () => {
  if (!props.url || hasLoaded) return;
  hasLoaded = true;

  started.value = true;
  loading.value = true;
  error.value = false;

  try {
    // 載入 PDF 文件
    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    // 取得第一頁
    const page = await pdfDoc.getPage(1);

    // 縮放比例：縮圖用 1.0 即可，1.5 對 iOS 記憶體壓力大
    const viewport = page.getViewport({ scale: 1.0 });

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
    if (err.name === 'RenderingCancelledException') {
      return;
    }
    console.error('PDF Thumbnail render error:', err);
    error.value = true;
    loading.value = false;
    hasLoaded = false; // 失敗時允許重試
  }
};

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // 老舊瀏覽器降級：直接載入
  if (typeof IntersectionObserver === 'undefined') {
    loadPdf();
    return;
  }
  if (!containerRef.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // intersectionRatio > 0 確保元素真的有可見區域
        // (排除被祖先 overflow:hidden + height:0 收合的情況)
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          loadPdf();
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          return;
        }
      }
    },
    {
      rootMargin: '200px', // 提前 200px 開始載入，避免使用者滑到時還在 loading
      threshold: 0.01,
    }
  );
  observer.observe(containerRef.value);
};

// URL 變更時重新觀察（v-for 用 idx 為 key，刪除檔案時可能 reuse 元件實例）
watch(() => props.url, (newUrl, oldUrl) => {
  if (newUrl === oldUrl) return;
  hasLoaded = false;
  started.value = false;
  loading.value = true;
  error.value = false;
  if (pdfDoc) {
    pdfDoc.destroy();
    pdfDoc = null;
  }
  setupObserver();
});

onMounted(() => {
  setupObserver();
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
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
