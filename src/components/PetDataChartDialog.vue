<template>
  <q-dialog
    v-model="show"
    class="pet-data-chart-dialog"
    position="bottom"
    persistent
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="chart-dialog-card">
      <!-- Drag handle -->
      <div
        class="chart-dialog-handle-wrap"
        @touchstart.passive="onDragStart"
        @touchmove.passive="onDragMove"
        @touchend.passive="onDragEnd"
      >
        <div class="chart-dialog-handle"></div>
      </div>
      <!-- Header -->
      <q-card-section class="chart-dialog-header">
        <div class="chart-dialog-title">{{ title || '健康記錄分析' }}</div>
        <q-space />
        <q-btn v-close-popup icon="close" flat round dense class="close-btn" />
      </q-card-section>

      <q-card-section class="chart-dialog-body">
        <!-- Selectors -->
        <div class="selectors-row">
          <div class="selector-wrap selector-wrap--metric">
            <div class="ml-field-label">項目</div>
            <select v-model="selectedMetric" class="ml-native-select" @change="val => selectedMetric = metricOptions.find(o=>o.value===val.target.value)||selectedMetric">
              <option v-for="opt in metricOptions" :key="opt.value" :value="opt">{{ opt.label }}</option>
            </select>
          </div>
          <div class="selector-wrap selector-wrap--range">
            <div class="ml-field-label">時間範圍</div>
            <select v-model="selectedTimeRange" class="ml-native-select" @change="val => selectedTimeRange = timeRangeOptions.find(o=>o.value===val.target.value)||selectedTimeRange">
              <option v-for="opt in timeRangeOptions" :key="opt.value" :value="opt">{{ opt.label }}</option>
            </select>
          </div>
        </div>

        <!-- Chart -->
        <div class="chart-wrapper">
          <!-- Loading -->
          <div v-if="loading" class="chart-overlay">
            <q-spinner-dots size="40px" color="primary" />
          </div>

          <!-- Index building -->
          <div v-if="indexBuilding" class="chart-overlay chart-overlay--msg">
            <q-icon name="build" style="font-size:36px; color:var(--ml-primary);" />
            <p class="chart-overlay__text">
              數據功能正在準備中，請稍後再試<br>
              <span style="font-size:11px; color:var(--ml-text-muted);">首次使用可能需要幾分鐘來建立索引</span>
            </p>
          </div>

          <!-- No data -->
          <div v-if="!loading && !indexBuilding && !hasData" class="chart-overlay chart-overlay--msg">
            <q-icon name="bar_chart" style="font-size:36px; color:var(--ml-text-muted);" />
            <p class="chart-overlay__text">沒有足夠的數據來顯示圖表</p>
            <p style="font-size:11px; color:var(--ml-text-muted); margin-top:4px;">請先在日記中記錄體重、飲食或體溫</p>
          </div>

          <div class="h-full w-full">
            <canvas
              ref="chartCanvas"
              :style="{ display: hasData && !indexBuilding ? 'block' : 'none' }"
            ></canvas>
          </div>
        </div>

        <!-- Stats cards -->
        <div v-if="stats && !indexBuilding" class="stats-grid">
          <div class="stat-card stat-card--avg">
            <div class="stat-card__label">平均值</div>
            <div class="stat-card__value">{{ formatValue(stats.avg) }}</div>
          </div>
          <div class="stat-card stat-card--min">
            <div class="stat-card__label">最小值</div>
            <div class="stat-card__value">{{ formatValue(stats.min) }}</div>
          </div>
          <div class="stat-card stat-card--max">
            <div class="stat-card__label">最大值</div>
            <div class="stat-card__value">{{ formatValue(stats.max) }}</div>
          </div>
          <div class="stat-card stat-card--trend">
            <div class="stat-card__label">狀態</div>
            <div class="stat-card__value stat-card__value--trend">
              <q-icon :name="trendIcon" :color="trendColor" size="sm" />
              {{ trendText }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, markRaw } from 'vue';
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

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, LineController, BarController, Title, Tooltip, Legend);

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  petId:      { type: String, required: true },
  familyId:   { type: String, required: true },
  title:      { type: String, default: '健康記錄分析' }
});

