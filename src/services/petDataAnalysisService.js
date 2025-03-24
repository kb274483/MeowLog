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
export const getPetTimeSeriesData = async (petId, familyId, startDate, endDate, metrics = []) => {
  try {
    const petRecordsQuery = query(
      collection(db, 'petDailyRecords'),
      where('petId', '==', petId),
      where('familyId', '==', familyId),
      where('date', '>=', startDate.toISOString().split('T')[0]),
      where('date', '<=', endDate.toISOString().split('T')[0]),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(petRecordsQuery);
    
    const result = {
      dates: [],
      metrics: {
        dailyWeight: [],
        foodAmount: [],
        waterAmount: [],
        respirationRate: [],
        heartRate: []
      }
    };
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      result.dates.push(data.date);
      
      metrics.forEach(metric => {
        if (result.metrics[metric]) {
          result.metrics[metric].push(data[metric] || null);
        }
      });
    });
    
    return result;
  } catch (error) {
    console.error('獲取寵物時間序列數據失敗:', error);
    throw error;
  }
};

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {Date} date - 日期對象
 * @returns {String} - 格式化的日期字符串
 */
// function formatDate(date) {
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `${year}-${month}-${day}`;
// }

/**
 * 獲取寵物的統計摘要數據
 * @param {Object} timeSeriesData - 時間序列數據
 * @param {String} metric - 指標名稱
 * @returns {Object} - 統計摘要
 */
export const getMetricStats = (timeSeriesData, metric) => {
  if (!timeSeriesData || !timeSeriesData.metrics || !timeSeriesData.metrics[metric]) {
    return {
      avg: null,
      min: null,
      max: null,
      trend: 'stable'
    };
  }
  
  const values = timeSeriesData.metrics[metric].filter(val => val !== null && val !== undefined);
  
  if (values.length === 0) {
    return {
      avg: null,
      min: null,
      max: null,
      trend: 'stable'
    };
  }
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  let trend = 'stable';
  if (values.length > 1) {
    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diffPercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (diffPercent > 5) {
      trend = 'increasing';
    } else if (diffPercent < -5) {
      trend = 'decreasing';
    }
  }
  
  return {
    avg,
    min,
    max,
    trend
  };
};

/**
 * 獲取日期的週數
 * @param {Date} date - 日期對象
 * @returns {Number} - 週數 (1-53)
 */
// function getWeekNumber(date) {
//   const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
//   const dayNum = d.getUTCDay() || 7;
//   d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//   const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//   return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
// }

/**
 * 計算指定時間範圍的數據平均值
 * @param {Object} timeSeriesData - 時間序列數據
 * @param {String} metric - 指標名稱
 * @param {String} interval - 時間間隔 ('week', 'biweek', 'month', 'quarter', 'halfyear', 'year')
 * @returns {Object} - 按時間間隔的平均值
 */
export const getAveragesByInterval = (timeSeriesData, metric, interval = 'day') => {
  if (!timeSeriesData || !timeSeriesData.dates || !timeSeriesData.metrics || !timeSeriesData.metrics[metric]) {
    return { labels: [], values: [] };
  }
  
  const dates = timeSeriesData.dates;
  const values = timeSeriesData.metrics[metric];
  
  const groupedData = {};
  
  dates.forEach((date, index) => {
    if (values[index] === null || values[index] === undefined) return;
    
    let groupKey = date;
    
    if (interval === 'week') {
      const d = new Date(date);
      const weekNumber = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
      groupKey = `${date.substring(0, 7)}-W${weekNumber}`;
    } else if (interval === 'month') {
      groupKey = date.substring(0, 7);
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = [];
    }
    
    groupedData[groupKey].push(values[index]);
  });
  
  const labels = Object.keys(groupedData).sort();
  const averages = labels.map(key => {
    const groupValues = groupedData[key];
    return groupValues.reduce((a, b) => a + b, 0) / groupValues.length;
  });
  
  return {
    labels,
    values: averages
  };
}; 