<template>
  <div class="mx-auto p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <button
          @click="goBack"
          class="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
          title="返回上一頁"
        >
          <q-icon name="arrow_back" size="22px" />
        </button>
        <h1 class="text-xl font-bold text-gray-800">檔案管理</h1>
      </div>

      <button
        @click="openUploadDialog"
        class="bg-gray-500 hover:bg-gray-400 text-white rounded-lg px-4 py-2 shadow-sm transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        :disabled="loading || uploading"
      >
        上傳檔案
      </button>
    </div>

    <!-- 篩選 -->
    <div class="bg-white rounded-lg shadow-sm mb-4">
      <div class="grid grid-cols-3 md:grid-cols-3 gap-2">
        <q-select
          v-model="filterYear"
          :options="yearOptions"
          label="年份"
          dense
          outlined
          clearable
        />
        <q-select
          v-model="filterMonth"
          :options="monthOptions"
          label="月份"
          dense
          outlined
          clearable
        />
        <q-select
          v-model="filterType"
          :options="typeOptions"
          label="檔案類型"
          dense
          outlined
          clearable
        />
      </div>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-lg shadow-md border border-gray-100">
      <div v-if="loading" class="p-6 flex items-center justify-center">
        <q-spinner-dots size="40px" color="amber" />
      </div>

      <div v-else>
        <div v-if="filteredFiles.length === 0" class="p-6 text-gray-600 text-sm">
          尚無檔案或無符合篩選條件的檔案。
        </div>

        <q-list v-else separator>
          <q-item
            v-for="f in filteredFiles"
            :key="f.id"
            clickable
            @click="openViewer(f)"
          >
            <q-item-section>
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-gray-800 truncate">
                    {{ f.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ f.date }}
                  </div>
                </div>
                <span
                  class="text-xs px-2 py-1 rounded-full border"
                  :class="typeBadgeClass(f.fileCategory)"
                >
                  {{ typeLabel(f.fileCategory) }}
                </span>
              </div>
            </q-item-section>
            <q-item-section side>
              <div class="flex items-center gap-1">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  color="blue-grey-4"
                  title="編輯"
                  @click.stop="requestEdit(f)"
                />
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="red-4"
                  title="刪除"
                  @click.stop="requestDelete(f)"
                />
                <!-- <q-icon name="chevron_right" color="grey-7" /> -->
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>

    <!-- 隱藏的檔案選擇 -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="acceptTypes"
      @change="onFilePicked"
    />

    <!-- 上傳對話框 -->
    <q-dialog v-model="showUploadDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="flex items-center justify-between">
          <div class="text-base font-bold">上傳檔案</div>
          <q-btn flat round icon="close" @click="closeUploadDialog" :disable="uploading" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="mb-3">
            <button
              @click="pickFile"
              class="w-full border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              :disabled="uploading"
            >
              {{ pickedFile ? `已選擇：${pickedFile.name}` : '選擇檔案' }}
            </button>
            <div class="text-xs text-gray-500 mt-2">
              日期未填，將使用今日日期。
            </div>
            <div class="text-xs text-gray-500 mt-2">
              檔名未填，將使用上傳檔名。
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <q-input
              v-model="uploadDate"
              type="date"
              label="日期"
              dense
              outlined
              :disable="uploading"
            />
            <q-input
              v-model="uploadName"
              type="text"
              label="檔名"
              dense
              outlined
              :disable="uploading"
            />
          </div>

          <div v-if="uploading" class="mt-4">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>上傳中</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <q-linear-progress :value="uploadProgress / 100" color="amber" />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="取消" @click="closeUploadDialog" :disable="uploading" />
          <q-btn
            color="amber"
            label="開始上傳"
            @click="startUpload"
            :disable="!pickedFile || uploading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 檔案預覽 -->
    <q-dialog v-model="showViewer" maximized>
      <q-card class="bg-white">
        <q-card-section class="flex items-center justify-between">
          <div class="min-w-0">
            <div class="text-base font-bold truncate">
              {{ viewingFile?.name || '' }}
            </div>
            <div class="text-xs text-gray-500">
              {{ viewingFile?.date || '' }}
            </div>
          </div>

          <div class="flex items-center">
            <q-btn
              v-if="viewingFile?.fileCategory === 'image'"
              flat
              icon="rotate_left"
              @click="rotateLeft"
            />
            <q-btn
              v-if="viewingFile?.fileCategory === 'image'"
              flat
              icon="rotate_right"
              @click="rotateRight"
            />
            <q-btn
              v-if="viewingFile?.fileCategory === 'image'"
              flat
              icon="filter_center_focus"
              @click="resetRotation"
              title="重置旋轉"
            />
            <q-btn flat icon="open_in_new" @click="openInNewTab" />
            <q-btn flat icon="share" @click="shareFile" />
            <q-btn flat round icon="close" @click="closeViewer" />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="p-0">
          <div
            class="viewer-surface w-full h-[calc(100vh-110px)] bg-gray-50 overflow-y-auto overflow-x-hidden"
            :class="viewerSurfaceClass"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <!-- 圖片 -->
            <div v-if="viewingFile?.fileCategory === 'image'" class="min-h-full flex items-center justify-center p-4">
              <img
                :src="viewingFile.url"
                :alt="viewingFile.name"
                class="max-w-full max-h-full select-none"
                :style="imageStyle"
                draggable="false"
              />
            </div>

            <!-- PDF -->
            <div v-else-if="viewingFile?.fileCategory === 'pdf'" class="h-full w-full overflow-hidden">
              <iframe
                :src="pdfViewerUrl"
                class="pdf-iframe w-full h-full border-0 block"
                title="PDF Viewer"
                @load="onPdfIframeLoad"
              />
            </div>

            <!-- 文字 -->
            <div v-else-if="viewingFile?.fileCategory === 'text'" class="p-4">
              <pre
                class="bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap break-words text-gray-800"
                :style="textStyle"
              >{{ textContent }}</pre>
            </div>

            <!-- 其他 -->
            <div v-else class="p-6 text-gray-700">
              此檔案類型無法直接預覽，請使用右上角「在新分頁開啟」。
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- 分享連結（保底） -->
    <q-dialog v-model="showShareDialog">
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="flex items-center justify-between">
          <div class="text-base font-bold">分享</div>
          <q-btn flat round icon="close" @click="showShareDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="shareUrl" readonly outlined dense label="分享連結" />
          <div class="text-xs text-gray-500 mt-2">
            若系統分享不可用，你仍可複製此連結分享給他人。
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="關閉" @click="showShareDialog = false" />
          <q-btn color="amber" label="複製連結" @click="copyShareUrl" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 刪除確認 -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="flex items-center justify-between">
          <div class="text-base font-bold">刪除檔案</div>
          <q-btn flat round icon="close" @click="showDeleteDialog = false" :disable="isDeleting" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="text-sm text-gray-700">
            確定要刪除「{{ fileToDelete?.name || '' }}」嗎？
          </div>
          <div class="text-xs text-gray-500 mt-2">
            刪除後會同時從 Firebase Storage 與列表中移除。
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="取消" @click="showDeleteDialog = false" :disable="isDeleting" />
          <q-btn color="red" label="刪除" @click="confirmDelete" :loading="isDeleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 編輯檔名/日期 -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="flex items-center justify-between">
          <div class="text-base font-bold">編輯</div>
          <q-btn flat round icon="close" @click="closeEditDialog" :disable="isUpdating" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="grid grid-cols-1 gap-3">
            <q-input v-model="editDate" type="date" label="日期" dense outlined :disable="isUpdating" />
            <q-input v-model="editName" type="text" label="檔名" dense outlined :disable="isUpdating" />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="取消" @click="closeEditDialog" :disable="isUpdating" />
          <q-btn color="amber" label="儲存" @click="confirmEdit" :loading="isUpdating" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- PDF fallback（PWA 內預覽疑似失敗時，詢問是否改用瀏覽器開啟） -->
    <confirm-dialog
      v-model="showPdfFallbackConfirm"
      title="PDF 無法預覽"
      :message="`「${viewingFile?.name || 'PDF'}」在 PWA 內預覽可能載入失敗，要改用瀏覽器開啟嗎？`"
      confirm-label="改用瀏覽器開啟"
      cancel-label="繼續等待"
      confirm-color="amber-8"
      @confirm="confirmOpenPdfInBrowser"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import ConfirmDialog from 'src/components/ConfirmDialog.vue';