const emit = defineEmits(['update:modelValue']);
const show = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) });

const dragStartY = ref(0);
const dragDeltaY = ref(0);

const onDragStart = (e) => { dragStartY.value = e.touches[0].clientY; dragDeltaY.value = 0; };
const onDragMove  = (e) => { dragDeltaY.value = e.touches[0].clientY - dragStartY.value; };
const onDragEnd   = () => { if (dragDeltaY.value > 80) show.value = false; dragDeltaY.value = 0; };

const loading       = ref(false);
const indexBuilding = ref(false);
const timeSeriesData = ref(null);
const selectedMetric    = ref({ label: '體重', value: 'dailyWeight', unit: 'kg' });
const selectedTimeRange = ref({ label: '一週', value: 'week', days: 7, interval: 'day' });
const stats        = ref(null);
const chartCanvas  = ref(null);
const chartInstance = ref(null);

const metricOptions = [
  { label: '體重',     value: 'dailyWeight',    unit: 'kg' },
  { label: '飲食記錄', value: 'diet',            unit: 'g' },
  { label: '熱量攝取', value: 'calories',        unit: 'kcal' },
  { label: '體溫',     value: 'temperature',     unit: '°C' },
  { label: '呼吸次數', value: 'respirationRate', unit: '次/分' },
  { label: '心跳次數', value: 'heartRate',       unit: '次/分' },
];

const timeRangeOptions = [
  { label: '一週',   value: 'week',     days: 7,   interval: 'day' },
  { label: '兩週',   value: 'biweek',   days: 14,  interval: 'day' },
  { label: '一個月', value: 'month',    days: 30,  interval: 'day' },
  { label: '三個月', value: 'quarter',  days: 90,  interval: 'day' },
  { label: '半年',   value: 'halfyear', days: 180, interval: 'month' },
  { label: '一年',   value: 'year',     days: 365, interval: 'month' },
];

const loadData = async () => {
  if (!props.petId || !props.familyId) return;
  loading.value = true; indexBuilding.value = false;
  try {
    const endDate = new Date(), startDate = new Date();
    startDate.setDate(endDate.getDate() - selectedTimeRange.value.days);
    const metricsToFetch = selectedMetric.value.value === 'diet' ? ['foodAmount', 'wetFoodAmount'] : [selectedMetric.value.value];
    timeSeriesData.value = await getPetTimeSeriesData(props.petId, props.familyId, startDate, endDate, metricsToFetch);
    if (timeSeriesData.value?.metrics) {
      const statsMetric = selectedMetric.value.value === 'diet' ? 'foodAmount' : selectedMetric.value.value;
      if (timeSeriesData.value.metrics[statsMetric]) stats.value = getMetricStats(timeSeriesData.value, statsMetric);
      if (hasData.value) { await nextTick(); setTimeout(() => { renderChart(); }, 400); }
    }
  } catch (error) {
    console.error('Failed to load data:', error);
    if (error.message?.includes('index')) { indexBuilding.value = true; notification.info('Waiting for data indexing...', { duration: 5000 }); }
    else notification.error('Failed to load data: ' + error.message);
  } finally { loading.value = false; }
};

watch([selectedMetric, selectedTimeRange], () => { if (show.value) loadData(); }, { deep: true });
watch(() => props.modelValue, (newVal) => {
  if (newVal) { setTimeout(() => { loadData(); }, 400); }
  else {
    if (chartInstance.value) { chartInstance.value.destroy(); chartInstance.value = null; }
    timeSeriesData.value = null; stats.value = null;
  }
});

