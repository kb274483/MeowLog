import {
  storage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL
} from 'src/boot/firebase';
import { compressImage } from 'src/utils/imageCompression';

const sanitizeFileName = (name) => {
  if (!name) return `file_${Date.now()}`;
  return String(name).replace(/[^a-zA-Z0-9.\-_]/g, '_');
};

export const getFileCategory = (file) => {
  const mime = file?.type || '';
  const lowerName = (file?.name || '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('text/') || lowerName.endsWith('.txt')) return 'text';
  // Apple Notes 匯出在不同情境可能是 .txt/.rtf/.pdf；若是 .note 也先歸類 other
  return 'other';
};

/**
 * Upload a single pet file to Firebase Storage
 * @param {File} file
 * @param {Object} options { familyId, petId }
 * @param {Function} progressCallback (0-100)
 * @returns {Promise<{ url: string, storagePath: string, fileCategory: string, mimeType: string, size: number, originalName: string }>}
 */
export const uploadPetFile = async (file, options, progressCallback) => {
  if (!file) throw new Error('invalid file');

  const { familyId, petId } = options || {};
  if (!familyId || !petId) throw new Error('Missing upload information');

  const fileCategory = getFileCategory(file);
  const safeName = sanitizeFileName(file.name || `file_${Date.now()}`);
  const storagePathPrefix = `families/${familyId}/pets/${petId}/files`;
  const fileName = `${Date.now()}_${safeName}`;
  const storagePath = `${storagePathPrefix}/${fileName}`;

  const fileRef = storageRef(storage, storagePath);

  let uploadTask;
  try {
    // 嘗試壓縮圖片
    let fileToUpload = file;
    if (fileCategory === 'image') {
      try {
        console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        fileToUpload = await compressImage(file);
        console.log(`Compressed size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (compErr) {
        console.warn('Compression skipped:', compErr);
      }
    }

    uploadTask = uploadBytesResumable(fileRef, fileToUpload);
  } catch (uploadError) {
    // fallback: read as ArrayBuffer
    console.error('Upload failed, trying to read file content:', uploadError);
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
    uploadTask = uploadBytesResumable(fileRef, fileData);
  }

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (!progressCallback) return;
        const pct = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        progressCallback(pct);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          url,
          storagePath,
          fileCategory,
          mimeType: file.type || null,
          size: file.size || null,
          originalName: file.name
        });
      }
    );
  });
};

/**
 * Upload multiple pet files
 * @param {Array<File>} files
 * @param {Object} options
 * @param {Function} progressCallback (overall progress 0-100)
 */
export const uploadPetFiles = async (files, options, progressCallback) => {
  if (!files || !files.length) return [];
  
  const results = [];
  let completedCount = 0;
  const total = files.length;

  for (const file of files) {
    try {
      // Individual file progress contributes to overall progress
      // Simplified: Just count completed files for now to avoid complexity
      // Ideally we would sum up bytes, but sequentially is easier to track by count
      const result = await uploadPetFile(file, options, () => {
        // Optional: finer grain progress logic could go here
      });
      results.push(result);
    } catch (e) {
      console.error('Single file upload failed:', e);
      // We continue uploading others even if one fails
      results.push({ error: e, name: file.name });
    }
    completedCount++;
    if (progressCallback) {
      progressCallback(Math.round((completedCount / total) * 100));
    }
  }
  return results;
};