import {
  db,
  collection,
  addDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'src/boot/firebase';
import { deleteDoc, storage, storageRef, deleteObject } from 'src/boot/firebase';
import { notification } from 'src/boot/notification';
import { useUserStore } from 'src/stores/userStore';
import { uploadPetFile } from 'src/services/petFileService';
import { cacheGet, cacheSet } from 'src/utils/idbCache';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const petId = computed(() => String(route.params.id || ''));

const loading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);

const files = ref([]);

const filterYear = ref(null);
const filterMonth = ref(null);
const filterType = ref(null);

const acceptTypes = 'image/*,.pdf,.txt,.text,.rtf,.md,.note';

const showUploadDialog = ref(false);
const fileInput = ref(null);
const pickedFile = ref(null);
const uploadDate = ref('');
const uploadName = ref('');

const showViewer = ref(false);
const viewingFile = ref(null);
const zoomScale = ref(1);
const rotationDeg = ref(0);
const textContent = ref('');

const pinchStart = ref(null);
const pointers = ref(new Map());
const pointerGesture = ref(null);
const showShareDialog = ref(false);
const shareUrl = ref('');
const isSharing = ref(false);
let shareUnlockTimer = null;

const showDeleteDialog = ref(false);
const fileToDelete = ref(null);
const isDeleting = ref(false);