const buildChartData = () => {
  if (!timeSeriesData.value?.metrics) return null;
  let datasets = [], labels = [], yScales = {};
  if (selectedMetric.value.value === 'diet') {
    const foodAverages = getAveragesByInterval(timeSeriesData.value, 'foodAmount', selectedTimeRange.value.interval);
    const wetAverages  = getAveragesByInterval(timeSeriesData.value, 'wetFoodAmount', selectedTimeRange.value.interval);
    const allLabels = new Set([...foodAverages.labels, ...wetAverages.labels]);
    labels = Array.from(allLabels).sort();
    const foodValues = labels.map(l => { const i = foodAverages.labels.indexOf(l); return i !== -1 ? foodAverages.values[i] : null; });
    const wetValues  = labels.map(l => { const i = wetAverages.labels.indexOf(l);  return i !== -1 ? wetAverages.values[i]  : null; });
    datasets = [
      { type:'line', label:'乾糧攝取量 (g)',  data:foodValues, borderColor:'#E8911C', backgroundColor:'rgba(232,145,28,0.5)', tension:0.3, yAxisID:'y' },
      { type:'bar',  label:'濕食攝取量 (罐)', data:wetValues,  borderColor:'#2860B0', backgroundColor:'rgba(40,96,176,0.55)', yAxisID:'y1' },
    ];
    yScales = {
      y:  { type:'linear', display:true, position:'left',  title:{display:true, text:'乾糧 (g)'}, beginAtZero:true },
      y1: { type:'linear', display:true, position:'right', title:{display:true, text:'濕食 (罐)'}, min:0, grid:{drawOnChartArea:false} },
    };
  } else {
    const metric = selectedMetric.value.value;
    if (!timeSeriesData.value.metrics[metric]) {
      console.warn('[Chart] metric not found:', metric, Object.keys(timeSeriesData.value.metrics));
      return null;
    }
    const averages = getAveragesByInterval(timeSeriesData.value, metric, selectedTimeRange.value.interval);
    labels = averages.labels;
    datasets = [{ label:selectedMetric.value.label, data:averages.values, borderColor:'#E8911C', backgroundColor:'rgba(232,145,28,0.18)', tension:0.3, pointRadius:4, pointHoverRadius:6 }];
    yScales = { y: { beginAtZero:false, ticks:{ font:{size:10}, callback(value) {
      if (selectedMetric.value.unit === 'kg') return Number(value).toFixed(2);
      if (selectedMetric.value.unit === '°C') return Number(value).toFixed(1);
      return Math.round(value);
    } } } };
  }
  const formattedLabels = labels.map(label => {
    if (!label) return '未知';
    if (label.includes('-W'))  { const [ym,w]=label.split('-W'); return `${parseInt(ym.split('-')[1])}月W${w}`; }
    if (label.includes('-BW')) return `BW${label.split('-BW')[1]}`;
    if (label.includes('-Q'))  return label.replace('-Q','Q');
    if (label.includes('-H'))  { const h=label.split('-H')[1]; return h==='1'?'上半':'下半'; }
    if (label.includes('-'))   { const p=label.split('-'); if(p.length===3) return `${parseInt(p[1])}/${parseInt(p[2])}`; if(p.length===2) return `${parseInt(p[1])}月`; }
    return label;
  });
  return { formattedLabels, datasets, yScales };
};

const tooltipLabelCallback = (context) => {
  let value=context.parsed.y, unit='';
  if (context.dataset.yAxisID==='y1') { value=value.toFixed(2); unit='罐'; }
  else if (selectedMetric.value.value==='diet') { value=Math.round(value); unit='g'; }
  else { unit=selectedMetric.value.unit; if(unit==='kg')value=value.toFixed(2); else if(unit==='°C')value=value.toFixed(1); else value=Math.round(value); }
  return `${context.dataset.label}: ${value} ${unit}`;
};

const renderChart = () => {
  const el = chartCanvas.value || document.querySelector('.pet-data-chart-dialog canvas');
  if (el) renderChartOnElement(el);
};

const renderChartOnElement = (element) => {
  try {
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const chartData = buildChartData();
    if (!chartData) return;
    const { formattedLabels, datasets, yScales } = chartData;
    const xScale = { ticks:{ font:{size:10}, maxRotation:30, minRotation:0 } };
    if (chartInstance.value) {
      chartInstance.value.data.labels = formattedLabels;
      chartInstance.value.data.datasets = datasets;
      chartInstance.value.options.scales = { x: xScale, ...yScales };
      chartInstance.value.options.plugins.legend.display = selectedMetric.value.value === 'diet';
      chartInstance.value.update('active');
      return;
    }
    chartInstance.value = markRaw(new Chart(ctx, {
      type:'line',
      data:{ labels:formattedLabels, datasets },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:selectedMetric.value.value==='diet' }, tooltip:{ callbacks:{ label: tooltipLabelCallback } } },
        scales:{ x: xScale, ...yScales }
      }
    }));
    setTimeout(() => { chartInstance.value?.resize(); }, 100);
  } catch (error) { console.error('Error:', error); notification.error('Chart rendering failed'); }
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '無數據';
  let v;
  if (selectedMetric.value.unit === 'kg')   v = Number(value).toFixed(2);
  else if (selectedMetric.value.unit === '°C') v = Number(value).toFixed(1);
  else v = Math.round(value);
  return `${v} ${selectedMetric.value.unit}`;
};

