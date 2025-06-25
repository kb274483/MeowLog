/**
 * 將日期格式化為 YYYY-MM-DD 格式
 * @param {Date|string} date - 日期對象或日期字符串
 * @returns {string} 格式化後的日期字符串
 */
export const formatDate = (date) => {
  if (!(date instanceof Date)) {
    try {
      date = new Date(date);
      if (isNaN(date.getTime())) {
        console.warn('無效日期輸入:', date);
        date = new Date(); // 使用當前日期作為後備
      }
    } catch (error) {
      console.error('日期解析錯誤:', error);
      date = new Date(); // 使用當前日期作為後備
    }
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 解析 ISO 格式的日期字符串
 * @param {string} isoString - ISO 格式的日期字符串
 * @returns {Date} 日期對象
 */
export const parseISO = (isoString) => {
  if (!isoString) return new Date();
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('無效的 ISO 字符串:', isoString);
      return new Date();
    }
    return date;
  } catch (error) {
    console.error('解析 ISO 日期錯誤:', error);
    return new Date();
  }
}; 