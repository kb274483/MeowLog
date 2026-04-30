<template>
  <div class="pet-details-page">

    <!-- ── Sub-header (fixed, below MainLayout header) ── -->
    <div ref="subHeaderRef" class="pet-sub-header print-hidden" style="top: 52px;">
      <button @click="goBack" class="sub-header__back">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div v-if="pet" class="sub-header__info">
        <img :src="pet.photoURL || defaultImage" :alt="pet.name" class="sub-header__avatar" />
        <div class="sub-header__text">
          <div class="sub-header__name">{{ pet.name }}</div>
          <div class="sub-header__meta">
            <span>{{ displayAge }} 歲</span>
            <span>·</span>
            <span>{{ pet.weight }} kg</span>
            <span
              class="health-badge ml-1"
              :class="healthStatusClass"
            >{{ pet.healthStatus || '' }}</span>
          </div>
        </div>
      </div>

      <button v-if="pet" @click="goToFiles" class="sub-header__folder" title="檔案管理">
        <q-icon name="folder" style="font-size: 20px;" />
      </button>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loading" class="flex justify-center items-center h-[90vh] print-hidden">
      <div class="text-center">
        <q-spinner-dots size="60px" color="primary" />
        <p class="mt-4" style="color: var(--ml-text-sec);">載入中...</p>
      </div>
    </div>

    <div v-else-if="!pet" class="flex justify-center items-center h-[90vh] print-hidden">
      <div class="text-center">
        <p class="text-xl" style="color: var(--ml-text-sec);">找不到此寵物</p>
        <button @click="goBack" class="ml-btn-primary mt-4" style="padding: 10px 20px; border-radius: 12px;">
          返回首頁
        </button>
      </div>
    </div>

    <!-- ── Main content ── -->
    <div v-else class="page-body print-hidden" :style="{ paddingTop: subHeaderHeight + 'px' }">

      <!-- Analysis banner -->
      <div class="analysis-banner" @click="showDataChart = true">
        <div class="analysis-banner__icon">
          <q-icon name="show_chart" style="font-size: 20px; color: var(--ml-primary);" />
        </div>
        <div class="analysis-banner__text">
          <div class="analysis-banner__title">健康記錄分析</div>
          <div class="analysis-banner__sub">查看「{{ pet.name }}」的體重、飲食與體溫變化趨勢</div>
        </div>
        <q-icon name="chevron_right" style="font-size: 20px; color: var(--ml-text-muted);" />
      
      </div>
      
      <!-- Export button -->
      <div class="flex justify-end px-4 my-2">
        <button class="export-btn" @click="openExportDialog">
          <q-icon name="download" style="font-size: 16px;" />
          資料匯出
        </button>
      </div>

      <!-- ── Calendar ── -->
      <div class="calendar-card mx-4 mb-4">
        <div class="calendar-nav">
          <button @click="previousMonth" class="calendar-nav__btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 class="calendar-nav__title">{{ currentYear }}年 {{ currentMonth + 1 }}月</h2>
          <button @click="nextMonth" class="calendar-nav__btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Weekday headers -->
        <div class="calendar-weekdays">
          <div v-for="day in weekdays" :key="day" class="calendar-weekday">{{ day }}</div>
        </div>

        <!-- Day cells -->
        <div class="calendar-grid">
          <div
            v-for="_ in firstDayOfMonth"
            :key="`empty-${_}`"
            class="calendar-cell calendar-cell--empty"
          ></div>

          <div
            v-for="day in daysInMonth"
            :key="day"
            class="calendar-cell"
            :class="{
              'calendar-cell--today': isToday(day),
              'calendar-cell--selected': isSelectedDay(day),
            }"
            @click="selectDate(day)"
          >
            <!-- Day number -->
            <div class="calendar-cell__num-row">
              <span
                class="calendar-cell__num"
                :class="{
                  'calendar-cell__num--today': isToday(day),
                  'calendar-cell__num--selected': isSelectedDay(day),
                }"
              >{{ day }}</span>
              <div v-if="hasNotes(day)" class="calendar-cell__note-dot"></div>
            </div>

            <!-- Tags & data -->
            <div class="calendar-cell__tags">
              <span v-if="hasVomit(day)" class="cal-pill cal-pill--vomit">嘔吐</span>
              <span v-if="hasDiarrhea(day)" class="cal-pill cal-pill--diarrhea">腹瀉</span>
              <span v-if="getDailyTag(day)" class="cal-pill cal-pill--tag">{{ getDailyTag(day) }}</span>
              <span
                v-if="getDailyWeight(day)"
                class="cal-pill cal-pill--weight"
              >{{ formatWeight(getDailyWeight(day)) }}kg</span>
              <span
                v-if="getDailyTemperature(day)"
                class="cal-pill"
                :class="temperatureBadgeClass(day)"
              >{{ formatTemperature(getDailyTemperature(day)) }}°C</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily record form -->
      <pet-daily-record
        v-if="selectedDateObj"
        :pet-id="pet.id"
        :selected-date="selectedDateObj"
        @saved="handleRecordSaved"
      />

      <!-- Reminders -->
      <reminder-list
        :pet-id="pet.id"
        :pet-name="pet.name"
      />

      <!-- ── Export Dialog ── -->
      <pet-export-dialog
        v-if="showExportDialog"
        v-model="showExportDialog"
        :pet-id="pet.id"
        :family-id="userStore.family.id"
        :pet-name="pet.name"
      />

      <!-- Chart Dialog -->
      <pet-data-chart-dialog
        v-model="showDataChart"
        :pet-id="pet.id"
        :family-id="userStore.family.id"
        title="健康記錄分析"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch, nextTick, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePetStore } from 'src/stores/petStore';