const showEditDialog = ref(false);
const fileToEdit = ref(null);
const editDate = ref('');
const editName = ref('');
const isUpdating = ref(false);

const isStandalonePwa = computed(() => {
  try {
    // iOS Safari PWA
    if (typeof navigator !== 'undefined' && navigator.standalone) return true;
    // Modern browsers
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(display-mode: standalone)').matches;
    }
  } catch {
    // ignore
  }
  return false;
});

const pdfIframeLoaded = ref(false);
let pdfFallbackTimer = null;
const showPdfFallbackConfirm = ref(false);
const pdfFallbackOffered = ref(false);

const pdfViewerUrl = computed(() => {
  const url = viewingFile.value?.url || '';
  if (!url) return '';
  if (url.includes('#')) return url;
  return `${url}#zoom=page-width`;
});

const viewerSurfaceClass = computed(() => {
  switch (viewingFile.value?.fileCategory) {
    case 'pdf':
      return 'pdf-surface';
    case 'image':
      return 'image-surface';
    case 'text':
      return 'text-surface';
    default:
      return '';
  }
});

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeMonthOption = (m) => String(m).padStart(2, '0');

const yearOptions = computed(() => {
  const years = new Set(
    files.value
      .map((f) => (f.date || '').slice(0, 4))
      .filter(Boolean)
  );
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
});

const monthOptions = computed(() => {
  // 1-12
  return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
});

const typeOptions = computed(() => ['image', 'pdf', 'text', 'other']);

const filteredFiles = computed(() => {
  const y = filterYear.value;
  const m = filterMonth.value;
  const t = filterType.value;

  return files.value
    .filter((f) => {
      if (y && (f.date || '').slice(0, 4) !== y) return false;
      if (m && (f.date || '').slice(5, 7) !== normalizeMonthOption(m)) return false;
      if (t && f.fileCategory !== t) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const ad = a.date || '';
      const bd = b.date || '';
      // YYYY-MM-DD string compare works for sorting descending
      return bd.localeCompare(ad);
    });
});

const canZoom = computed(() => {
  return viewingFile.value?.fileCategory === 'image' || viewingFile.value?.fileCategory === 'text';
});

const imageStyle = computed(() => ({
  transform: `scale(${zoomScale.value}) rotate(${rotationDeg.value}deg)`,
  transformOrigin: 'center center'
}));

const textStyle = computed(() => ({
  transform: `scale(${zoomScale.value})`,
  transformOrigin: 'top left'
}));

const typeLabel = (type) => {
  switch (type) {
    case 'image':
      return '圖檔';
    case 'pdf':
      return 'PDF';
    case 'text':
      return '文字';
    default:
      return '其他';
  }
};

const typeBadgeClass = (type) => {
  switch (type) {
    case 'image':
      return 'border-green-200 text-green-700 bg-green-50';
    case 'pdf':
      return 'border-red-200 text-red-700 bg-red-50';
    case 'text':
      return 'border-blue-200 text-blue-700 bg-blue-50';
    default:
      return 'border-gray-200 text-gray-700 bg-gray-50';
  }
};

