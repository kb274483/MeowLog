<template>
  <q-dialog
    v-model="show"
    class="pet-data-chart-dialog"
    maximized
    persistent
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="bg-white">
      <q-card-section class="row items-center bg-amber-600 text-white q-py-sm">
        <div class="text-h6">{{ title || '健康記錄分析' }}</div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense />
      </q-card-section>

      <q-card-section class="q-px-md q-py-sm scroll-area">
        <div class="flex flex-wrap justify-between items-center mb-3 gap-2">
          <q-select
            v-model="selectedMetric"
            :options="metricOptions"
            dense
            outlined
            class="metric-select"
            label="項目"
            options-dense
          />
          
          <q-select
            v-model="selectedTimeRange"
            :options="timeRangeOptions"
            dense
            outlined
            class="time-select"
            label="時間範圍"
            options-dense
          />
        </div>
        
        <!-- Chart Container -->
        <div class="relative chart-container">
          <!-- Loading -->
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-10">
            <q-spinner-dots size="40px" color="amber" />
          </div>
          
          <div v-if="indexBuilding" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10">
            <q-icon name="build" size="40px" color="amber" />
            <p class="text-gray-600 mt-2 text-center text-sm">
              數據功能正在準備中，請稍後再試<br>
              <span class="text-xs">首次使用可能需要幾分鐘來建立索引</span>
            </p>
          </div>
          
          <!-- No Data -->
          <div v-if="!loading && !indexBuilding && !hasData" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10">
            <q-icon name="bar_chart" size="40px" color="grey" />
            <p class="text-gray-500 mt-2 text-center text-sm">沒有足夠的數據來顯示圖表</p>
            <p class="text-gray-400 text-xs mt-1">請先在日記中記錄您寵物的體重、飲食或體溫</p>
          </div>
          
          <div class="h-full w-full">
            <canvas ref="chartCanvas" :style="{ display: hasData && !loading && !indexBuilding ? 'block' : 'none' }"></canvas>
          </div>
        </div>
        
        <!-- Summary Data -->
        <div v-if="stats && !indexBuilding" class="mt-3 grid grid-cols-2 gap-2 text-center">
          <div class="bg-amber-50 p-2 rounded-lg">
            <p class="text-xs text-gray-500">平均值</p>
            <p class="font-semibold">{{ formatValue(stats.avg) }}</p>
          </div>
          <div class="bg-green-50 p-2 rounded-lg">
            <p class="text-xs text-gray-500">最小值</p>
            <p class="font-semibold">{{ formatValue(stats.min) }}</p>
          </div>
          <div class="bg-red-50 p-2 rounded-lg">
            <p class="text-xs text-gray-500">最大值</p>
            <p class="font-semibold">{{ formatValue(stats.max) }}</p>
          </div>
          <div class="bg-blue-50 p-2 rounded-lg">
            <p class="text-xs text-gray-500">狀態</p>
            <p class="font-semibold flex items-center justify-center">
              <q-icon
                :name="trendIcon"
                :color="trendColor"
                size="sm"
                class="mr-1"
              />
              {{ trendText }}
            </p>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  BarController
} from 'chart.js';
import { getPetTimeSeriesData, getMetricStats, getAveragesByInterval } from 'src/services/petDataAnalysisService';
import { notification } from 'src/boot/notification';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  petId: {
    type: String,
    required: true
  },
  familyId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: '健康記錄分析'
  }
});

const emit = defineEmits(['update:modelValue']);
const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// State
const loading = ref(false);
const indexBuilding = ref(false);
const timeSeriesData = ref(null);
const selectedMetric = ref({ label: '體重', value: 'dailyWeight', unit: 'kg' });
const selectedTimeRange = ref({ label: '一週', value: 'week', days: 7, interval: 'day' });
const stats = ref(null);
const chartCanvas = ref(null);
const chartInstance = ref(null);

// Options
const metricOptions = [
  { label: '體重', value: 'dailyWeight', unit: 'kg' },
  { label: '飲食記錄', value: 'diet', unit: 'g' },
  { label: '熱量攝取', value: 'calories', unit: 'kcal' },
  { label: '體溫', value: 'temperature', unit: '°C' },
  { label: '呼吸次數', value: 'respirationRate', unit: '次/分' },
  { label: '心跳次數', value: 'heartRate', unit: '次/分' }
];

const timeRangeOptions = [
  { label: '一週', value: 'week', days: 7, interval: 'day' },
  { label: '兩週', value: 'biweek', days: 14, interval: 'day' },
  { label: '一個月', value: 'month', days: 30, interval: 'day' },
  { label: '三個月', value: 'quarter', days: 90, interval: 'day' },
  { label: '半年', value: 'halfyear', days: 180, interval: 'month' },
  { label: '一年', value: 'year', days: 365, interval: 'month' }
];

