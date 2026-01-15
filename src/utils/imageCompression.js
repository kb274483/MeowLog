/**
 * 圖片壓縮工具
 * 將圖片限制在指定的最大寬/高內，並進行 JPEG 壓縮
 * 
 * @param {File} file - 原始檔案
 * @param {Object} options - 設定選項
 * @param {number} options.maxWidth - 最大寬度 (預設 1920)
 * @param {number} options.maxHeight - 最大高度 (預設 1920)
 * @param {number} options.quality - JPEG 品質 0~1 (預設 0.8)
 * @returns {Promise<Blob>} - 壓縮後的 Blob 物件
 */
export const compressImage = (file, options = {}) => {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;

  return new Promise((resolve) => {
    // 1. 如果不是圖片，直接回傳原檔
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // 2. 建立圖片物件讀取來源
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);

      // 3. 計算縮放後的尺寸 (保持比例)
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // 4. 繪製到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 5. 輸出壓縮後的 Blob (強制轉為 JPEG 以獲得最佳壓縮率)
      // 如果原圖是 PNG 且需要透明度，這裡可能需要判斷，但照片通常是 JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 為了方便後續處理，我們可以把 Blob 偽裝成 File (加上 name 屬性)
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(newFile);
          } else {
            // 失敗則回傳原檔
            console.warn('Image compression failed, using original file');
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      console.warn('Image load error during compression', error);
      resolve(file); // 失敗回傳原檔
    };

    img.src = url;
  });
};
