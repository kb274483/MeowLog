<template>
  <div class="bg-gray-50 min-h-screen relative">
    <!-- Header -->
    <div 
      class="bg-white shadow-sm py-2 flex items-center fixed left-0 right-0 z-20" style="top: 50px;">
      <button 
        @click="goBack" 
        class="mr-4 p-4 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div v-if="pet" class="flex items-center">
        <img 
          :src="pet.photoURL || defaultImage" 
          :alt="pet.name" 
          class="w-10 h-10 rounded-full object-cover mr-3"
        />
        <div>
          <h1 class="text-lg font-semibold text-gray-800">{{ pet.name }}</h1>
          <div class="flex text-xs text-gray-500 space-x-2">
            <span>{{ displayAge }} 歲</span>
            <span>{{ pet.weight }} kg</span>
            <span 
              :class="healthStatusClass"
              class="px-1.5 py-0.5 rounded-full text-xs"
            >
              {{ pet.healthStatus || '健康狀態未知' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- loading -->
    <div v-if="loading" class="flex justify-center items-center h-[90vh]">
      <div class="text-center">
        <q-spinner-dots size="60px" color="amber" />
        <p class="mt-4 text-gray-600">
          Loading...
        </p>
      </div>
    </div>
    
    <div v-else-if="!pet" class="flex justify-center items-center h-[90vh]">
      <div class="text-center">
        <p class="text-xl text-gray-600">
          找不到此寵物
        </p>
        <button 
          @click="goBack" 
          class="mt-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
        >
          返回首頁
        </button>
      </div>
    </div>
    
    <div v-else class="container mx-auto p-4" style="padding-top: 94px;">
      <div 
        class="bg-white rounded-lg shadow-md p-2 mb-4 cursor-pointer hover:bg-amber-50 transition-colors"
        @click="showDataChart = true"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <q-icon name="show_chart" size="md" color="amber" class="mr-3" />
            <h3 class="text-lg font-semibold text-gray-800">
              健康記錄分析
            </h3>
          </div>
          <q-icon name="chevron_right" size="sm" color="grey" />
        </div>
        
        <p class="text-sm text-gray-600 mt-2">
          查看『{{ pet.name }}』的體重、飲食和飲水量變化趨勢
        </p>
      </div>
      <!-- Calendar -->
      <div class="bg-white rounded-lg shadow-md p-4 mb-4">
        <div class="flex justify-between items-center mb-4">
          <button 
            @click="previousMonth" 
            class="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 class="text-xl font-semibold text-gray-800">
            {{ currentYear }}年 {{ currentMonth + 1 }}月
          </h2>
          
          <button 
            @click="nextMonth" 
            class="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Weekdays -->
        <div class="grid grid-cols-7 mb-2">
          <div v-for="day in weekdays" :key="day" class="text-center text-sm font-medium text-gray-600 py-2">
            {{ day }}
          </div>
        </div>
        
        <div class="grid grid-cols-7 gap-1">
          <div 
            v-for="_ in firstDayOfMonth" 
            :key="`empty-${_}`" 
            class="h-16 sm:h-24 border border-gray-100 bg-gray-50 rounded"
          ></div>
      
          <div 
            v-for="day in daysInMonth" 
            :key="day" 
            class="min-h-20 sm:min-h-28 border rounded p-1 transition-all duration-150"
            :class="{ 
              'bg-amber-100 border-amber-300': isToday(day),
              'border-amber-500 border-2 ring-2 ring-amber-300 shadow-md': isSelectedDay(day),
              'border-gray-200 hover:bg-amber-50': !isToday(day) && !isSelectedDay(day),
              'cursor-pointer': true
            }"
            @click="selectDate(day)"
          >
            <div class="flex justify-between">
              <span class="text-sm font-medium"
                :class="{
                  'font-bold text-amber-600': isToday(day),
                  'text-amber-800 font-bold': isSelectedDay(day) && !isToday(day),
                  'text-gray-600': !isToday(day) && !isSelectedDay(day)
                }"
              >
                {{ day }}
              </span>

              <!-- 備註標記 -->
              <div v-if="hasNotes(day)" class="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>

            <!-- 日期內容信息 -->
            <div class="text-xs text-gray-500 mt-1 flex flex-col">
              <!-- 嘔吐標記 -->
              <span v-if="hasVomit(day)" class="inline-block px-1 py-0.5 rounded bg-red-100 text-red-800 text-[10px] mb-0.5 truncate">
                嘔吐
              </span>
              
              <!-- 標記內容 -->
              <span v-if="getDailyTag(day)" class="inline-block px-1 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] truncate">
                {{ getDailyTag(day) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Daily Record -->
      <pet-daily-record 
        v-if="selectedDateObj" 
        :pet-id="pet.id" 
        :selected-date="selectedDateObj"
        @saved="handleRecordSaved"
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
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePetStore } from 'src/stores/petStore';
import { useUserStore } from 'src/stores/userStore';
import { notification } from 'src/boot/notification';
import PetDailyRecord from 'src/components/PetDailyRecord.vue';
import PetDataChartDialog from 'src/components/PetDataChartDialog.vue';
import { db, collection, query, where, getDocs } from 'src/boot/firebase';

const route = useRoute();
const router = useRouter();
const petStore = usePetStore();
const userStore = useUserStore();

// Pet State
const pet = ref(null);
const loading = ref(true);
const defaultImage = 'https://via.placeholder.com/200x150?text=No+Image';

// Calendar State
const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay();
});