const fetchFiles = async () => {
  if (!userStore.isLoggedIn || !userStore.hasFamily || !petId.value) return;
  loading.value = true;
  try {
    const cacheKey = `petFiles:${userStore.family.id}:${petId.value}`;
    const cached = await cacheGet(cacheKey, { maxAgeMs: 1000 * 60 * 60 * 24 });
    if (Array.isArray(cached) && cached.length > 0) {
      files.value = cached;
      // 首屏先顯示快取，不要卡 loading
      loading.value = false;
    }

    const qy = query(
      collection(db, 'petFiles'),
      where('familyId', '==', userStore.family.id),
      where('petId', '==', petId.value)
    );
    const snap = await getDocs(qy);
    files.value = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    // Avoid caching Vue reactive proxies / Firestore Timestamp objects directly
    void cacheSet(cacheKey, files.value.map((f) => ({
      ...f,
      createdAt: f?.createdAt?.toMillis?.() ?? f?.createdAt ?? null,
      updatedAt: f?.updatedAt?.toMillis?.() ?? f?.updatedAt ?? null
    })));
  } catch (e) {
    console.error(e);
    // 有快取時（或離線）就先用快取顯示，不用跳錯誤擋使用者
    if (files.value.length === 0) {
      notification.error('載入檔案列表失敗');
    }
  } finally {
    if (loading.value) loading.value = false;
  }
};

onMounted(() => {
  fetchFiles();
});

const openUploadDialog = () => {
  if (!userStore.isLoggedIn || !userStore.hasFamily) {
    notification.error('未登入或無家庭資訊');
    return;
  }
  showUploadDialog.value = true;
};

const goBack = () => {
  // 優先回到上一頁；若無上一頁歷史，則回到寵物詳情頁
  if (window.history.length > 1) {
    router.back();
    return;
  }
  if (petId.value) {
    router.push({ name: 'pet-details', params: { id: petId.value } });
  } else {
    router.push('/');
  }
};

const closeUploadDialog = () => {
  if (uploading.value) return;
  showUploadDialog.value = false;
  pickedFile.value = null;
  uploadDate.value = '';
  uploadName.value = '';
  uploadProgress.value = 0;
  if (fileInput.value) fileInput.value.value = '';
};

const pickFile = () => {
  if (uploading.value) return;
  fileInput.value?.click();
};

const onFilePicked = (e) => {
  const f = e?.target?.files?.[0] || null;
  pickedFile.value = f;
  if (f && (!uploadName.value || uploadName.value.trim() === '')) {
    uploadName.value = f.name;
  }
};

