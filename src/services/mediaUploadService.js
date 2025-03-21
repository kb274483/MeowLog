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
const uploadMediaFile = async (file, options) => {
  if (!file.file) {
    throw new Error('無效的文件對象');
  }

  const { familyId, petId, dateString } = options;
  
  // Create storage path
  const fileExtension = file.file.name.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const fileName = `${timestamp}_${Math.floor(Math.random() * 10000)}.${fileExtension}`;
  const path = `pets/${familyId}/${petId}/${dateString}/${fileName}`;
  
  // Create storage reference
  const fileRef = storageRef(storage, path);
  
  // Execute upload
  const uploadTask = uploadBytesResumable(fileRef, file.file);
  
  // Return Promise, wait for upload completed
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      () => {}, // Progress listener (ignore here, handled by bulk upload function)
      (error) => {
        // Upload failed
        console.error('File upload failed:', error);
        reject(error);
      },
      async () => {
        // Upload success
        try {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Return URL and path
          resolve(downloadURL);
        } catch (error) {
          console.error('Get download URL failed:', error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Upload media files to Firebase Storage
 * @param {Array} mediaFiles - Array of file objects
 * @param {Object} options - Upload options
 * @param {Function} progressCallback - Callback for upload progress
 * @returns {Promise<Array>} - Array of updated file objects
 */
export const uploadMediaFiles = async (mediaFiles, options, progressCallback) => {
  const updatedFiles = [...mediaFiles];
  let totalFiles = updatedFiles.filter(file => file.isNew).length;
  let completedFiles = 0;
  
  if (totalFiles === 0) {
    // No new files to upload
    if (progressCallback) progressCallback(100);
    return updatedFiles;
  }

  // Process each file
  for (let i = 0; i < updatedFiles.length; i++) {
    const file = updatedFiles[i];

    // Skip uploaded or error files
    if (!file.isNew || file.loadError) {
      continue;
    }
    
    try {
      // Calculate current overall progress
      const currentProgress = Math.floor((completedFiles / totalFiles) * 100);
      if (progressCallback) progressCallback(currentProgress);
      
      // Upload file
      const uploadedUrl = await uploadMediaFile(file, options);
      
      // Update file information
      updatedFiles[i] = {
        ...file,
        url: uploadedUrl,
        path: `pets/${options.familyId}/${options.petId}/${options.dateString}/${file.name}`,
        uploadedAt: new Date().toISOString(),
        isNew: false
      };
      
      // Update completed files count
      completedFiles++;
      
      // Smooth progress bar
      const smoothProgress = Math.floor((completedFiles / totalFiles) * 100);
      if (progressCallback) progressCallback(smoothProgress);
      
    } catch (error) {
      console.error('Upload media file failed:', error, file);
      
      // Mark as upload failed
      updatedFiles[i] = {
        ...file,
        loadError: true,
        errorMessage: 'Upload failed'
      };
      
      // Update completed files count (even failed, it's completed)
      completedFiles++;
    }
  }
  
  // Ensure final progress is 100%
  if (progressCallback) progressCallback(100);
  
  return updatedFiles;
};

/**
 * Get clean file objects for Firestore (remove unnecessary fields)
 * @param {Array} mediaFiles - Array of file objects
 * @returns {Array} - Cleaned array for saving to database
 */
export function getCleanMediaFiles(mediaFiles) {
  // Filter out files with errors and prepare for Firestore
  return mediaFiles
    .filter(file => !file.loadError)
    .map(file => ({
      type: file.type,
      name: file.name,
      size: file.size,
      url: file.url,
      path: file.path,
      uploadedAt: file.uploadedAt,
      wasHeic: file.wasHeic
    }));
} 