// 新增狀態
const selectedDay = ref(null);
const selectedDateObj = ref(null);
const dailyRecords = reactive({});
const showDataChart = ref(false);

// Go Back
const goBack = () => {
  router.push('/');
};

// 
const previousMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
};

// 
const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
};

// Is Today
const isToday = (day) => {
  const d = new Date();
  return day === d.getDate() && 
    currentMonth.value === d.getMonth() && 
    currentYear.value === d.getFullYear();
};

const isSelectedDay = (day) => {
  return selectedDay.value === day && 
    currentMonth.value === selectedDateObj.value?.getMonth() && 
    currentYear.value === selectedDateObj.value?.getFullYear();
};

// YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getDailyTag = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.tag || null;
};

// check if has notes
const hasNotes = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.hasNotes || false;
};

// check if has vomit
const hasVomit = (day) => {
  const dateKey = formatDateKey(currentYear.value, currentMonth.value, day);
  return dailyRecords[dateKey]?.hasVomit || false;
};

// select date
const selectDate = (day) => {
  selectedDay.value = day;
  selectedDateObj.value = new Date(currentYear.value, currentMonth.value, day);
  
  setTimeout(() => {
    const recordElement = document.querySelector('.pet-daily-record');
    if (recordElement) {
      recordElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
};

// handle record saved
const handleRecordSaved = async (data) => {
  const dateKey = formatDate(data.date);
  
  // update daily records
  dailyRecords[dateKey] = { 
    hasRecord: true,
    tag: data.tag,
    hasNotes: data.hasNotes,
    hasVomit: data.hasVomit
  };
  
  // Update pet weight
  if (data.weightUpdated) {
    await refreshPetData();
  }
};

// refresh pet data
const refreshPetData = async () => {
  try {
    const petId = route.params.id;
    const foundPet = await petStore.getPetById(petId, true);
    
    if (foundPet) {
      pet.value = foundPet;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// fetch pet daily records
const fetchPetDailyRecords = async () => {
  if (!pet.value || !userStore.hasFamily) return;
  
  try {
    const petRecordsQuery = query(
      collection(db, 'petDailyRecords'),
      where('petId', '==', pet.value.id),
      where('familyId', '==', userStore.family.id)
    );
    
    const querySnapshot = await getDocs(petRecordsQuery);
    
    // Clear old data
    Object.keys(dailyRecords).forEach(key => delete dailyRecords[key]);
    
    // Fill daily records
    querySnapshot.forEach((doc) => {
      const recordData = doc.data();
      if (recordData.date) {
        dailyRecords[recordData.date] = {
          hasRecord: true,
          tag: recordData.tag || null,
          hasNotes: !!recordData.notes, // To Boolean
          hasVomit: recordData.hasVomit || false
        };
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
};

// Calculate Age
const displayAge = computed(() => {
  if (!pet.value) return '未知';
  
  if (!pet.value.birthDate) {
    return pet.value.age || '未知';
  }
  
  const birthDate = new Date(pet.value.birthDate);
  const currentDate = new Date();
  
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  
  // 調整年齡：如果今年的生日還沒到，則年齡減1
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Health Status Class
const healthStatusClass = computed(() => {
  if (!pet.value) return '';
  
  switch(pet.value.healthStatus) {
    case '健康':
      return 'bg-green-100 text-green-800';
    case '需要注意':
      return 'bg-yellow-100 text-yellow-800';
    case '生病':
      return 'bg-red-100 text-red-800';
    case '天使':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

// Fetch Pet Details
const fetchPetDetails = async () => {
  loading.value = true;
  try {
    if (!userStore.isLoggedIn) {
      await userStore.initAuth();
    }
    
    const petId = route.params.id;
    
    // get pet details
    const foundPet = await petStore.getPetById(petId);
    
    if (foundPet) {
      pet.value = foundPet;
      await fetchPetDailyRecords();
    } else {
      notification.error('找不到此寵物');
    }
  } catch (error) {
    console.error('Error:', error);
    notification.error(error.message || 'Can not fetch pet details');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchPetDetails();
  
  // init date
  const today = new Date();
  if (currentMonth.value === today.getMonth() && currentYear.value === today.getFullYear()) {
    selectDate(today.getDate());
  }
});
</script>

<style scoped>
.border-amber-500.border-2 {
  position: relative;
  z-index: 10;
  transition: all 0.2s ease;
}
</style>
