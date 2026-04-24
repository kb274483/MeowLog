<template>
  <div class="pet-card" @click="$emit('select-pet', pet)">
    <!-- Full background image -->
    <img
      :src="pet.photoURL || defaultImage"
      :alt="pet.name"
      class="pet-card__bg"
      @load="handleImageLoad"
    />
    <div v-if="isImageLoading" class="pet-card__loading">
      <q-spinner-dots size="32px" color="white" />
    </div>

    <!-- Full-card gradient overlay -->
    <div class="pet-card__gradient"></div>

    <!-- Top action buttons -->
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

    <!-- Top-left health badge -->
    <div class="pet-card__badge-wrap">
      <span class="health-badge" :class="healthBadgeClass">{{ pet.healthStatus || '—' }}</span>
    </div>

    <!-- Bottom content -->
    <div class="pet-card__content">
      <div class="pet-card__header">
        <span class="pet-card__name">{{ pet.name }}</span>
        <button @click.stop="goToFiles" class="pet-card__folder-btn" title="檔案管理">
          <q-icon name="folder" style="font-size: 16px;" />
        </button>
      </div>

      <div class="pet-card__meta">
        <span class="pet-card__meta-item">
          <q-icon name="cake" size="13px" />
          {{ displayAge }} 歲
        </span>
        <span class="pet-card__meta-divider"></span>
        <span class="pet-card__meta-item">
          <q-icon name="monitor_weight" size="13px" />
          {{ pet.weight || '—' }} kg
        </span>
      </div>

      <p v-if="pet.description" class="pet-card__desc">{{ pet.description }}</p>
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

const defaultImage = 'https://via.placeholder.com/400x600?text=No+Image';

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
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: var(--ml-r-md, 16px);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--ml-shadow);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  isolation: isolate;
  background: var(--ml-primary-l);
}
.pet-card:hover {
  box-shadow: var(--ml-shadow-md);
  transform: translateY(-3px);
}
.pet-card:hover .pet-card__bg {
  transform: scale(1.06);
}

/* ── Background image ── */
.pet-card__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  transition: transform 0.5s ease;
}

.pet-card__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ml-primary-l);
  z-index: 2;
}

/* ── Full gradient overlay ── */
.pet-card__gradient {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0) 30%,
    rgba(0, 0, 0, 0.15) 55%,
    rgba(0, 0, 0, 0.6) 80%,
    rgba(0, 0, 0, 0.85) 100%
  );
  pointer-events: none;
}

/* ── Actions ── */
.pet-card__actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  z-index: 5;
}

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background 0.15s, transform 0.15s;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.32);
  transform: scale(1.05);
}
.action-btn--danger:hover {
  background: rgba(239, 68, 68, 0.7);
}

/* ── Top-left badge ── */
.pet-card__badge-wrap {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
}
.pet-card__badge-wrap .health-badge {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* ── Bottom content ── */
.pet-card__content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  padding: 8px 12px 8px;
  color: #fff;
}

.pet-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.pet-card__name {
  color: #fff;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  line-height: 1.2;
}

.pet-card__folder-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.15s;
}
.pet-card__folder-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.pet-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  margin-bottom: 6px;
}
.pet-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.pet-card__meta-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
}

.pet-card__desc {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.45;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
</style>