const trendIcon = computed(() => ({ increasing:'arrow_upward', decreasing:'arrow_downward', stable:'trending_flat' })[stats.value?.trend] || 'trending_flat');
const trendColor = computed(() => ({ increasing:'red', decreasing:'green', stable:'blue' })[stats.value?.trend] || 'blue');
const trendText  = computed(() => ({ increasing:'上升', decreasing:'下降', stable:'穩定' })[stats.value?.trend] || '無數據');

const hasData = computed(() => {
  if (!timeSeriesData.value?.metrics) return false;
  if (selectedMetric.value.value === 'diet') {
    const food = (timeSeriesData.value.metrics.foodAmount || []).filter(v => v !== null && v !== undefined);
    const wet  = (timeSeriesData.value.metrics.wetFoodAmount || []).filter(v => v !== null && v !== undefined);
    return food.length > 0 || wet.length > 0;
  }
  const data = timeSeriesData.value.metrics[selectedMetric.value.value];
  return Array.isArray(data) && data.filter(v => v !== null && v !== undefined).length > 0;
});
</script>

<style scoped>
.chart-dialog-card {
  background: var(--ml-bg);
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0 !important;
  max-height: 88vh;
  width: 100%;
}

/* ── Drag handle ── */
.chart-dialog-handle-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  flex-shrink: 0;
}

.chart-dialog-handle {
  width: 36px;
  height: 4px;
  background: #D9D0C4;
  border-radius: 99px;
}

/* ── Header ── */
.chart-dialog-header {
  background: transparent;
  display: flex;
  align-items: center;
  padding: 4px 18px 12px;
  flex-shrink: 0;
}

.chart-dialog-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ml-text);
}

.close-btn {
  color: var(--ml-text-sec) !important;
}

/* ── Body ── */
.chart-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px !important;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Selectors ── */
.selectors-row {
  display: flex;
  gap: 12px;
}

.selector-wrap { display: flex; flex-direction: column; }
.selector-wrap--metric { flex: 3; }
.selector-wrap--range  { flex: 2; }

.ml-native-select {
  margin-top: 5px;
  width: 100%;
  border: 1.5px solid var(--ml-border);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--ml-text);
  background: var(--ml-surface);
  font-family: inherit;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23B8A882' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
.ml-native-select:focus { border-color: var(--ml-primary); }

/* ── Chart ── */
.chart-wrapper {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  box-shadow: var(--ml-shadow);
  position: relative;
  height: 50vw;
  max-height: 260px;
  min-height: 180px;
  padding: 12px;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250,248,245,0.88);
  border-radius: var(--ml-r-sm);
  z-index: 10;
}

.chart-overlay--msg {
  flex-direction: column;
  gap: 8px;
}

.chart-overlay__text {
  font-size: 13px;
  color: var(--ml-text-sec);
  text-align: center;
  line-height: 1.5;
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  border-radius: 14px;
  padding: 14px;
}

.stat-card__label {
  font-size: 11px;
  color: var(--ml-text-sec);
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 20px;
  font-weight: 700;
}

.stat-card__value--trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 17px;
}

.stat-card--avg   { background: var(--ml-amber-bg); }
.stat-card--avg   .stat-card__value { color: var(--ml-amber); }

.stat-card--min   { background: var(--ml-green-bg); }
.stat-card--min   .stat-card__value { color: var(--ml-green); }

.stat-card--max   { background: var(--ml-r-smed-bg); }
.stat-card--max   .stat-card__value { color: var(--ml-r-smed); }

.stat-card--trend { background: var(--ml-blue-bg); }
.stat-card--trend .stat-card__value { color: var(--ml-blue); }
</style>