const startUpload = async () => {
  if (!pickedFile.value) return;
  if (!userStore.isLoggedIn || !userStore.hasFamily || !petId.value) {
    notification.error('未登入或無家庭資訊');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const finalDate = (uploadDate.value && String(uploadDate.value)) || todayYmd();
    const finalName = (uploadName.value && uploadName.value.trim()) || pickedFile.value.name || 'file';

    const uploadResult = await uploadPetFile(
      pickedFile.value,
      { familyId: userStore.family.id, petId: petId.value },
      (p) => {
        uploadProgress.value = p;
      }
    );

    await addDoc(collection(db, 'petFiles'), {
      familyId: userStore.family.id,
      petId: petId.value,
      date: finalDate,
      name: finalName,
      originalName: pickedFile.value.name || null,
      url: uploadResult.url,
      storagePath: uploadResult.storagePath,
      fileCategory: uploadResult.fileCategory,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      createdAt: serverTimestamp(),
      createdBy: userStore.user?.uid || null
    });

    notification.success('上傳成功');
    // 成功後需要立即關閉彈窗（原本 closeUploadDialog 會被 uploading 擋住）
    uploading.value = false;
    closeUploadDialog();
    await fetchFiles();
  } catch (e) {
    console.error(e);
    notification.error('上傳失敗');
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

const openViewer = async (f) => {
  viewingFile.value = f;
  zoomScale.value = 1;
  rotationDeg.value = 0;
  textContent.value = '';
  showViewer.value = true;
  pdfIframeLoaded.value = false;
  showPdfFallbackConfirm.value = false;
  pdfFallbackOffered.value = false;

  // PWA 中 iframe 開 PDF 可能不穩：若短時間內未成功載入，就改用瀏覽器開啟
  if (f?.fileCategory === 'pdf' && isStandalonePwa.value && f?.url) {
    if (pdfFallbackTimer) clearTimeout(pdfFallbackTimer);
    pdfFallbackTimer = setTimeout(() => {
      // 注意：iOS PWA 下 iframe load 事件可能不穩，因此這裡只「提示/詢問」而不強制外開
      if (
        !pdfIframeLoaded.value &&
        showViewer.value &&
        viewingFile.value?.fileCategory === 'pdf' &&
        viewingFile.value?.url &&
        !pdfFallbackOffered.value
      ) {
        pdfFallbackOffered.value = true;
        showPdfFallbackConfirm.value = true;
      }
    }, 5000);
  }

  if (f?.fileCategory === 'text' && f?.url) {
    try {
      const resp = await fetch(f.url);
      textContent.value = await resp.text();
    } catch (e) {
      console.error(e);
      textContent.value = '讀取文字內容失敗';
    }
  }
};

const closeViewer = () => {
  showViewer.value = false;
  viewingFile.value = null;
  zoomScale.value = 1;
  rotationDeg.value = 0;
  textContent.value = '';
  pinchStart.value = null;
  pointers.value = new Map();
  pointerGesture.value = null;
  pdfIframeLoaded.value = false;
  showPdfFallbackConfirm.value = false;
  pdfFallbackOffered.value = false;
  if (pdfFallbackTimer) {
    clearTimeout(pdfFallbackTimer);
    pdfFallbackTimer = null;
  }
};

const clampScale = (v) => Math.min(5, Math.max(0.5, v));
// 已移除桌機滾輪縮放（@wheel），桌機使用按鈕縮放；行動裝置使用手勢縮放/旋轉

const distance = (t1, t2) => {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const angleRad = (t1, t2) => {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.atan2(dy, dx);
};

const onTouchStart = (evt) => {
  if (!canZoom.value) return;
  const touches = evt.touches;
  if (!touches || touches.length < 2) return;
  const d = distance(touches[0], touches[1]);
  const a = angleRad(touches[0], touches[1]);
  pinchStart.value = { dist: d, scale: zoomScale.value, angle: a, rotation: rotationDeg.value };
};

const onTouchMove = (evt) => {
  if (!canZoom.value) return;
  const touches = evt.touches;
  if (!touches || touches.length < 2 || !pinchStart.value) return;
  // 兩指操作時避免捲動，確保縮放/旋轉手勢可用
  evt.preventDefault();
  const d = distance(touches[0], touches[1]);
  const ratio = d / pinchStart.value.dist;
  zoomScale.value = clampScale(pinchStart.value.scale * ratio);

  // 旋轉（僅圖片）
  if (viewingFile.value?.fileCategory === 'image') {
    const a = angleRad(touches[0], touches[1]);
    const diff = a - pinchStart.value.angle;
    rotationDeg.value = Math.round(pinchStart.value.rotation + (diff * 180) / Math.PI);
  }
};

const onTouchEnd = () => {
  pinchStart.value = null;
};

const getPointerDistance = (p1, p2) => {
  const dx = p2.clientX - p1.clientX;
  const dy = p2.clientY - p1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getPointerAngle = (p1, p2) => {
  const dx = p2.clientX - p1.clientX;
  const dy = p2.clientY - p1.clientY;
  return Math.atan2(dy, dx);
};

const onPointerDown = (evt) => {
  if (!canZoom.value) return;

  try {
    evt.currentTarget?.setPointerCapture?.(evt.pointerId);
  } catch {
    // ignore
  }

  pointers.value.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });

  if (pointers.value.size === 2) {
    const pts = Array.from(pointers.value.values());
    pointerGesture.value = {
      dist: getPointerDistance(pts[0], pts[1]),
      angle: getPointerAngle(pts[0], pts[1]),
      scale: zoomScale.value,
      rotation: rotationDeg.value
    };
  }
};

const onPointerMove = (evt) => {
  if (!canZoom.value) return;
  if (!pointers.value.has(evt.pointerId)) return;

  pointers.value.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });

  if (pointers.value.size === 2 && pointerGesture.value) {
    evt.preventDefault?.();
    const pts = Array.from(pointers.value.values());
    const dist = getPointerDistance(pts[0], pts[1]);
    const ratio = dist / pointerGesture.value.dist;
    zoomScale.value = clampScale(pointerGesture.value.scale * ratio);

    if (viewingFile.value?.fileCategory === 'image') {
      const ang = getPointerAngle(pts[0], pts[1]);
      const diff = ang - pointerGesture.value.angle;
      rotationDeg.value = Math.round(pointerGesture.value.rotation + (diff * 180) / Math.PI);
    }
  }
};

