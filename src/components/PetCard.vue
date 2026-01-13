<template>
  <div class="pet-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
    <div class="absolute top-2 right-2 flex space-x-1 z-10">
      <button 
        @click.stop="$emit('edit-pet', pet)"
        class="bg-amber-100 hover:bg-amber-200 text-amber-800 p-1.5 rounded-full transition-colors duration-200"
        title="編輯"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button 
        @click.stop="showConfirmDelete = true"
        class="bg-red-100 hover:bg-red-200 text-red-800 p-1.5 rounded-full transition-colors duration-200"
        title="刪除"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
    
    <div class="relative pt-8">
      <img 
        :src="pet.photoURL || defaultImage" 
        :alt="pet.name" 
        class="w-32 h-32 mx-auto object-cover rounded-full"
        @load="handleImageLoad"
      />
      <div v-if="isImageLoading" class="absolute inset-0 flex items-center justify-center">
        <q-spinner-dots size="40px" color="amber" />
      </div>
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-white text-lg font-bold truncate">{{ pet.name }}</h3>
          <button
            @click.stop="goToFiles"
            class="shrink-0 bg-white/15 hover:bg-white/25 text-white p-1.5 rounded-full transition-colors"
            title="檔案管理"
          >
            <q-icon name="folder" size="16px" />
          </button>
        </div>
      </div>
    </div>
    
    <div class="p-4">
      <div class="flex items-center mb-2">
        <span 
          class="inline-block px-2 py-1 rounded-full text-xs"
          :class="healthStatusClass"
        >
          {{ pet.healthStatus || '' }}
        </span>
      </div>

      <div class="flex justify-between items-center mb-2">
        <span class="text-gray-600 text-sm">{{ displayAge }} 歲</span>
        <span class="text-gray-600 text-sm">{{ pet.weight || '未填' }} kg</span>
      </div>
      
      
      <p class="text-gray-700 text-sm line-clamp-2">
        {{ pet.description || 'No description' }}
      </p>
    </div>
    
    <confirm-dialog
      v-model="showConfirmDelete"
      title="刪除寶貝"
      :message="`確定要刪除 ${pet.name} 嗎？`"
      confirm-label="刪除"
      confirm-color="red"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ConfirmDialog from './ConfirmDialog.vue';

const props = defineProps({
  pet: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit-pet', 'delete-pet']);
const isImageLoading = ref(true);
const router = useRouter();

const handleImageLoad = () => {
  isImageLoading.value = false;
}

const goToFiles = () => {
  if (!props.pet?.id) return;
  router.push({ name: 'pet-files', params: { id: props.pet.id } });
};

// Delete Confirmation
const showConfirmDelete = ref(false);
const isDeleting = ref(false);

// Default Image
const defaultImage = 'https://via.placeholder.com/200x150?text=No+Image';

// Calculate age from birthDate
const displayAge = computed(() => {
  if (!props.pet.birthDate) {
    return props.pet.age || '未知';
  }
  
  const birthDate = new Date(props.pet.birthDate);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  
  // 調整年齡：如果今年的生日還沒到，則年齡減1
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Health Status Class
const healthStatusClass = computed(() => {
  switch(props.pet.healthStatus) {
    case '健康':
      return 'bg-green-100 text-green-800';
    case '需要注意':
      return 'bg-yellow-100 text-yellow-800';
    case '生病':
      return 'bg-red-100 text-red-800';
    case '天使':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

// Delete Pet
const handleDelete = async () => {
  isDeleting.value = true;
  try {
    emit('delete-pet', props.pet);
  } finally {
    isDeleting.value = false;
    showConfirmDelete.value = false;
  }
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 