import { useUserStore } from 'src/stores/userStore';
import { notification } from 'src/boot/notification';
import PetDailyRecord from 'src/components/PetDailyRecord.vue';
import PetDataChartDialog from 'src/components/PetDataChartDialog.vue';
import ReminderList from 'src/components/reminders/ReminderList.vue';
const PetExportDialog = defineAsyncComponent(() => import('src/components/PetExportDialog.vue'));
import { db, collection, query, where, getDocs, doc, getDoc } from 'src/boot/firebase';
import { orderBy } from 'firebase/firestore';
import { cacheGet, cacheSet } from 'src/utils/idbCache';
import { loadAppSnapshot, updateLastViewedPet } from 'src/services/appSnapshotService';

const route = useRoute();
const router = useRouter();
const petStore = usePetStore();
const userStore = useUserStore();

const pet = ref(null);
const loading = ref(true);
const defaultImage = 'https://via.placeholder.com/200x150?text=No+Image';
const subHeaderRef = ref(null);
const subHeaderHeight = ref(60);

const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate());
const firstDayOfMonth = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay());

const selectedDay = ref(null);
const selectedDateObj = ref(null);
const dailyRecords = reactive({});
const showDataChart = ref(false);
const fetchRecordsSeq = ref(0);
const showExportDialog = ref(false);

const monthKey = computed(() => `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`);

const goBack = () => router.push('/');
const goToFiles = () => { if (pet.value?.id) router.push({ name: 'pet-files', params: { id: pet.value.id } }); };

const openExportDialog = () => { showExportDialog.value = true; };

const previousMonth = () => { currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1); };
const nextMonth = () => { currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1); };

const isToday = (day) => {
  const d = new Date();
  return day === d.getDate() && currentMonth.value === d.getMonth() && currentYear.value === d.getFullYear();
};

const isSelectedDay = (day) => {
  return selectedDay.value === day &&
    currentMonth.value === selectedDateObj.value?.getMonth() &&
    currentYear.value === selectedDateObj.value?.getFullYear();
};

const formatDateKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getDailyTag = (day) => {
  const record = dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)];
  if (!record) return null;
  if (record.tags?.length > 0) return record.tags[0] + (record.tags.length > 1 ? '+' : '');
  return record.tag || null;
};
const getDailyWeight = (day) => dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)]?.dailyWeight || null;
const getDailyTemperature = (day) => dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)]?.temperature || null;
const hasNotes = (day) => dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)]?.hasNotes || false;
const hasVomit = (day) => dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)]?.hasVomit || false;
const hasDiarrhea = (day) => dailyRecords[formatDateKey(currentYear.value, currentMonth.value, day)]?.hasDiarrhea || false;