const onPointerUp = (evt) => {
  pointers.value.delete(evt.pointerId);
  if (pointers.value.size < 2) {
    pointerGesture.value = null;
  }
};


const openInNewTab = () => {
  if (!viewingFile.value?.url) return;
  window.open(viewingFile.value.url, '_blank', 'noopener,noreferrer');
};

const openInBrowser = (url) => {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    try {
      window.location.href = url;
    } catch {
      // ignore
    }
  }
};

const onPdfIframeLoad = () => {
  pdfIframeLoaded.value = true;
  showPdfFallbackConfirm.value = false;
  pdfFallbackOffered.value = false;
  if (pdfFallbackTimer) {
    clearTimeout(pdfFallbackTimer);
    pdfFallbackTimer = null;
  }
};

const confirmOpenPdfInBrowser = () => {
  const url = viewingFile.value?.url;
  showPdfFallbackConfirm.value = false;
  if (!url) return;
  openInBrowser(url);
  closeViewer();
};

const rotateLeft = () => {
  rotationDeg.value = (rotationDeg.value - 90) % 360;
};
const rotateRight = () => {
  rotationDeg.value = (rotationDeg.value + 90) % 360;
};
const resetRotation = () => {
  rotationDeg.value = 0;
};

const copyTextFallback = async (text) => {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
};

const openShareDialog = (url) => {
  shareUrl.value = url;
  showShareDialog.value = true;
};

const copyShareUrl = async () => {
  const url = shareUrl.value;
  if (!url) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      notification.success('已複製分享連結');
      return;
    }
  } catch (e) {
    console.error(e);
  }
  const ok = await copyTextFallback(url);
  if (ok) {
    notification.success('已複製分享連結');
  } else {
    notification.error('複製失敗，請手動選取連結複製');
  }
};

const unlockShareSoon = () => {
  if (shareUnlockTimer) clearTimeout(shareUnlockTimer);
  shareUnlockTimer = setTimeout(() => {
    isSharing.value = false;
    shareUnlockTimer = null;
  }, 800);
};

const shareFileImpl = async () => {
  if (!viewingFile.value?.url) return;
  const url = viewingFile.value.url;
  const title = viewingFile.value.name || '檔案';

  try {
    if (navigator.share) {
      // 優先嘗試「分享檔案本體」（若裝置/瀏覽器支援），不行再退回分享連結
      try {
        if (navigator.canShare) {
          const resp = await fetch(url);
          const blob = await resp.blob();
          const fileName = viewingFile.value.name || viewingFile.value.originalName || 'file';
          const sharedFile = new File([blob], fileName, { type: blob.type || viewingFile.value.mimeType || '' });
          if (navigator.canShare({ files: [sharedFile] })) {
            await navigator.share({ title, files: [sharedFile] });
            return;
          }
        }
      } catch (e) {
        console.error(e);
        // ignore and fallback to url share
      }

      await navigator.share({ title, url });
      return;
    }
  } catch (e) {
    console.error(e);
    // 使用者取消分享就不強制跳對話框
    if (e?.name === 'AbortError') return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      notification.success('已複製分享連結');
    } else {
      openShareDialog(url);
    }
  } catch (e) {
    console.error(e);
    openShareDialog(url);
  }
};

const shareFile = async () => {
  if (isSharing.value) return;
  isSharing.value = true;
  if (shareUnlockTimer) {
    clearTimeout(shareUnlockTimer);
    shareUnlockTimer = null;
  }

  try {
    await shareFileImpl();
  } finally {
    unlockShareSoon();
  }
};

const requestDelete = (f) => {
  fileToDelete.value = f;
  showDeleteDialog.value = true;
};