// Load Data
const loadData = async () => {
  if (!props.petId || !props.familyId) return;
  
  loading.value = true;
  indexBuilding.value = false;
  timeSeriesData.value = null;
  stats.value = null;
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - selectedTimeRange.value.days);
    
    const metricsToFetch = selectedMetric.value.value === 'diet' 
      ? ['foodAmount', 'wetFoodAmount'] 
      : [selectedMetric.value.value];

    // Get time series data
    timeSeriesData.value = await getPetTimeSeriesData(
      props.petId,
      props.familyId,
      startDate,
      endDate,
      metricsToFetch
    );
    
    // Calculate stats
    if (timeSeriesData.value && timeSeriesData.value.metrics) {
      const statsMetric = selectedMetric.value.value === 'diet' ? 'foodAmount' : selectedMetric.value.value;
      
      if (timeSeriesData.value.metrics[statsMetric]) {
        stats.value = getMetricStats(timeSeriesData.value, statsMetric);
      }
      
      // Wait for DOM update before rendering chart
      if (hasData.value) {
        await nextTick();
        setTimeout(() => {
          renderChart();
        }, 400);
      }
    } else {
      console.log('No data found');
    }
  } catch (error) {
    console.error('Failed to load data:', error);
    
    if (error.message && error.message.includes('index')) {
      indexBuilding.value = true;
      notification.info('Waiting for data indexing...', {
        duration: 5000
      });
    } else {
      notification.error('Failed to load data: ' + error.message);
    }
  } finally {
    loading.value = false;
  }
};

watch([selectedMetric, selectedTimeRange], () => {
  if (show.value) {
    loadData();
  }
}, { deep: true });

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      loadData();
    }, 400);
  } else {
    if (chartInstance.value) {
      chartInstance.value.destroy();
      chartInstance.value = null;
    }
    timeSeriesData.value = null;
    stats.value = null;
  }
});

// Chart Rendering
const renderChart = () => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
  
  if (!chartCanvas.value) {
    console.error('Chart canvas not found');
    const canvasElement = document.querySelector('.pet-data-chart-dialog canvas');
    if (canvasElement) {
      renderChartOnElement(canvasElement);
    } else {
      notification.error('Chart canvas not found');
    }
    return;
  }
  
  renderChartOnElement(chartCanvas.value);
};

