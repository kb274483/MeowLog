<template>
  <div class="pet-card" @click="$emit('select-pet', pet)">
    <!-- Action buttons -->
    <div class="pet-card__actions">
      <button @click.stop="$emit('edit-pet', pet)" class="action-btn" title="編輯">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button @click.stop="showConfirmDelete = true" class="action-btn action-btn--danger" title="刪除">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Photo area -->
    <div class="pet-card__photo">
      <img
        :src="pet.photoURL || defaultImage"
        :alt="pet.name"
        class="pet-card__img"
        @load="handleImageLoad"
      />
      <div v-if="isImageLoading" class="pet-card__img-loading">
        <q-spinner-dots size="32px" color="primary" />
      </div>

      <!-- Gradient overlay + name row -->
      <div class="pet-card__overlay">
        <span class="pet-card__name">{{ pet.name }}</span>
        <button @click.stop="goToFiles" class="pet-card__folder-btn" title="檔案管理">
          <q-icon name="folder" style="font-size: 15px;" />
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="pet-card__info">
      <div class="mb-2">
        <span class="health-badge" :class="healthBadgeClass">{{ pet.healthStatus || '—' }}</span>
      </div>
      <div class="pet-card__meta">
        <span>{{ displayAge }} 歲</span>
        <span>{{ pet.weight || '—' }} kg</span>
      </div>
      <p class="pet-card__desc">{{ pet.description || '' }}</p>
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

const props = defineProps({ pet: { type: Object, required: true } });
const emit = defineEmits(['edit-pet', 'delete-pet', 'select-pet']);

const isImageLoading = ref(true);
const router = useRouter();
const showConfirmDelete = ref(false);
const isDeleting = ref(false);

const defaultImage = 'https://via.placeholder.com/200x150?text=No+Image';

const handleImageLoad = () => { isImageLoading.value = false; };

const goToFiles = () => {
  if (!props.pet?.id) return;
  router.push({ name: 'pet-files', params: { id: props.pet.id } });
};

const displayAge = computed(() => {
  if (!props.pet.birthDate) return props.pet.age || '未知';
  const birthDate = new Date(props.pet.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
});

const healthBadgeClass = computed(() => {
  switch (props.pet.healthStatus) {
    case '健康':     return 'health-badge--healthy';
    case '需要注意': return 'health-badge--caution';
    case '生病':     return 'health-badge--sick';
    case '天使':     return 'health-badge--angel';
    default:         return 'health-badge--default';
  }
});

const handleDelete = async () => {
  isDeleting.value = true;
  try { emit('delete-pet', props.pet); }
  finally { isDeleting.value = false; showConfirmDelete.value = false; }
};
</script>

<style scoped>
.pet-card {
  background: var(--ml-surface);
  border-radius: var(--ml-r-sm);
  box-shadow: var(--ml-shadow);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: box-shadow 0.2s, transform 0.2s;
}
.pet-card:hover {
  box-shadow: var(--ml-shadow-md);
  transform: translateY(-2px);
}

/* ── Actions ── */
.pet-card__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 5px;
  z-index: 10;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.88);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ml-text-sec);
  transition: background 0.15s;
}
.action-btn:hover { background: #fff; }
.action-btn--danger { color: var(--ml-r-smed); }
.action-btn--danger:hover { background: var(--ml-r-smed-bg); }

/* ── Photo ── */
.pet-card__photo {
  position: relative;
  height: 130px;
  overflow: hidden;
  background: var(--ml-primary-l);
}

.pet-card__img {
  width: 100%;
  height: 100%;
  object-fit:cover;
}

.pet-card__img-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ml-primary-l);
}

.pet-card__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.42));
  padding: 24px 10px 8px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.pet-card__name {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
  line-height: 1.2;
}

.pet-card__folder-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.pet-card__folder-btn:hover { background: rgba(255,255,255,0.32); }

/* ── Info ── */
.pet-card__info {
  padding: 10px 12px 13px;
}

.pet-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ml-text-sec);
  font-weight: 500;
  margin-bottom: 5px;
}

.pet-card__desc {
  font-size: 11px;
  color: var(--ml-text-muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
