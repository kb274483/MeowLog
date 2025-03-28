import { 
  storage, 
  storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'src/boot/firebase';

/**
 * Upload a single media file to Firebase Storage
 * @param {Object} file - File object with file property
 * @param {Object} options - Upload options containing familyId, petId and dateString
 * @returns {Promise<string>} - URL of uploaded file
 */
export const uploadMediaFile = async (file, options) => {
  
  try {
    // 檢查文件對象是否有效
    if (!file) {
      throw new Error('invalid file');
    }
    
    // 檢查文件類型和大小
    // 只需確保基本屬性存在
    if (!file.name) {
      file.name = `file_${Date.now()}.jpg`;
    }
    
    // 構建存儲路徑
    const { familyId, petId, dateString } = options;
    if (!familyId || !petId) {
      throw new Error('Missing upload information');
    }
    
    const storagePathPrefix = `families/${familyId}/pets/${petId}/records/${dateString}`;
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${storagePathPrefix}/${fileName}`;
    
    // 創建引用
    const fileRef = storageRef(storage, storagePath);
    
    // 上傳文件 - 使用更寬容的方式處理文件
    let uploadTask;
    
    try {
      // 首先嘗試直接上傳
      uploadTask = uploadBytesResumable(fileRef, file);
    } catch (uploadError) {
      console.warn('Upload failed, trying to read file content:', uploadError);
      
      // 如果直接上傳失敗，嘗試使用 FileReader 讀取文件內容再上傳
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
      });
      
      uploadTask = uploadBytesResumable(fileRef, fileData);
    }
    
    // 返回 Promise
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          console.error('Upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            // 上傳完成，獲取下載 URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlError) {
            console.error('Failed to get download URL:', urlError);
            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    console.error('Upload processing failed:', error);
    throw error;
  }
};

/**
 * Upload media files to Firebase Storage
 * @param {Array} mediaFiles - Array of file objects
 * @param {Object} options - Upload options
 * @param {Function} progressCallback - Callback for upload progress
 * @returns {Promise<Array>} - Array of updated file objects
 */
export const uploadMediaFiles = async (mediaFiles, uploadOptions, progressCallback) => {
  if (!mediaFiles || !Array.isArray(mediaFiles)) return [];
  
  const filesToUpload = mediaFiles.filter(file => file.isNew && file.file);
  const existingFiles = mediaFiles.filter(file => !file.isNew);
  
  // 如果沒有需要上傳的文件，直接返回原列表
  if (filesToUpload.length === 0) {
    return mediaFiles;
  }
  
  let uploadedCount = 0;
  const totalFiles = filesToUpload.length;
  const updatedFiles = [];
  
  // 處理每個需要上傳的文件
  for (const file of filesToUpload) {
    try {
      // 確保文件物件存在且有效
      if (!file.file) {
        throw new Error('文件物件缺失');
      }
      const downloadURL = await uploadMediaFile(file.file, uploadOptions);
      
      updatedFiles.push({
        url: downloadURL,
        type: file.type || 'image',
        name: file.name || 'file',
        timestamp: Date.now()
      });
      
      uploadedCount++;
      if (progressCallback) {
        progressCallback(Math.round((uploadedCount / totalFiles) * 100));
      }
    } catch (error) {
      console.error('Media upload failed:', error);
      
      updatedFiles.push({
        ...file,
        url: null,
        loadError: true,
        isNew: false
      });
    }
  }
  
  // 確保在上傳完成後設置進度為100%
  if (progressCallback) {
    progressCallback(100);
  }
  
  // 結合已上傳的文件和現有文件，並確保所有文件都有 url 屬性
  return [...existingFiles, ...updatedFiles.filter(file => file.url)];
};

/**
 * Get clean file objects for Firestore (remove unnecessary fields)
 * @param {Array} mediaFiles - Array of file objects
 * @returns {Array} - Cleaned array for saving to database
 */
export const getCleanMediaFiles = (mediaFiles) => {
  if (!mediaFiles || !Array.isArray(mediaFiles)) {
    console.log('getCleanMediaFiles: 無效的 mediaFiles');
    return [];
  }
  
  const cleanedFiles = mediaFiles
    .filter(file => file && file.url) // 只保留有 URL 的文件
    .map(file => {
      const cleaned = {
        url: file.url || '',
        type: file.type || 'image',
        name: file.name || 'file',
        timestamp: file.timestamp || Date.now()
      };
      
      return cleaned;
    });
  
  return cleanedFiles;
}; 