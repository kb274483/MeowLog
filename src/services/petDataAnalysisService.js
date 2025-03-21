import { db } from 'src/boot/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

/**
 * 獲取寵物的時間序列數據
 * @param {String} petId - 寵物 ID
 * @param {String} familyId - 家庭 ID
 * @param {Date} startDate - 開始日期
 * @param {Date} endDate - 結束日期
 * @param {String[]} metrics - 要分析的指標 ['foodAmount', 'waterAmount', 'dailyWeight']
 * @returns {Promise<Object>} - 時間序列數據
 */
export async function getPetTimeSeriesData(petId, familyId, startDate, endDate, metrics = ['foodAmount', 'waterAmount', 'dailyWeight']) {
  try {
    // Convert date to string format
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query conditions
    const recordsQuery = query(
      collection(db, 'petDailyRecords'),
      where('petId', '==', petId),
      where('familyId', '==', familyId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(recordsQuery);
    
    // Initialize result object
    const result = {
      dates: [],
      metrics: {}
    };

    // Initialize data arrays for each metric
    metrics.forEach(metric => {
      result.metrics[metric] = [];
    });
    
    // Process query results
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      result.dates.push(data.date);
      
      // Add data for each metric
      metrics.forEach(metric => {
        result.metrics[metric].push(data[metric] !== undefined ? data[metric] : null);
      });
    });
    
    return result;
  } catch (error) {
    console.error('Get time series data failed:', error);
    throw error;
  }
}

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {Date} date - 日期對象
 * @returns {String} - 格式化的日期字符串
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 獲取寵物的統計摘要數據
 * @param {Object} timeSeriesData - 時間序列數據
 * @param {String} metric - 指標名稱
 * @returns {Object} - 統計摘要
 */
export function getMetricStats(timeSeriesData, metric) {
  // Filter out non-null values
  const values = timeSeriesData.metrics[metric].filter(v => v !== null && v !== undefined);
  
  if (values.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
      trend: 'stable',
      dataPoints: 0
    };
  }
  
  // Calculate各项统计值
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = parseFloat((sum / values.length).toFixed(4));
  
  // Calculate trend
  let trend = 'stable';
  if (values.length > 1) {
    const half = Math.floor(values.length / 2);
    // If data points are less than 4, compare first and last
    if (values.length < 4) {
      const first = values[0];
      const last = values[values.length - 1];
      // Avoid division by zero error
      if (first !== 0) {
        const change = ((last - first) / Math.abs(first)) * 100;
        if (change > 5) trend = 'increasing';
        else if (change < -5) trend = 'decreasing';
      } else {
        if (last > 0) trend = 'increasing';
        else if (last < 0) trend = 'decreasing';
      }
    } else {
      const firstHalf = values.slice(0, half);
      const secondHalf = values.slice(half);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Avoid division by zero error
      if (firstHalfAvg !== 0) {
        const change = ((secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg)) * 100;
        if (change > 5) trend = 'increasing';
        else if (change < -5) trend = 'decreasing';
      } else {
        if (secondHalfAvg > 0) trend = 'increasing';
        else if (secondHalfAvg < 0) trend = 'decreasing';
      }
    }
  }
  
  return {
    min,
    max,
    avg,
    trend,
    dataPoints: values.length
  };
}

/**
 * 獲取日期的週數
 * @param {Date} date - 日期對象
 * @returns {Number} - 週數 (1-53)
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 計算指定時間範圍的數據平均值
 * @param {Object} timeSeriesData - 時間序列數據
 * @param {String} metric - 指標名稱
 * @param {String} interval - 時間間隔 ('week', 'biweek', 'month', 'quarter', 'halfyear', 'year')
 * @returns {Object} - 按時間間隔的平均值
 */
export function getAveragesByInterval(timeSeriesData, metric, interval) {
  const { dates, metrics } = timeSeriesData;
  const values = metrics[metric];
  
  if (!dates.length || !values.length) {
    return { labels: [], values: [] };
  }
  
  // Convert date strings to Date objects
  const dateObjects = dates.map(d => new Date(d));
  
  // Initialize result
  const result = {
    labels: [],
    values: []
  };
  
  // Group by interval
  const groups = {};
  
  // Temporary variables, avoid declaring in case
  let weekNumber, week, biweek, quarter, halfyear;
  
  dateObjects.forEach((date, index) => {
    let groupKey;
    
    switch (interval) {
      case 'week': {
        // Group by week: YYYY-WW (year-week number)
        weekNumber = getWeekNumber(date);
        groupKey = `${date.getFullYear()}-W${weekNumber}`;
        break;
      }
      case 'biweek': {
        // Group by biweek: YYYY-BW (year-biweek number)
        week = getWeekNumber(date);
        biweek = Math.ceil(week / 2);
        groupKey = `${date.getFullYear()}-BW${biweek}`;
        break;
      }
      case 'month': {
        // Group by month: YYYY-MM
        groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      }
      case 'quarter': {
        // Group by quarter: YYYY-Q1, YYYY-Q2, ...
        quarter = Math.ceil((date.getMonth() + 1) / 3);
        groupKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      }
      case 'halfyear': {
        // Group by halfyear: YYYY-H1, YYYY-H2
        halfyear = date.getMonth() < 6 ? 1 : 2;
        groupKey = `${date.getFullYear()}-H${halfyear}`;
        break;
      }
      case 'year': {
        // Group by year: YYYY
        groupKey = `${date.getFullYear()}`;
        break;
      }
      default: {
        groupKey = dates[index];
      }
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    // Add non-null values to group
    if (values[index] !== null && values[index] !== undefined) {
      groups[groupKey].push(values[index]);
    }
  });
  
  // Calculate average for each group
  for (const [key, groupValues] of Object.entries(groups)) {
    if (groupValues.length > 0) {
      const avg = parseFloat((groupValues.reduce((a, b) => a + b, 0) / groupValues.length).toFixed(4));
      result.labels.push(key);
      result.values.push(avg);
    }
  }
  
  return result;
} 