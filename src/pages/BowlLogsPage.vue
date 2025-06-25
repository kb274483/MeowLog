<template>
  <div class="mx-auto p-4 max-w-6xl">
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-blue-600">飯飯記錄</h1>
        <q-btn 
          color="amber-8" 
          icon="arrow_back" 
          label="返回" 
          @click="$router.push('/')" 
        />
      </div>
      
      <!-- 日期选择器 -->
      <div class="mb-6">
        <q-date
          v-model="selectedDate"
          mask="YYYY-MM-DD"
          today-btn
          color="blue"
          class="full-width"
          @update:model-value="fetchBowlLogs"
        />
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-8">
        <q-spinner-dots size="40px" color="blue" />
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
      
      <!-- 无数据状态 -->
      <div v-else-if="!hasLogs" class="text-center py-8">
        <q-icon name="info" size="40px" color="grey-6" />
        <p class="mt-4 text-gray-600">該日期沒有記錄</p>
      </div>
      
      <!-- 数据展示 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="bowl in ['bowl1', 'bowl2', 'bowl3']" 
          :key="bowl" 
          class="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <h2 class="text-lg font-semibold mb-4 text-center">
            {{ getBowlName(bowl) }}
          </h2>
          
          <div v-if="getBowlEntries(bowl).length === 0" class="text-center py-4 text-gray-500">
            無記錄
          </div>
          
          <div v-else>
            <div 
              v-for="(entry, index) in getBowlEntries(bowl)" 
              :key="index"
              class="mb-3 p-3 bg-white rounded border-l-4"
              :class="getEntryBorderClass(entry.delta)"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-medium">{{ formatTime(entry.timestamp) }}</span>
                <span 
                  class="font-bold"
                  :class="getEntryTextClass(entry.delta)"
                >
                  {{ formatDelta(entry.delta) }}
                </span>
              </div>
              <div class="text-gray-700">
                重量: {{ entry.weight.toFixed(1) }} 克
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from 'src/stores/userStore';
import { useRouter } from 'vue-router';
import { db, collection, getDocs } from 'src/boot/firebase';
import { notification } from 'src/boot/notification';
import { formatDate } from 'src/utils/dateUtils'; // 假设你有一个日期工具文件

const router = useRouter();
const userStore = useUserStore();
const selectedDate = ref(formatDate(new Date()));
const bowlLogs = ref([]);
const loading = ref(false);

// 获取特定日期的碗重记录
const fetchBowlLogs = async () => {
  if (!userStore.isLoggedIn || userStore.family.id !== 'xZz6XqSwb9pw9BHXh4zJ') {
    router.push('/');
    return;
  }
  
  loading.value = true;
  
  try {
    const date = selectedDate.value;
    const logsRef = collection(db, 'bowlLogs');
    const dateEntryRef = collection(logsRef, date, 'entries');
    const snapshot = await getDocs(dateEntryRef);
    
    const logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 確保時間戳是有效的格式
      if (data.timestamp && typeof data.timestamp === 'string') {
        // 不需要額外處理，直接使用原始字符串
      } else if (data.timestamp && data.timestamp.toDate) {
        // 處理 Firestore Timestamp 類型
        data.timestamp = data.timestamp.toDate().toISOString();
      } else {
        // 如果沒有時間戳或格式不正確，使用當前時間
        data.timestamp = new Date().toISOString();
      }
      
      logs.push({
        id: doc.id,
        ...data,
      });
    });
    
    bowlLogs.value = logs;
  } catch (error) {
    console.error('獲取碗重記錄失敗:', error);
    notification.error('獲取碗重記錄失敗');
  } finally {
    loading.value = false;
  }
};

// 计算是否有日志记录
const hasLogs = computed(() => bowlLogs.value.length > 0);

// 获取特定碗的记录
const getBowlEntries = (bowlId) => {
  return bowlLogs.value
    .filter(entry => entry.bowl === bowlId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// 获取碗的显示名称
const getBowlName = (bowlId) => {
  const names = {
    'bowl1': '阿妹碗',
    'bowl2': '阿班碗',
    'bowl3': '阿虎碗'
  };
  return names[bowlId] || bowlId;
};

// 格式化時間戳顯示
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    // 嘗試直接解析時間戳
    const date = new Date(timestamp);
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('無效的時間戳格式:', timestamp);
      return 'N/A';
    }
    
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('格式化時間錯誤:', error);
    return 'N/A';
  }
};

// 格式化重量变化
const formatDelta = (delta) => {
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta.toFixed(1)}` : `${delta.toFixed(1)}`;
};

// 获取条目的边框颜色类
const getEntryBorderClass = (delta) => {
  if (delta < -2) return 'border-green-500'; // 明显减少(吃食)
  if (delta > 2) return 'border-blue-500'; // 明显增加(添食)
  return 'border-gray-300'; // 轻微变化
};

// 获取条目的文本颜色类
const getEntryTextClass = (delta) => {
  if (delta < -2) return 'text-green-600';
  if (delta > 2) return 'text-blue-600';
  return 'text-gray-600';
};

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/');
    return;
  }
  
  if (userStore.family.id !== 'xZz6XqSwb9pw9BHXh4zJ') {
    router.push('/');
    notification.info('Not allowed to view this page');
    return;
  }
  
  fetchBowlLogs();
});
</script> 