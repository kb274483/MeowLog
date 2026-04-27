<template>
  <div class="pet-daily-record ml-card mx-4 mb-6 relative">
    <!-- Saving overlay -->
    <div v-if="isSaving || isUploading" class="save-overlay">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Header row -->
    <div class="record-header">
      <div>
        <div class="record-title">
          {{ selectedDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
        </div>
        <div class="record-sub">日常記錄</div>
      </div>
      <button
        @click="saveRecord"
        class="save-btn"
        :class="{ 'save-btn--active': hasChanges && !isSaving, 'save-btn--disabled': !hasChanges || isSaving }"
        :disabled="!hasChanges || isSaving"
      >
        {{ isSaving ? '儲存中...' : '儲存' }}
      </button>
    </div>

    <!-- ── Tags ── -->
    <div class="form-section">
      <div class="ml-field-label">🏷 標記（可複選）</div>
      <q-select
        v-model="formData.tags"
        multiple
        :options="dailyTags"
        dense
        outlined
        use-chips
        class="w-full mt-1"
        color="primary"
      />
    </div>

    <!-- ── Food ── -->
    <div class="form-section">
      <div class="ml-section-header">
        <div class="ml-section-header__icon">
          <q-icon name="restaurant" style="font-size:15px;" />
        </div>
        <div class="ml-section-header__title">飲食記錄</div>
      </div>

      <div class="ml-field-label">濕食攝取量（罐）</div>
      <div class="flex flex-wrap gap-1.5 mt-2 mb-4">
        <button
          v-for="preset in wetFoodPresets"
          :key="preset.value"
          type="button"
          @click="formData.wetFoodAmount = preset.value"
          class="wet-preset"
          :class="{ active: isWetFoodPresetActive(preset.value) }"
        >{{ preset.label }}</button>
      </div>
      <input
        v-model.number="formData.wetFoodAmount"
        type="number" min="0" step="0.05"
        placeholder="自訂（罐）"
        class="ml-input mb-1"
      />

      <div class="ml-field-label mt-4">乾糧攝取量（g）</div>
      <input
        v-model.number="formData.foodAmount"
        type="number" min="0"
        placeholder="—"
        class="ml-input mb-1"
      />

      <div class="ml-cal-summary">
        <span class="ml-cal-summary__label">總熱量攝取</span>
        <span
          class="ml-cal-summary__value"
          :class="{ 'ml-cal-summary__value--zero': calculatedCalories === 0 }"
        >{{ calculatedCalories }} kcal</span>
      </div>

      <div v-if="needsCalorieSettings" class="cal-setting-hint">
        <q-icon name="info" style="font-size:14px;" />
        <span>尚未設定熱量參數，無法計算總熱量</span>
        <button type="button" @click="goToCalorieSettings" class="cal-setting-link">
          前往設定 →
        </button>
      </div>
    </div>

    <!-- ── Symptoms (steppers) ── -->
    <div class="form-section">
      <div class="ml-section-header">
        <div class="ml-section-header__icon">
          <q-icon name="sick" style="font-size:15px;" />
        </div>
        <div class="ml-section-header__title">症狀次數</div>
      </div>
      <div class="grid grid-cols-2 gap-3">

        <!-- 嘔吐 -->
        <div
          class="ml-symptom-card"
          :class="vomitCount > 0 ? 'ml-symptom-card--vomit' : 'ml-symptom-card--inactive'"
        >
          <div class="ml-symptom-card__label">嘔吐次數</div>
          <div class="ml-stepper">
            <button class="ml-stepper__btn" @click="decrementVomit">−</button>
            <span class="ml-stepper__value">{{ vomitCount }}</span>
            <button class="ml-stepper__btn" @click="incrementVomit">+</button>
          </div>
        </div>

        <!-- 腹瀉 -->
        <div
          class="ml-symptom-card"
          :class="diarrheaCount > 0 ? 'ml-symptom-card--diarrhea' : 'ml-symptom-card--inactive'"
        >
          <div class="ml-symptom-card__label">腹瀉次數</div>
          <div class="ml-stepper">
            <button class="ml-stepper__btn" @click="decrementDiarrhea">−</button>
            <span class="ml-stepper__value">{{ diarrheaCount }}</span>
            <button class="ml-stepper__btn" @click="incrementDiarrhea">+</button>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Vitals ── -->
    <div class="form-section">
      <div class="ml-section-header">
        <div class="ml-section-header__icon">
          <q-icon name="monitor_heart" style="font-size:15px;" />
        </div>
        <div class="ml-section-header__title">生命徵象</div>
      </div>
      <div class="grid grid-cols-2 gap-x-5 gap-y-4">
        <div>
          <div class="ml-field-label">呼吸次數</div>
          <div class="flex items-baseline gap-1">
            <input v-model.number="formData.respirationRate" type="number" min="0" placeholder="—" class="ml-input" />
            <span class="input-unit">次/分</span>
          </div>
          <div class="input-hint">正常: 20–35</div>
        </div>
        <div>
          <div class="ml-field-label">心跳次數</div>
          <div class="flex items-baseline gap-1">
            <input v-model.number="formData.heartRate" type="number" min="0" placeholder="—" class="ml-input" />
            <span class="input-unit">次/分</span>
          </div>
          <div class="input-hint">正常: 120–180</div>
        </div>
        <div>
          <div class="ml-field-label">體重</div>
          <div class="flex items-baseline gap-1">
            <input v-model.number="formData.dailyWeight" type="number" min="0" step="0.01" placeholder="—" class="ml-input" />
            <span class="input-unit">kg</span>
          </div>
        </div>
        <div>
          <div class="ml-field-label">體溫</div>
          <div class="flex items-baseline gap-1">
            <input v-model.number="formData.temperature" type="number" min="0" step="0.1" placeholder="—" class="ml-input" />
            <span class="input-unit">°C</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Notes ── -->
    <div class="form-section">
      <div class="ml-section-header">
        <div class="ml-section-header__icon">
          <q-icon name="edit_note" style="font-size:15px;" />
        </div>
        <div class="ml-section-header__title">備註</div>
      </div>
      <textarea
        v-model="formData.notes"
        rows="3"
        placeholder="今天的狀況…"
        class="notes-area"
      ></textarea>
    </div>

    <!-- ── Media ── -->
    <div class="form-section" style="margin-bottom:0;">
      <media-uploader
        v-model="formData.mediaFiles"
        :is-uploading="isUploading"
        :upload-progress="uploadProgress"
        @file-change="handleFileChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  db, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'src/boot/firebase';
import { notification } from 'src/boot/notification';
import { useUserStore } from 'src/stores/userStore';
import MediaUploader from 'src/components/MediaUploader.vue';
import { uploadMediaFiles, getCleanMediaFiles } from 'src/services/mediaUploadService';
import { cacheGet, cacheSet } from 'src/utils/idbCache';

const props = defineProps({
  petId:        { type: String, required: true },
  selectedDate: { type: Date,   required: true }
});

const emit = defineEmits(['saved']);

const userStore    = useUserStore();
const router       = useRouter();
const isUploading  = ref(false);
const isSaving     = ref(false);
const uploadProgress = ref(0);
const originalData   = ref(null);
const currentRecordId = ref(null);
const loadSeq        = ref(0);

// ── Local stepper state (mirrors formData.vomitCount / diarrheaCount) ──
const vomitCount    = ref(0);
const diarrheaCount = ref(0);

const incrementVomit    = () => { vomitCount.value++;    syncSymptoms(); };
const decrementVomit    = () => { vomitCount.value = Math.max(0, vomitCount.value - 1); syncSymptoms(); };
const incrementDiarrhea = () => { diarrheaCount.value++; syncSymptoms(); };
const decrementDiarrhea = () => { diarrheaCount.value = Math.max(0, diarrheaCount.value - 1); syncSymptoms(); };

const syncSymptoms = () => {
  formData.hasVomit     = vomitCount.value > 0;
  formData.vomitCount   = vomitCount.value > 0 ? vomitCount.value : null;
  formData.hasDiarrhea  = diarrheaCount.value > 0;
  formData.diarrheaCount = diarrheaCount.value > 0 ? diarrheaCount.value : null;
};

// Keep local steppers in sync when data loads from DB
const applySteppersFromFormData = () => {
  vomitCount.value    = formData.hasVomit    ? (formData.vomitCount    || 1) : 0;
  diarrheaCount.value = formData.hasDiarrhea ? (formData.diarrheaCount || 1) : 0;
};

const dailyTags = ref(['回診', '疫苗', '驅蟲', '洗澡', '美容', '其他'])

// ── Form data ──
const formData = reactive({
  tags:            [],
  foodAmount:      null,
  wetFoodAmount:   0,
  calories:        null,
  hasVomit:        false,
  vomitCount:      null,
  hasDiarrhea:     false,
  diarrheaCount:   null,
  dailyWeight:     null,
  respirationRate: null,
  heartRate:       null,
  temperature:     null,
  notes:           '',
  mediaFiles:      []
});

// ── Wet food presets ──
const wetFoodPresets = [
  { label: '0',  value: 0      },
  { label: '1/4',value: 0.25   },
  { label: '1/3',value: 0.3333 },
  { label: '1/2',value: 0.5    },
  { label: '2/3',value: 0.6667 },
  { label: '3/4',value: 0.75   },
  { label: '1',  value: 1      },
  // { label: '1½', value: 1.5    },
  // { label: '2',  value: 2      },
];

const isWetFoodPresetActive = (presetValue) => Math.abs((formData.wetFoodAmount || 0) - presetValue) < 0.001;

// ── Calories ──
const caloriesFromInputs = computed(() => {
  if (!userStore.family) return 0;
  const wetCals = (formData.wetFoodAmount || 0) * (userStore.family.wetFoodCalories || 0);
  const dryCals = (formData.foodAmount    || 0) * (userStore.family.dryFoodCalories || 0);
  return Math.round(wetCals + dryCals);
});

const shouldUseStoredCalories = computed(() => {
  if (!originalData.value) return false;
  const hasStored = formData.calories !== null && formData.calories !== undefined;
  if (!hasStored) return false;
  return formData.foodAmount === originalData.value.foodAmount &&
         formData.wetFoodAmount === originalData.value.wetFoodAmount;
});

const calculatedCalories = computed(() =>
  shouldUseStoredCalories.value ? (Number(formData.calories) || 0) : caloriesFromInputs.value
);

const needsCalorieSettings = computed(() => {
  const family = userStore.family;
  if (!family) return false;
  const wetMissing = !family.wetFoodCalories;
  const dryMissing = !family.dryFoodCalories;
  const hasWetInput = (formData.wetFoodAmount || 0) > 0;
  const hasDryInput = (formData.foodAmount || 0) > 0;
  return (hasWetInput && wetMissing) || (hasDryInput && dryMissing);
});

const goToCalorieSettings = () => {
  router.push({ path: '/', query: { openSettings: '1' } });
};

// ── Change detection (include stepper counts) ──
const hasChanges = computed(() => {
  if (!originalData.value) return false;
  return JSON.stringify({
    tags: formData.tags, foodAmount: formData.foodAmount, wetFoodAmount: formData.wetFoodAmount,
    hasVomit: formData.hasVomit, vomitCount: formData.vomitCount,
    hasDiarrhea: formData.hasDiarrhea, diarrheaCount: formData.diarrheaCount,
    dailyWeight: formData.dailyWeight, respirationRate: formData.respirationRate,
    heartRate: formData.heartRate, temperature: formData.temperature,
    notes: formData.notes, mediaFilesCount: formData.mediaFiles.length
  }) !== JSON.stringify({
    tags: originalData.value.tags, foodAmount: originalData.value.foodAmount, wetFoodAmount: originalData.value.wetFoodAmount,
    hasVomit: originalData.value.hasVomit, vomitCount: originalData.value.vomitCount,
    hasDiarrhea: originalData.value.hasDiarrhea, diarrheaCount: originalData.value.diarrheaCount,
    dailyWeight: originalData.value.dailyWeight, respirationRate: originalData.value.respirationRate,
    heartRate: originalData.value.heartRate, temperature: originalData.value.temperature,
    notes: originalData.value.notes, mediaFilesCount: originalData.value.mediaFiles.length
  });
});

watch(() => props.selectedDate, (newDate) => { loadDailyRecord(newDate); });
onMounted(() => { loadDailyRecord(props.selectedDate); });

// ── Load from Firestore ──
const loadDailyRecord = async (date) => {
  if (!userStore.isLoggedIn || !userStore.hasFamily || !props.petId) return;
  try {
    const seq = ++loadSeq.value;
    const dateString = formatDate(date);
    const recordId   = `${props.petId}_${dateString}`;
    currentRecordId.value = recordId;
    const cacheKey = `petDailyRecord:${userStore.family.id}:${recordId}`;

    const defaultData = {
      tags: [], foodAmount: null, wetFoodAmount: 0, calories: null,
      hasVomit: false, vomitCount: null, hasDiarrhea: false, diarrheaCount: null,
      dailyWeight: null, respirationRate: null, heartRate: null, temperature: null,
      notes: '', mediaFiles: []
    };

    // Cache-first
    const cached = await cacheGet(cacheKey, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 });
    if (cached && typeof cached === 'object') {
      Object.assign(formData, {
        ...defaultData, ...cached,
        mediaFiles: (cached.mediaFiles || []).map(f => ({ ...f, loading: false, loadError: false }))
      });
      originalData.value = JSON.parse(JSON.stringify(formData));
      applySteppersFromFormData();
    }

    const recordRef = doc(db, 'petDailyRecords', recordId);
    const recordDoc = await getDoc(recordRef);

    if (recordDoc.exists()) {
      const recordData = recordDoc.data();
      if (recordData.tag && !recordData.tags) recordData.tags = [recordData.tag];
      else if (!recordData.tags) recordData.tags = [];
      if (!recordData.wetFoodAmountV2) recordData.wetFoodAmount = (recordData.wetFoodAmount || 0) / 10;

      const mediaFiles = (recordData.mediaFiles || []).map(f => ({ ...f, loading: false, loadError: false }));
      if (seq === loadSeq.value && currentRecordId.value === recordId && !hasChanges.value) {
        Object.assign(formData, { ...defaultData, ...recordData, mediaFiles });
        originalData.value = JSON.parse(JSON.stringify(formData));
        applySteppersFromFormData();
      }

      const { ...cacheSafeData } = recordData || {};
      void cacheSet(cacheKey, {
        ...cacheSafeData,
        mediaFiles: (recordData.mediaFiles || [])
          .map(f => ({ url: f?.url||null, type: f?.type||'image', name: f?.name||'file', timestamp: f?.timestamp||Date.now() }))
          .filter(f => !!f.url)
      });
    } else {
      if (seq === loadSeq.value && !cached) {
        Object.assign(formData, defaultData);
        originalData.value = JSON.parse(JSON.stringify(defaultData));
        applySteppersFromFormData();
      }
    }
  } catch (error) {
    console.error('Failed to load daily record:', error);
    if (!originalData.value) notification.error('載入日期記錄失敗');
  }
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Save ──
const saveRecord = async () => {
  if (!userStore.isLoggedIn || !userStore.hasFamily || !props.petId) {
    notification.error('未登入或無家庭資訊'); return;
  }
  try {
    isSaving.value = true;
    const hasNewFiles = formData.mediaFiles.some(f => f.isNew);
    isUploading.value = hasNewFiles;
    uploadProgress.value = 0;

    if (hasNewFiles) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const dateString = formatDate(props.selectedDate);
    const recordId   = `${props.petId}_${dateString}`;
    const uploadOptions = { familyId: userStore.family.id, petId: props.petId, dateString };

    let updatedMediaFiles = [...formData.mediaFiles];
    if (hasNewFiles) {
      try {
        updatedMediaFiles = await uploadMediaFiles(formData.mediaFiles, uploadOptions, p => { uploadProgress.value = p; });
      } catch (uploadError) {
        console.error('媒體上傳失敗:', uploadError);
        notification.error('部分媒體文件上傳失敗，但記錄仍會儲存');
        updatedMediaFiles = formData.mediaFiles.map(f => f.isNew ? { ...f, loadError: true } : f);
      }
    }
    formData.mediaFiles = updatedMediaFiles;

    let cleanMediaFiles = [];
    try {
      cleanMediaFiles = getCleanMediaFiles(formData.mediaFiles);
    } catch {
      cleanMediaFiles = formData.mediaFiles
        .map(f => ({ url: f.url||null, type: f.type||'image', name: f.name||'file', timestamp: f.timestamp||Date.now() }))
        .filter(f => f.url);
    }

    const recordData = {
      petId:           props.petId,
      familyId:        userStore.family.id,
      date:            dateString,
      tags:            formData.tags || [],
      tag:             formData.tags.length > 0 ? formData.tags[0] : null,
      foodAmount:      formData.foodAmount || null,
      wetFoodAmount:   formData.wetFoodAmount || 0,
      wetFoodAmountV2: true,
      calories:        calculatedCalories.value,
      hasVomit:        formData.hasVomit || false,
      vomitCount:      formData.hasVomit ? (formData.vomitCount || 1) : null,
      hasDiarrhea:     formData.hasDiarrhea || false,
      diarrheaCount:   formData.hasDiarrhea ? (formData.diarrheaCount || 1) : null,
      dailyWeight:     formData.dailyWeight || null,
      respirationRate: formData.respirationRate || null,
      heartRate:       formData.heartRate || null,
      temperature:     formData.temperature || null,
      notes:           formData.notes || null,
      mediaFiles:      cleanMediaFiles || [],
      updatedAt:       serverTimestamp(),
      updatedBy:       userStore.user.uid
    };
    Object.keys(recordData).forEach(k => { if (recordData[k] === undefined) recordData[k] = null; });

    await setDoc(doc(db, 'petDailyRecords', recordId), recordData);

    // Update IDB cache
    const cacheKey = `petDailyRecord:${userStore.family.id}:${recordId}`;
    const { ...cacheSafeData } = recordData || {};
    void cacheSet(cacheKey, {
      ...cacheSafeData,
      mediaFiles: (cleanMediaFiles || []).map(f => ({ url:f?.url||null, type:f?.type||'image', name:f?.name||'file', timestamp:f?.timestamp||Date.now() })).filter(f=>!!f.url)
    });

    // Update monthly summary cache
    try {
      const ym = String(dateString || '').slice(0, 7);
      const summaryKey = `petDailySummary:${userStore.family.id}:${props.petId}:${ym}`;
      const existing = (await cacheGet(summaryKey, { maxAgeMs: 1000*60*60*24*30 })) || {};
      const tags = recordData.tags || (recordData.tag ? [recordData.tag] : []);
      const summary = { hasRecord:true, tag:recordData.tag||null, tags, hasNotes:!!recordData.notes, hasVomit:recordData.hasVomit||false, hasDiarrhea:recordData.hasDiarrhea||false, dailyWeight:recordData.dailyWeight||null, temperature:recordData.temperature||null };
      const merged = { ...(existing && typeof existing === 'object' ? existing : {}) };
      merged[dateString] = summary;
      void cacheSet(summaryKey, merged);
    } catch { /* best-effort */ }

    formData.calories = recordData.calories;
    originalData.value = JSON.parse(JSON.stringify(formData));

    if (formData.dailyWeight) await updatePetWeight(formData.dailyWeight);

    if (formData.mediaFiles.some(f => f.loadError)) notification.warning('記錄已儲存，但部分媒體文件上傳失敗');
    else notification.success('記錄已儲存');

    emit('saved', {
      date: props.selectedDate, hasRecord: true,
      tags: formData.tags || [],
      tag: formData.tags.length > 0 ? formData.tags[0] : null,
      hasNotes: !!formData.notes,
      hasVomit: formData.hasVomit, hasDiarrhea: formData.hasDiarrhea,
      weightUpdated: !!formData.dailyWeight, dailyWeight: formData.dailyWeight || null,
      temperature: formData.temperature || null
    });
  } catch (error) {
    console.error('儲存記錄失敗:', error);
    notification.error('儲存記錄失敗: ' + (error.message || '未知錯誤'));
  } finally {
    setTimeout(() => {
      isUploading.value = false; uploadProgress.value = 0;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      isSaving.value = false;
    }, 500);
  }
};

const updatePetWeight = async (weight) => {
  try {
    await updateDoc(doc(db, 'pets', props.petId), { weight, weightUpdatedAt: serverTimestamp() });
  } catch (error) { console.error('更新寵物體重失敗:', error); }
};

const handleFileChange = (newFiles) => { console.log('收到新文件:', newFiles); };
</script>

<style scoped>
.pet-daily-record {
  padding: 18px 16px 20px;
  position: relative;
}

/* ── Saving overlay ── */
.save-overlay {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 10; border-radius: var(--ml-r-sm);
}

/* ── Header ── */
.record-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 18px;
}

.record-title {
  font-size: 14px; font-weight: 700; color: var(--ml-text);
  line-height: 1.3;
}

.record-sub {
  font-size: 11px; color: var(--ml-text-muted); margin-top: 2px;
}

.save-btn {
  flex-shrink: 0;
  border: none; border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}
.save-btn--active {
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  color: #fff;
}
.save-btn--disabled {
  background: var(--ml-border);
  color: var(--ml-text-muted);
  cursor: not-allowed;
}

/* ── Form sections ── */
.form-section {
  padding-bottom: .5rem;
  margin-bottom: .5rem;
  /* border-bottom: 1px solid var(--ml-border); */
}
.form-section:last-child {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
}

/* ── Input hints ── */
.input-unit {
  font-size: 12px; color: var(--ml-text-muted);
  flex-shrink: 0; margin-left: 4px;
}
.input-hint {
  font-size: 10px; color: var(--ml-text-muted); margin-top: 3px;
}

/* ── Notes textarea ── */
.notes-area {
  width: 100%;
  border: none;
  border-bottom: 1.5px solid var(--ml-border);
  padding: 6px 0;
  font-size: 14px; color: var(--ml-text);
  background: transparent; outline: none; resize: none;
  font-family: inherit; line-height: 1.6; margin-top: 6px;
}
.notes-area:focus { border-bottom-color: var(--ml-primary); }
.notes-area::placeholder { color: var(--ml-text-muted); }

/* ── Calorie settings hint ── */
.cal-setting-hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  background: #FFF7E6;
  border: 1px solid #FFE0A3;
  border-radius: 8px;
  font-size: 12px;
  color: #8A5A00;
}
.cal-setting-link {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #D97810;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.cal-setting-link:hover { text-decoration: underline; }
</style>
