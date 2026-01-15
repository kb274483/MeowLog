<template>
  <div class="mx-auto p-4 max-w-4xl">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <button
          @click="goBack"
          class="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
          title="返回上一頁"
        >
          <q-icon name="arrow_back" size="22px" />
        </button>
        <h1 class="text-xl font-bold text-gray-800">檔案紀錄</h1>
      </div>

      <button
        @click="openCreateDialog"
        class="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 shadow-sm transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        :disabled="loading || processing"
      >
        <q-icon name="create_new_folder" size="18px" />
        <span>新增紀錄</span>
      </button>
    </div>

    <!-- 篩選 -->
    <div class="bg-white rounded-lg shadow-lg mb-4 px-4 py-2 border border-gray-100">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <q-select
          v-model="filterYear"
          :options="yearOptions"
          label="年份"
          dense
          outlined
          clearable
          bg-color="white"
        />
        <q-select
          v-model="filterMonth"
          :options="monthOptions"
          label="月份"
          dense
          outlined
          clearable
          bg-color="white"
        />
        <q-input
          v-model="searchText"
          label="搜尋標題"
          dense
          outlined
          clearable
          bg-color="white"
          class="col-span-2"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div v-if="loading" class="p-10 flex items-center justify-center">
        <q-spinner-dots size="40px" color="amber" />
      </div>

      <div v-else class="p-0">
        <div v-if="filteredRecords.length === 0" class="p-10 text-center text-gray-500">
          <q-icon name="folder_off" size="48px" class="text-gray-300 mb-2" />
          <p>尚無紀錄或無符合篩選條件的資料</p>
        </div>

        <div v-else class="record-list ">
          <q-expansion-item
            v-for="record in filteredRecords"
            :key="record.id"
            group="records"
            header-class="bg-white hover:bg-gray-50 transition-colors border-b border-gray-100"
            expand-icon-class="text-gray-400"
          >
            <!-- Header -->
            <template v-slot:header>
              <q-item-section>
                <div class="text-amber-600 bg-amber-50 rounded-lg font-bold text-xs flex-col leading-tight p-1">
                  <span>{{ record.date }}</span> 
                  <span class="mx-2">/</span>
                  <span>{{ record.files.length }} 個檔案</span>
                </div>
                <q-item-label class="font-bold text-slate-600 text-base text-center my-1">
                  {{ record.name }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="flex items-center gap-1">
                   <q-btn
                    flat
                    round
                    dense
                    icon="file_upload"
                    color="amber-8"
                    @click.stop="openAddFilesDialog(record)"
                    title="新增檔案到此紀錄"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    color="grey-6"
                    @click.stop="openEditRecordDialog(record)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="red-4"
                    @click.stop="confirmDeleteRecord(record)"
                  />
                </div>
              </q-item-section>
            </template>

            <!-- Content (File Grid) -->
            <div class="p-4 border-b border-gray-100 bg-amber-50">
              <div v-if="record.files.length === 0" class="text-center text-gray-400 py-4 text-sm">
                此紀錄沒有檔案
              </div>
              <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div
                  v-for="(file, idx) in record.files"
                  :key="idx"
                  class="group relative aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                >
                  <!-- Preview -->
                  <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400" 
                    @click.stop="openViewer(file, record)"
                  >
                    <img
                      v-if="isImage(file)"
                      :src="file.url"
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                    <div v-else-if="isPdf(file)" class="w-full h-full">
                      <PdfThumbnail :url="file.url" :file-name="file.name" />
                    </div>
                    <div v-else class="flex flex-col items-center">
                      <q-icon name="insert_drive_file" size="32px" />
                      <span class="text-xs mt-1 px-2 text-center truncate w-full">{{ file.name }}</span>
                    </div>
                  </div>

                  <!-- File Info Overlay -->
                  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="text-white text-xs truncate">
                      {{ file.name }}
                    </div>
                  </div>
                  
                  <!-- Delete File Button (Overlay) -->
                  <button 
                    class="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                    @click.stop="confirmDeleteFile(record, file, idx)"
                    title="刪除檔案"
                  >
                    <q-icon name="close" size="14px" />
                  </button>
                </div>
              </div>
            </div>
          </q-expansion-item>
        </div>
      </div>
    </div>

    <!-- Create/Upload Record Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="width: 600px; max-width: 95vw;">
        <q-card-section class="flex items-center justify-between border-b border-gray-100 py-3">
          <div class="text-lg font-bold text-gray-800">
            {{ isAddFilesMode ? '新增檔案' : '建立新紀錄' }}
          </div>
          <q-btn flat round icon="close" @click="closeCreateDialog" :disable="processing" />
        </q-card-section>

        <q-card-section class="max-h-[80vh] scroll">
          <div class="space-y-4">
            <!-- Basic Info (Only for New Record) -->
            <div v-if="!isAddFilesMode" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <q-input
                v-model="recordDate"
                type="date"
                label="日期"
                outlined
                dense
                :disable="processing"
              />
              <q-input
                v-model="recordName"
                label="紀錄標題"
                outlined
                dense
                placeholder="未命名紀錄"
                :disable="processing"
              />
            </div>
            <div v-else class="bg-gray-50 p-3 rounded text-sm text-gray-600 mb-2">
              正在新增檔案至：<strong>{{ targetRecord?.date }} {{ targetRecord?.name }}</strong>
            </div>

            <!-- Media Uploader -->
            <div>
              <div class="text-sm font-medium text-gray-700 mb-2">檔案內容</div>
              <MediaUploader
                v-model="uploadFiles"
                :is-uploading="processing"
                :upload-progress="uploadProgress"
                accept="image/*,.pdf,.txt,.doc,.docx"
                label="選擇照片或文件"
              />
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="bg-gray-50 p-3">
          <q-btn flat label="取消" @click="closeCreateDialog" :disable="processing" class="text-gray-600" />
          <q-btn
            color="amber-6"
            :label="processing ? `上傳中 ${uploadProgress}%` : (isAddFilesMode ? '確認新增' : '建立紀錄')"
            @click="handleSubmit"
            :loading="processing"
            :disable="!canSubmit"
            class="px-6"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Record Info Dialog -->
    <q-dialog v-model="showEditDialog">
      <q-card style="width: 400px; max-width: 95vw;">
        <q-card-section>
          <div class="text-lg font-bold mb-4">編輯紀錄資訊</div>
          <q-input v-model="editDate" type="date" label="日期" outlined dense class="mb-3" />
          <q-input v-model="editName" label="標題" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn flat label="儲存" color="amber-6" @click="submitEditRecord" :loading="processing" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Viewer & Other Dialogs (Reusing existing simplified) -->
    <q-dialog v-model="showViewer" maximized transition-show="slide-up" transition-hide="slide-down">
        <q-card class="text-gray-600 flex flex-col h-full">
        <q-bar class="bg-gray-100 pt-4 flex-none">
          <div class="col truncate font-bold">
            {{ viewingFile?.name }}
          </div>
        </q-bar>
        <q-bar class="bg-gray-100 flex justify-end flex-none">
          <div class="flex items-center gap-2 scale-125">
            <q-btn dense flat icon="share" @click="shareFile" 
              title="分享"
            />
            <q-btn dense flat icon="open_in_new" @click="openInNewTab" title="在新分頁開啟" 
            />
            <q-btn dense flat icon="close" v-close-popup 
            />
          </div>
        </q-bar>

        <q-card-section class="flex-grow flex flex-col items-center justify-center relative overflow-hidden p-0 bg-black">
          <!-- Main Content -->
          <div 
            class="w-full h-full flex items-center justify-center"
            @touchstart="onViewerTouchStart"
            @touchmove="onViewerTouchMove"
            @touchend="onViewerTouchEnd"
          >
            <img
              v-if="isImage(viewingFile)"
              :src="viewingFile.url"
              class="max-h-full max-w-full object-contain select-none origin-center"
              :style="viewerImageStyle"
              draggable="false"
            />
            <iframe
              v-else-if="isPdf(viewingFile)"
              :src="viewingFile.url"
              class="w-full h-full bg-white"
            />
            <div v-else class="text-center text-white">
              <q-icon name="insert_drive_file" size="64px" color="grey" />
              <div class="mt-4">此檔案類型不支援預覽</div>
              <q-btn color="amber" label="下載 / 開啟" class="mt-4" @click="openInNewTab" />
            </div>
          </div>

          <!-- Navigation Buttons (Overlay) -->
          <q-btn
            v-if="hasPrev"
            flat
            round
            color="white"
            icon="chevron_left"
            size="md"
            class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50"
            @click.stop="prevFile"
          />
          <q-btn
            v-if="hasNext"
            flat
            round
            color="white"
            icon="chevron_right"
            size="md"
            class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50"
            @click.stop="nextFile"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="dialogState.show"
      :title="dialogState.title"
      :message="dialogState.message"
      :loading="dialogState.loading"
      confirm-label="刪除"
      confirm-color="red"
      @confirm="onDialogConfirm"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/userStore';
import { notification } from 'src/boot/notification';
import MediaUploader from 'src/components/MediaUploader.vue';
import ConfirmDialog from 'src/components/ConfirmDialog.vue';
import PdfThumbnail from 'src/components/PdfThumbnail.vue';
import {
  db, collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, storage, storageRef, deleteObject, arrayUnion, 
} from 'src/boot/firebase';
import { uploadPetFiles } from 'src/services/petFileService';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const petId = computed(() => route.params.id);

// State
const loading = ref(true);
const processing = ref(false);
const records = ref([]);
const uploadProgress = ref(0);

// Filters
const filterYear = ref(null);
const filterMonth = ref(null);
const searchText = ref('');

// Dialogs
const showCreateDialog = ref(false);
const isAddFilesMode = ref(false);
const targetRecord = ref(null);

const recordDate = ref('');
const recordName = ref('');
const uploadFiles = ref([]);

const showEditDialog = ref(false);
const editDate = ref('');
const editName = ref('');
const editingRecord = ref(null);

const showViewer = ref(false);
const viewingFile = ref(null);

// Options
const yearOptions = computed(() => {
  const years = new Set(records.value.map(r => r.date.substring(0, 4)));
  return Array.from(years).sort().reverse();
});

const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

// Computed
const filteredRecords = computed(() => {
  let res = [...records.value];
  if (filterYear.value) res = res.filter(r => r.date.startsWith(filterYear.value));
  if (filterMonth.value) res = res.filter(r => r.date.substring(5, 7) === filterMonth.value);
  if (searchText.value) {
    const low = searchText.value.toLowerCase();
    res = res.filter(r => r.name.toLowerCase().includes(low));
  }
  // Sort by date desc
  return res.sort((a, b) => b.date.localeCompare(a.date));
});

const canSubmit = computed(() => {
  if (isAddFilesMode.value) {
    return uploadFiles.value.length > 0;
  }
  return recordDate.value && recordName.value;
});

// Helpers
const isImage = (f) => f?.type === 'image' || f?.fileCategory === 'image' || f?.mimeType?.startsWith('image/');
const isPdf = (f) => f?.type === 'pdf' || f?.fileCategory === 'pdf' || f?.mimeType === 'application/pdf';
const todayYmd = () => new Date().toISOString().split('T')[0];

// Actions
const fetchRecords = async () => {
  if (!userStore.family?.id || !petId.value) return;
  loading.value = true;
  try {
    const q = query(
      collection(db, 'petFiles'),
      where('familyId', '==', userStore.family.id),
      where('petId', '==', petId.value)
    );
    const snap = await getDocs(q);
    
    // Transform Data
    const results = [];
    snap.forEach(d => {
      const data = d.data();
      // Detect New Format vs Legacy
      if (data.files && Array.isArray(data.files)) {
        // New Format: One Doc = Multiple Files
        results.push({ id: d.id, ...data });
      } else {
        // Legacy Format: One Doc = One File
        // Convert to Record structure on the fly
        results.push({
          id: d.id,
          date: data.date || 'Unknown',
          name: data.name || '未命名檔案',
          isLegacy: true,
          files: [{
            url: data.url,
            name: data.originalName || data.name,
            type: data.fileCategory || 'other',
            storagePath: data.storagePath,
            size: data.size
          }]
        });
      }
    });
    records.value = results;
  } catch (e) {
    console.error(e);
    notification.error('載入紀錄失敗');
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push(`/pets/${petId.value}`);
};

// Dialog Handlers
const openCreateDialog = () => {
  isAddFilesMode.value = false;
  targetRecord.value = null;
  recordDate.value = todayYmd();
  recordName.value = '';
  uploadFiles.value = [];
  showCreateDialog.value = true;
};

const openAddFilesDialog = (record) => {
  if (record.isLegacy) {
    notification.warning('舊格式紀錄無法直接新增檔案，請建立新紀錄');
    return;
  }
  isAddFilesMode.value = true;
  targetRecord.value = record;
  uploadFiles.value = [];
  showCreateDialog.value = true;
};

const closeCreateDialog = () => {
  showCreateDialog.value = false;
  uploadFiles.value = [];
};

const handleSubmit = async () => {
  if (!userStore.family?.id || !petId.value) return;
  
  processing.value = true;
  uploadProgress.value = 0;

  try {
    const filesToUpload = uploadFiles.value.map(f => f.file).filter(Boolean);
    
    // 1. Upload Files
    let uploadedData = [];
    if (filesToUpload.length > 0) {
      uploadedData = await uploadPetFiles(
        filesToUpload,
        { familyId: userStore.family.id, petId: petId.value },
        (pct) => { uploadProgress.value = pct; }
      );
      
      // Filter out errors
      uploadedData = uploadedData.filter(r => !r.error).map(r => ({
        url: r.url,
        name: r.originalName || 'file',
        type: r.fileCategory,
        mimeType: r.mimeType,
        size: r.size,
        storagePath: r.storagePath
      }));
    }

    // 2. Save to Firestore
    if (isAddFilesMode.value && targetRecord.value) {
      // Append to existing
      const ref = doc(db, 'petFiles', targetRecord.value.id);
      await updateDoc(ref, {
        files: arrayUnion(...uploadedData),
        updatedAt: serverTimestamp()
      });
      notification.success(`已新增 ${uploadedData.length} 個檔案`);
    } else {
      // Create New Record
      const newDoc = {
        familyId: userStore.family.id,
        petId: petId.value,
        date: recordDate.value,
        name: recordName.value || '未命名紀錄',
        files: uploadedData,
        createdAt: serverTimestamp(),
        createdBy: userStore.user?.uid
      };
      await addDoc(collection(db, 'petFiles'), newDoc);
      notification.success('建立成功');
    }

    await fetchRecords();
    closeCreateDialog();
  } catch (e) {
    console.error(e);
    notification.error('處理失敗');
  } finally {
    processing.value = false;
  }
};

// Edit Record Logic
const openEditRecordDialog = (record) => {
  editingRecord.value = record;
  editDate.value = record.date;
  editName.value = record.name;
  showEditDialog.value = true;
};

const submitEditRecord = async () => {
  if (!editingRecord.value) return;
  processing.value = true;
  try {
    await updateDoc(doc(db, 'petFiles', editingRecord.value.id), {
      date: editDate.value,
      name: editName.value,
      updatedAt: serverTimestamp()
    });
    // Optimistic Update
    const idx = records.value.findIndex(r => r.id === editingRecord.value.id);
    if (idx !== -1) {
      records.value[idx].date = editDate.value;
      records.value[idx].name = editName.value;
    }
    showEditDialog.value = false;
    notification.success('更新成功');
  } catch (e) {
    console.error(e);
    notification.error('更新失敗');
  } finally {
    processing.value = false;
  }
};

// Delete Logic
const dialogState = ref({
  show: false,
  title: '',
  message: '',
  loading: false,
  onConfirm: null
});

const onDialogConfirm = async () => {
  if (!dialogState.value.onConfirm) return;
  
  // 設置 dialog 自身的 loading
  dialogState.value.loading = true;
  try {
    await dialogState.value.onConfirm();
    // 成功執行後關閉 dialog
    dialogState.value.show = false;
  } catch (e) {
    console.error(e);
    // 錯誤已在個別函式中處理，這裡主要是確保 dialog 狀態重置
  } finally {
    dialogState.value.loading = false;
  }
};

const confirmDeleteRecord = (record) => {
  dialogState.value = {
    show: true,
    title: '刪除紀錄',
    message: `確定要刪除「${record.name}」及其所有檔案嗎？此動作無法復原。`,
    loading: false,
    onConfirm: () => deleteRecord(record)
  };
};

const deleteRecord = async (record) => {
  // loading.value = true; // 移除頁面級 loading，改用 dialog loading
  try {
    // 1. Delete all files in storage
    const deletePromises = record.files
      .filter(f => f.storagePath)
      .map(f => deleteObject(storageRef(storage, f.storagePath)).catch(e => console.warn(e)));
    
    await Promise.all(deletePromises);

    // 2. Delete Doc
    await deleteDoc(doc(db, 'petFiles', record.id));
    
    records.value = records.value.filter(r => r.id !== record.id);
    notification.success('紀錄已刪除');
  } catch (e) {
    console.error(e);
    notification.error('刪除失敗');
    throw e; // 拋出錯誤讓 dialog 知道
  } finally {
    // loading.value = false;
  }
};

const confirmDeleteFile = (record, file, idx) => {
  dialogState.value = {
    show: true,
    title: '刪除檔案',
    message: `確定要刪除「${file.name}」嗎？此動作無法復原。`,
    loading: false,
    onConfirm: () => executeDeleteFile(record, file, idx)
  };
};

const executeDeleteFile = async (record, file, idx) => {
  if (record.isLegacy) {
    // Legacy: Deleting the file means deleting the whole doc
    await deleteRecord(record);
    return;
  }

  // New Format: Remove from array
  try {
    // 1. Delete from Storage
    if (file.storagePath) {
      await deleteObject(storageRef(storage, file.storagePath)).catch(console.warn);
    }
    
    // 2. Update Firestore
    const newFiles = record.files.filter((_, index) => index !== idx);
    await updateDoc(doc(db, 'petFiles', record.id), {
      files: newFiles
    });
    
    // Update local state
    record.files = newFiles;
    notification.success('檔案已刪除');
  } catch (e) {
    console.error(e);
    notification.error('刪除失敗');
    throw e;
  }
};

// Viewer
const viewingRecord = ref(null);
const viewerImageStyle = computed(() => {
  return {
    transform: `translate(${pointerState.value.x}px, ${pointerState.value.y}px) scale(${pointerState.value.scale})`,
    transition: pointerState.value.isGesturing ? 'none' : 'transform 0.2s ease-out',
    touchAction: 'none' // 重要：防止瀏覽器預設捲動
  };
});

// Zoom & Pan Logic
const pointerState = ref({
  scale: 1,
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  startScale: 1,
  isGesturing: false
});

let lastDistance = 0;

const resetZoom = () => {
  pointerState.value = {
    scale: 1,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    startScale: 1,
    isGesturing: false
  };
};

const onViewerTouchStart = (e) => {
  if (e.touches.length === 2) {
    // 雙指：開始縮放
    pointerState.value.isGesturing = true;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastDistance = Math.sqrt(dx * dx + dy * dy);
    pointerState.value.startScale = pointerState.value.scale;
  } else if (e.touches.length === 1 && pointerState.value.scale > 1) {
    // 單指且已放大：開始平移
    pointerState.value.isGesturing = true;
    pointerState.value.startX = e.touches[0].clientX - pointerState.value.x;
    pointerState.value.startY = e.touches[0].clientY - pointerState.value.y;
  }
};

const onViewerTouchMove = (e) => {
  if (!pointerState.value.isGesturing) return;
  e.preventDefault(); // 防止背景捲動

  if (e.touches.length === 2) {
    // 雙指縮放
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (lastDistance > 0) {
      const ratio = distance / lastDistance;
      const newScale = Math.min(Math.max(pointerState.value.startScale * ratio, 1), 4); // 限制 1x ~ 4x
      pointerState.value.scale = newScale;
    }
  } else if (e.touches.length === 1 && pointerState.value.scale > 1) {
    // 單指平移 (限制在放大模式下)
    pointerState.value.x = e.touches[0].clientX - pointerState.value.startX;
    pointerState.value.y = e.touches[0].clientY - pointerState.value.startY;
  }
};

const onViewerTouchEnd = () => {
  pointerState.value.isGesturing = false;
  if (pointerState.value.scale < 1.1) {
    // 如果縮放太小，自動彈回原始大小並重置位置
    resetZoom();
  }
};

const openViewer = (file, record) => {
  viewingFile.value = file;
  viewingRecord.value = record;
  showViewer.value = true;
  resetZoom(); // 每次開啟重置
};

// 切換上一張/下一張
const hasPrev = computed(() => {
  if (!viewingRecord.value || !viewingFile.value) return false;
  // 放大時隱藏切換按鈕，避免誤觸
  if (pointerState.value.scale > 1.1) return false;
  const idx = viewingRecord.value.files.indexOf(viewingFile.value);
  return idx > 0;
});

const hasNext = computed(() => {
  if (!viewingRecord.value || !viewingFile.value) return false;
  // 放大時隱藏切換按鈕，避免誤觸
  if (pointerState.value.scale > 1.1) return false;
  const idx = viewingRecord.value.files.indexOf(viewingFile.value);
  return idx !== -1 && idx < viewingRecord.value.files.length - 1;
});

const prevFile = () => {
  if (!hasPrev.value) return;
  resetZoom(); // 切換時重置縮放
  const idx = viewingRecord.value.files.indexOf(viewingFile.value);
  viewingFile.value = viewingRecord.value.files[idx - 1];
};

const nextFile = () => {
  if (!hasNext.value) return;
  resetZoom(); // 切換時重置縮放
  const idx = viewingRecord.value.files.indexOf(viewingFile.value);
  viewingFile.value = viewingRecord.value.files[idx + 1];
};

const openInNewTab = () => {
  if (viewingFile.value?.url) window.open(viewingFile.value.url, '_blank');
};

const shareFile = async () => {
  const file = viewingFile.value;
  if (!file?.url) return;

  const title = file.name || '檔案分享';
  const url = file.url;

  // 1. Try Native Share (Mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: `查看檔案：${title}`,
        url: url
      });
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed', err);
      } else {
        return; // User cancelled
      }
    }
  }

  // 2. Fallback: Copy Link
  try {
    await navigator.clipboard.writeText(url);
    notification.success('連結已複製到剪貼簿');
  } catch (err) {
    console.error('Clipboard failed', err);
    notification.info('無法自動複製，請手動複製網址');
    // If we really want to be robust, we could show a dialog with the URL here
    // But for now, notification is usually enough for modern browsers
  }
};

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped>
/* Optional: Custom scrollbar styling for the dialog */
.scroll {
  overflow-y: auto;
}
</style>