const requestEdit = (f) => {
  fileToEdit.value = f;
  editDate.value = String(f?.date || '');
  editName.value = String(f?.name || '');
  showEditDialog.value = true;
};

const closeEditDialog = ({ force = false } = {}) => {
  if (!force && isUpdating.value) return;
  showEditDialog.value = false;
  fileToEdit.value = null;
  editDate.value = '';
  editName.value = '';
};

const confirmEdit = async () => {
  const f = fileToEdit.value;
  if (!f?.id) return;
  if (!userStore.isLoggedIn || !userStore.hasFamily) {
    notification.error('未登入或無家庭資訊');
    return;
  }

  const nextDate = (editDate.value && String(editDate.value)) || String(f.date || '');
  const nextName = (editName.value && String(editName.value).trim()) || String(f.name || '');
  if (!nextDate) {
    notification.error('請填寫日期');
    return;
  }
  if (!nextName) {
    notification.error('請填寫檔名');
    return;
  }

  isUpdating.value = true;
  let success = false;
  try {
    await updateDoc(doc(db, 'petFiles', f.id), {
      date: nextDate,
      name: nextName,
      updatedAt: serverTimestamp(),
      updatedBy: userStore.user?.uid || null
    });

    // 更新列表（讓篩選/排序立即生效）
    files.value = files.value.map((x) => (x.id === f.id ? { ...x, date: nextDate, name: nextName } : x));

    // 若正在預覽同一份檔案，同步更新標題/日期
    if (viewingFile.value?.id === f.id) {
      viewingFile.value = { ...viewingFile.value, date: nextDate, name: nextName };
    }

    // 更新快取
    const cacheKey = `petFiles:${userStore.family.id}:${petId.value}`;
    void cacheSet(cacheKey, files.value.map((ff) => ({
      ...ff,
      createdAt: ff?.createdAt?.toMillis?.() ?? ff?.createdAt ?? null,
      updatedAt: ff?.updatedAt?.toMillis?.() ?? ff?.updatedAt ?? null
    })));
    success = true;
  } catch (e) {
    console.error(e);
    notification.error('更新失敗');
  } finally {
    isUpdating.value = false;
  }

  if (success) {
    // 先關閉編輯視窗，避免通知被 QDialog 蓋住
    closeEditDialog({ force: true });
    await nextTick();
    notification.success('已更新');
  }
};

const confirmDelete = async () => {
  const f = fileToDelete.value;
  if (!f?.id) return;
  if (!userStore.isLoggedIn || !userStore.hasFamily) {
    notification.error('未登入或無家庭資訊');
    return;
  }

  isDeleting.value = true;
  try {
    // 先刪 Storage 檔案（若有 storagePath）
    if (f.storagePath) {
      try {
        await deleteObject(storageRef(storage, f.storagePath));
      } catch (err) {
        // 若檔案不存在，忽略；其他錯誤則提示但仍嘗試刪除 Firestore 紀錄
        const code = err?.code || '';
        if (code !== 'storage/object-not-found') {
          console.error(err);
          notification.warning('刪除檔案本體失敗，但仍會移除列表紀錄');
        }
      }
    }

    await deleteDoc(doc(db, 'petFiles', f.id));
    files.value = files.value.filter((x) => x.id !== f.id);

    // 如果正在預覽同一份檔案，直接關閉
    if (viewingFile.value?.id === f.id) {
      closeViewer();
    }

    notification.success('已刪除');
    showDeleteDialog.value = false;
    fileToDelete.value = null;
  } catch (e) {
    console.error(e);
    notification.error('刪除失敗');
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style scoped>
.viewer-surface {
  /* 讓兩指縮放/旋轉手勢由我們接管（避免被瀏覽器捲動/縮放攔截） */
  touch-action: pan-x pan-y;
  overscroll-behavior: contain;
}

.pdf-surface {
  /* PDF：允許使用者自由雙指縮放（交給內建 PDF viewer / iframe） */
  touch-action: pan-x pan-y pinch-zoom;
}

.pdf-iframe {
  /* iOS/部分瀏覽器對 iframe 手勢較挑，加強允許 pinch */
  touch-action: pan-x pan-y pinch-zoom;
}

.image-surface,
.text-surface {
  /* 圖片/文字：由我們的手勢縮放/旋轉接管，避免觸發頁面縮放 */
  touch-action: none;
}
</style>