const temperatureBadgeClass = (day) => {
  const t = getDailyTemperature(day);
  if (t === null || t === undefined) return 'cal-pill--weight';
  if (t > 39) return 'cal-pill--temp-hi';
  if (t >= 38 && t <= 39) return 'cal-pill--temp-ok';
  return 'cal-pill--temp-lo';
};

const formatWeight = (w) => (w === null || w === undefined) ? '' : Number(w).toFixed(2);
const formatTemperature = (t) => (t === null || t === undefined) ? '' : Number(t).toFixed(1);
// const formatNumber = (v, decimals = 0) => (v === null || v === undefined) ? '' : Number(v).toFixed(decimals);

const selectDate = (day) => {
  selectedDay.value = day;
  selectedDateObj.value = new Date(currentYear.value, currentMonth.value, day);
  setTimeout(() => {
    const recordElement = document.querySelector('.pet-daily-record');
    if (recordElement) {
      const top = recordElement.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, 100);
};

const handleRecordSaved = async (data) => {
  const dateKey = formatDate(data.date);
  dailyRecords[dateKey] = {
    hasRecord: true,
    tag: data.tag,
    tags: data.tags || [],
    hasNotes: data.hasNotes,
    hasVomit: data.hasVomit,
    hasDiarrhea: data.hasDiarrhea,
    dailyWeight: data.dailyWeight || null,
    temperature: data.temperature || null
  };
  if (data.weightUpdated) await refreshPetData();
};

const refreshPetData = async () => {
  try {
    const foundPet = await petStore.getPetById(route.params.id, true);
    if (foundPet) pet.value = foundPet;
  } catch (error) { console.error('Error:', error); }
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


const updateAppSnapshotWithRecords = () => {
  if (!pet.value || !userStore.hasFamily) return;
  const recordsPlain = {};
  Object.keys(dailyRecords).forEach(k => { recordsPlain[k] = dailyRecords[k]; });
  petStore.lastViewedPetForSnapshot = { petId: pet.value.id, monthKey: monthKey.value, dailyRecords: recordsPlain, pet: { ...pet.value } };
  void updateLastViewedPet(pet.value.id, monthKey.value, recordsPlain, { ...pet.value });
};

const fetchPetDailyRecords = async () => {
  if (!pet.value || !userStore.hasFamily) return;
  try {
    const seq = ++fetchRecordsSeq.value;
    const expectedMonthKey = monthKey.value;
    const cacheKey = `petDailySummary:${userStore.family.id}:${pet.value.id}:${monthKey.value}`;
    const cached = await cacheGet(cacheKey, { maxAgeMs: 1000 * 60 * 60 * 24 * 30 });
    const hadCached = !!(cached && typeof cached === 'object');
    if (cached && typeof cached === 'object') {
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
      Object.entries(cached).forEach(([date, summary]) => { dailyRecords[date] = summary; });
      updateAppSnapshotWithRecords();
    }

    const monthStart = `${monthKey.value}-01`;
    const monthEnd = formatDate(new Date(currentYear.value, currentMonth.value + 1, 0));
    const summaryForCache = {};

    try {
      const petRecordsQuery = query(
        collection(db, 'petDailyRecords'),
        where('petId', '==', pet.value.id),
        where('familyId', '==', userStore.family.id),
        where('date', '>=', monthStart),
        where('date', '<=', monthEnd),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(petRecordsQuery);
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
      querySnapshot.forEach(d => {
        const recordData = d.data();
        if (!recordData?.date) return;
        let tags = recordData.tags || [];
        if (!tags.length && recordData.tag) tags = [recordData.tag];
        const summary = { hasRecord: true, tag: recordData.tag || null, tags, hasNotes: !!recordData.notes, hasVomit: recordData.hasVomit || false, hasDiarrhea: recordData.hasDiarrhea || false, dailyWeight: recordData.dailyWeight || null, temperature: recordData.temperature || null };
        dailyRecords[recordData.date] = summary;
        summaryForCache[recordData.date] = summary;
      });
      void cacheSet(cacheKey, summaryForCache);
      updateAppSnapshotWithRecords();
      return;
    } catch (e) { console.warn('Monthly query failed, fallback:', e); }

    const days = new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
    const reads = [];
    const tempRecords = {};
    for (let day = 1; day <= days; day++) {
      const dateString = formatDateKey(currentYear.value, currentMonth.value, day);
      const recordRef = doc(db, 'petDailyRecords', `${pet.value.id}_${dateString}`);
      reads.push(getDoc(recordRef).then(snap => {
        if (!snap.exists()) return;
        const recordData = snap.data();
        if (!recordData?.date) return;
        let tags = recordData.tags || [];
        if (!tags.length && recordData.tag) tags = [recordData.tag];
        const summary = { hasRecord: true, tag: recordData.tag || null, tags, hasNotes: !!recordData.notes, hasVomit: recordData.hasVomit || false, hasDiarrhea: recordData.hasDiarrhea || false, dailyWeight: recordData.dailyWeight || null, temperature: recordData.temperature || null };
        tempRecords[recordData.date] = summary;
        summaryForCache[recordData.date] = summary;
      }));
    }
    await Promise.all(reads);
    const gotAny = Object.keys(tempRecords).length > 0;
    if (gotAny) {
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
      Object.entries(tempRecords).forEach(([date, summary]) => { dailyRecords[date] = summary; });
      void cacheSet(cacheKey, summaryForCache);
      updateAppSnapshotWithRecords();
    } else if (!hadCached) {
      if (seq !== fetchRecordsSeq.value || monthKey.value !== expectedMonthKey) return;
      Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
    }
  } catch (error) { console.error('Error:', error); }
};

const displayAge = computed(() => {
  if (!pet.value) return '未知';
  if (!pet.value.birthDate) return pet.value.age || '未知';
  const birthDate = new Date(pet.value.birthDate);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
});

const healthStatusClass = computed(() => {
  if (!pet.value) return '';
  switch (pet.value.healthStatus) {
    case '健康':     return 'health-badge--healthy';
    case '需要注意': return 'health-badge--caution';
    case '生病':     return 'health-badge--sick';
    case '天使':     return 'health-badge--angel';
    default:         return 'health-badge--default';
  }
});

const fetchPetDetails = async () => {
  loading.value = true;
  try {
    const petId = route.params.id;
    if (userStore.loading) {
      const snapshot = await loadAppSnapshot();
      if (snapshot?.userId) { userStore.hydrateFromSnapshot(snapshot); petStore.hydrateFromSnapshot(snapshot); userStore.loading = false; }
    }
    if (!userStore.isLoggedIn) await userStore.initAuth();
    const foundPet = await petStore.getPetById(petId);
    if (foundPet) {
      pet.value = foundPet;
      const lv = petStore.lastViewedPetForSnapshot;
      if (lv?.petId === petId && lv?.monthKey === monthKey.value && lv?.dailyRecords) {
        Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
        Object.entries(lv.dailyRecords).forEach(([date, summary]) => { dailyRecords[date] = summary; });
      }
      loading.value = false;
      void fetchPetDailyRecords();
    } else { notification.error('找不到此寵物'); }
  } catch (error) {
    console.error('Error:', error);
    notification.error(error.message || 'Can not fetch pet details');
  } finally { if (loading.value) loading.value = false; }
};

let subHeaderObserver = null;

// Parse `?date=YYYY-MM-DD` into a local Date (or null if invalid/absent).
// Used when navigating from a reminder notification so the page lands on the
// day of the event, not on today.
const parseQueryDate = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

onMounted(async () => {
  await fetchPetDetails();

  const targetDate = parseQueryDate(route.query.date);
  if (targetDate) {
    const sameMonth =
      currentMonth.value === targetDate.getMonth() &&
      currentYear.value === targetDate.getFullYear();
    if (!sameMonth) {
      currentDate.value = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      // wait for the currentDate watcher (which clears selection) to flush before selecting
      await nextTick();
    }
    selectDate(targetDate.getDate());
    return;
  }

  const today = new Date();
  if (currentMonth.value === today.getMonth() && currentYear.value === today.getFullYear()) selectDate(today.getDate());
  if (subHeaderRef.value) {
    subHeaderHeight.value = subHeaderRef.value.offsetHeight;
    subHeaderObserver = new ResizeObserver(entries => {
      subHeaderHeight.value = entries[0].target.offsetHeight;
    });
    subHeaderObserver.observe(subHeaderRef.value);
  }
});

onUnmounted(() => {
  petStore.lastViewedPetForSnapshot = null;
  subHeaderObserver?.disconnect();
});

watch(currentDate, async () => {
  if (!pet.value) return;
  selectedDay.value = null;
  selectedDateObj.value = null;
  void fetchPetDailyRecords();
  const today = new Date();
  if (currentMonth.value === today.getMonth() && currentYear.value === today.getFullYear()) selectDate(today.getDate());
});
</script>

<style scoped>
.pet-details-page {
  background: var(--ml-bg);
  min-height: 100vh;
}

/* ── Sub-header ── */
.pet-sub-header {
  background-color: #EC8A20;
  position: fixed;
  left: 0; right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  padding: 10px 14px 12px;
  gap: 10px;
  box-shadow: 0 2px 12px rgba(180,100,10,0.2);
}

.sub-header__back {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.22);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.sub-header__back:hover { background: rgba(255,255,255,0.32); }

.sub-header__info {
  display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
}

.sub-header__avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.5);
  flex-shrink: 0;
}

.sub-header__text { min-width: 0; }

.sub-header__name {
  font-size: 16px; font-weight: 700; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1.2;
}

.sub-header__meta {
  display: flex; align-items: center; gap: 4px;
  font-size: 11.5px; color: rgba(255,255,255,0.8); margin-top: 1px;
  flex-wrap: nowrap; overflow: hidden;
}

.sub-header__folder {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.22);
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.sub-header__folder:hover { background: rgba(255,255,255,0.32); }

/* ── Page body ── */
.page-body {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* ── Analysis banner ── */
.analysis-banner {
  margin: 14px 16px 0;
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  padding: 13px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--ml-shadow);
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.analysis-banner:hover { box-shadow: var(--ml-shadow-md); }

.analysis-banner__icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: var(--ml-primary-l);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.analysis-banner__text { flex: 1; }

.analysis-banner__title {
  font-weight: 600; font-size: 14px; color: var(--ml-text);
}

.analysis-banner__sub {
  font-size: 11.5px; color: var(--ml-text-sec); margin-top: 2px;
}

/* ── Export button ── */
.export-btn {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  color: #fff;
  border: none; border-radius: 10px;
  padding: 9px 16px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: opacity 0.15s;
}
.export-btn:hover { opacity: 0.9; }
.export-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Calendar ── */
.calendar-card {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  box-shadow: var(--ml-shadow);
  padding: 14px 10px;
}

.calendar-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}

.calendar-nav__btn {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: var(--ml-bg);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--ml-primary);
  transition: background 0.15s;
}
.calendar-nav__btn:hover { background: var(--ml-primary-l); }

.calendar-nav__title {
  font-size: 15px; font-weight: 700; color: var(--ml-text);
}

.calendar-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.calendar-weekday {
  text-align: center; font-size: 10.5px; font-weight: 600;
  color: var(--ml-text-muted); padding: 2px 0;
}

.calendar-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 2px 1px;
}

.calendar-cell {
  min-height: 58px;
  padding: 3px 2px;
  cursor: pointer;
  border-radius: 9px;
  background: transparent;
  outline: 2px solid transparent;
  outline-offset: -1px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: background 0.12s;
}
.calendar-cell:hover { background: var(--ml-primary-l); }

.calendar-cell--empty { cursor: default; background: transparent !important; }

.calendar-cell--today { outline-color: var(--ml-primary-bd); }

.calendar-cell--selected {
  background: var(--ml-primary-l) !important;
  outline-color: var(--ml-primary);
}

.calendar-cell__num-row {
  position: relative; width: 100%;
  display: flex; justify-content: center; align-items: center;
}

.calendar-cell__num {
  font-size: 11.5px; font-weight: 400; color: var(--ml-text);
}
.calendar-cell__num--today,
.calendar-cell__num--selected {
  font-weight: 700; color: var(--ml-primary);
}

.calendar-cell__note-dot {
  position: absolute; top: 0; right: 2px;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--ml-blue);
}

.calendar-cell__tags {
  display: flex; flex-direction: column; align-items: center;
  gap: 1.5px; width: 100%;
}

/* ── Print ── */
@media print {
  .print-hidden { display: none !important; }
}
</style>