const renderChartOnElement = (element) => {
  try {
    const ctx = element.getContext('2d');
    if (!ctx) {
      console.error('Cannot get chart context');
      return;
    }
    
    if (!timeSeriesData.value || !timeSeriesData.value.metrics) {
      console.error('time series data is invalid');
      return;
    }
    
    let datasets = [];
    let labels = [];
    let yScales = {};
    
    if (selectedMetric.value.value === 'diet') {
      // Handle Diet Chart (Mixed)
      const foodAverages = getAveragesByInterval(
        timeSeriesData.value,
        'foodAmount',
        selectedTimeRange.value.interval
      );
      
      const wetAverages = getAveragesByInterval(
        timeSeriesData.value,
        'wetFoodAmount',
        selectedTimeRange.value.interval
      );
      
      labels = foodAverages.labels; // Labels should be same
      
      datasets = [
        {
          type: 'line',
          label: '乾糧攝取量 (g)',
          data: foodAverages.values,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: '濕食攝取量',
          data: wetAverages.values,
          borderColor: '#0a468f',
          backgroundColor: '#0a468faa',
          yAxisID: 'y1'
        }
      ];
      
      yScales = {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: '乾糧 (g)' },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: '濕食' },
          min: 0,
          max: 10,
          grid: {
            drawOnChartArea: false
          }
        }
      };
      
    } else {
      // Standard Single Metric Chart
      const metric = selectedMetric.value.value;
      if (!timeSeriesData.value.metrics[metric]) {
        console.error('item not found:', metric);
        return;
      }
      
      const averages = getAveragesByInterval(
        timeSeriesData.value,
        metric,
        selectedTimeRange.value.interval
      );
      
      labels = averages.labels;
      
      datasets = [{
        label: selectedMetric.value.label,
        data: averages.values,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }];
      
      yScales = {
        y: {
          beginAtZero: false,
          ticks: {
            font: { size: 10 },
            callback: function(value) {
              if (selectedMetric.value.unit === 'kg') {
                return value.toFixed(2);
              } else if (selectedMetric.value.unit === '°C') {
                return Number(value).toFixed(1);
              }
              return Math.round(value);
            }
          }
        }
      };
    }
    
    // Format date labels
    const formattedLabels = labels.map(label => {
      if (!label) return '未知';
      
      // Handle weekly format (YYYY-MM-Wx)
      if (label.includes('-W')) {
        // Parse the year, month and week
        // Note: The label format from backend is "YYYY-MM-Wn"
        // It's approximate. Better to just use the raw date or show "MM/DD" of start of week if we had it.
        // But our grouping key is simplified.
        // Let's try to make it more readable: "MM月第N週"
        const parts = label.split('-W');
        if (parts.length === 2) {
            const yearMonth = parts[0]; // YYYY-MM
            const weekNum = parts[1];
            const [month] = yearMonth.split('-');
            return `${parseInt(month)}月W${weekNum}`;
        }
      } else if (label.includes('-BW')) {
        const biweek = label.split('-BW')[1];
        return `BW${biweek}`;
      } else if (label.includes('-Q')) {
        return label.replace('-Q', 'Q');
      } else if (label.includes('-H')) {
        const half = label.split('-H')[1];
        return half === '1' ? '上半' : '下半';
      } else if (label.includes('-')) {
        const parts = label.split('-');
        if (parts.length === 3) {
          // YYYY-MM-DD -> MM/DD
          return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        } else if (parts.length === 2) {
          // YYYY-MM -> MM月
          return `${parseInt(parts[1])}月`;
        }
      }
      return label;
    });
    
    chartInstance.value = new Chart(ctx, {
      type: 'line', // Default type, overridden by dataset type
      data: {
        labels: formattedLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: selectedMetric.value.value === 'diet' // Show legend for mixed chart
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let value = context.parsed.y;
                let unit = '';
                
                if (context.dataset.yAxisID === 'y1') {
                   // Wet food
                   value = Math.round(value);
                   unit = '';
                } else if (selectedMetric.value.value === 'diet') {
                   // Dry food
                   value = Math.round(value);
                   unit = 'g';
                } else {
                   // Other metrics
                   unit = selectedMetric.value.unit;
                   if (unit === 'kg') value = value.toFixed(2);
                   else if (unit === '°C') value = value.toFixed(1);
                   else value = Math.round(value);
                }
                
                return `${context.dataset.label}: ${value} ${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: { size: 10 },
              maxRotation: 30,
              minRotation: 0
            }
          },
          ...yScales
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    notification.error('Chart rendering failed, please try again later');
  }
};

// Format value
const formatValue = (value) => {
  if (value === null || value === undefined) return '無數據';
  
  let formattedValue;
  if (selectedMetric.value.unit === 'kg') {
    formattedValue = Number(value).toFixed(2);
  } else if (selectedMetric.value.unit === '°C') {
    formattedValue = Number(value).toFixed(1);
  } else {
    formattedValue = Math.round(value);
  }
  
  return `${formattedValue} ${selectedMetric.value.unit}`;
};

const trendIcon = computed(() => {
  if (!stats.value) return '';
  
  switch (stats.value.trend) {
    case 'increasing': return 'arrow_upward';
    case 'decreasing': return 'arrow_downward';
    default: return 'trending_flat';
  }
});

const trendColor = computed(() => {
  if (!stats.value) return '';
  
  switch (stats.value.trend) {
    case 'increasing': return 'red';
    case 'decreasing': return 'green';
    default: return 'blue';
  }
});

const trendText = computed(() => {
  if (!stats.value) return '無數據';
  
  switch (stats.value.trend) {
    case 'increasing': return '上升';
    case 'decreasing': return '下降';
    default: return '穩定';
  }
});

// Has enough data
const hasData = computed(() => {
  if (!timeSeriesData.value || !timeSeriesData.value.metrics) return false;
  
  if (selectedMetric.value.value === 'diet') {
    const foodData = timeSeriesData.value.metrics.foodAmount || [];
    const wetData = timeSeriesData.value.metrics.wetFoodAmount || [];
    const validFood = foodData.filter(v => v !== null && v !== undefined);
    const validWet = wetData.filter(v => v !== null && v !== undefined);
    return validFood.length > 0 || validWet.length > 0;
  }
  
  const metricData = timeSeriesData.value.metrics[selectedMetric.value.value];
  if (!metricData || !Array.isArray(metricData)) return false;
  
  const validValues = metricData.filter(v => v !== null && v !== undefined);
  
  return validValues.length > 0;
});
</script>

<style scoped>
.scroll-area {
  max-height: calc(100vh - 50px);
  overflow-y: auto;
}

.chart-container {
  height: 50vh; 
  max-height: 300px;
}

.metric-select, .time-select {
  width: 48%;
  min-width: 100px;
}

@media (max-width: 600px) {
  .chart-container {
    height: 45vh;
    max-height: 250px;
  }
  
  .metric-select, .time-select {
    width: 47%;
  }
}
@media (max-width: 375px) {
  .chart-container {
    height: 40vh;
  }
}
</style> 