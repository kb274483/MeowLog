<template>
  <div class="edit-pet-form">
    <form @submit.prevent="handleSubmit">
      <div class="mb-6">
        <div class="flex flex-col items-center mb-4">
          <div 
            class="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-2 border-2 border-amber-300"
            @click="triggerFileUpload"
          >
            <img 
              v-if="previewImage || form.photoURL" 
              :src="previewImage || form.photoURL" 
              class="w-full h-full object-cover" 
              alt="Photo Preview"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-amber-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <input 
              type="file" 
              ref="fileInput" 
              accept="image/*" 
              class="hidden"
              @change="handleFileChange" 
            />
            
            <div class="absolute inset-0 bg-black/10 bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
              <span class="text-white text-sm font-medium">
                Change
              </span>
            </div>
          </div>
          <p v-if="isUploading" class="text-amber-600 text-sm">
            uploading... {{ uploadProgress }}%
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">名字 *</label>
            <input 
              v-model="form.name" 
              type="text" 
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">健康狀態</label>
            <select 
              v-model="form.healthStatus" 
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
            >
              <option value="健康">健康</option>
              <option value="需要注意">需要注意</option>
              <option value="生病">生病</option>
              <option value="天使">天使</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
            <input 
              v-model="form.birthDate" 
              type="date" 
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">體重</label>
            <div class="flex">
              <input 
                v-model.number="form.weight" 
                type="number" 
                min="0" 
                step="0.1"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
              />
              <span class="ml-2 flex items-center text-gray-500">kg</span>
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea 
            v-model="form.description" 
            rows="3" 
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring focus:ring-amber-500 focus:ring-opacity-50 p-2"
          ></textarea>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          type="button" 
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          @click="$emit('cancel')"
        >
          取消
        </button>
        <button 
          type="submit" 
          class="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none"
          :disabled="isSubmitting || !form.name"
        >
          {{ isSubmitting ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { notification } from 'src/boot/notification';

const props = defineProps({
  pet: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['submit', 'cancel']);

const form = reactive({
  name: '',
  birthDate: null,
  weight: null,
  healthStatus: '健康',
  description: '',
  photoURL: null
});

const fileInput = ref(null);
const previewImage = ref(null);
const isUploading = ref(false);
const isSubmitting = ref(false);
const uploadProgress = ref(0);
const fileToUpload = ref(null);

// initialize form data
onMounted(() => {
  if (props.pet) {
    form.name = props.pet.name || '';
    form.birthDate = props.pet.birthDate || null;
    form.weight = props.pet.weight || null;
    form.healthStatus = props.pet.healthStatus || '健康';
    form.description = props.pet.description || '';
    form.photoURL = props.pet.photoURL || null;
  }
});

// trigger file upload
const triggerFileUpload = () => {
  fileInput.value.click();
};

// handle file change
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // validate file type
  if (!file.type.match('image.*')) {
    notification.error('請選擇圖片檔案');
    return;
  }
  
  // preview image
  fileToUpload.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

// upload image to Firebase Storage
const uploadImage = async () => {
  if (!fileToUpload.value) return null;
  
  const storage = getStorage();
  const fileExtension = fileToUpload.value.name.split('.').pop();
  const fileName = `pets/${Date.now()}.${fileExtension}`;
  const imageRef = storageRef(storage, fileName);
  
  isUploading.value = true;
  uploadProgress.value = 0;
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(imageRef, fileToUpload.value);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        // upload progress
        uploadProgress.value = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
      }, 
      (error) => {
        // error handling
        console.error('Upload failed:', error);
        isUploading.value = false;
        reject(error);
      }, 
      async () => {
        // upload completed
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        isUploading.value = false;
        resolve(downloadURL);
      }
    );
  });
};

// submit form
const handleSubmit = async () => {
  if (!form.name) {
    notification.warning('他要叫什麼名字呢？!');
    return;
  }
  
  try {
    isSubmitting.value = true;
    
    // if there is a new image, upload it first
    if (fileToUpload.value) {
      const photoURL = await uploadImage();
      form.photoURL = photoURL;
    }
    
    const petData = { ...form };
    
    emit('submit', {
      id: props.pet.id,
      ...petData
    });
    
  } catch (error) {
    console.error('Error submitting pet form:', error);
    notification.error('發生一些錯誤，稍後再試');
  } finally {
    isSubmitting.value = false;
  }
};
</script> 