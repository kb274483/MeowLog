<template>
  <div>
    <div class="pet-grid">
      <pet-card
        v-for="pet in pets"
        :key="pet.id"
        :pet="pet"
        @click="$emit('select-pet', pet)"
        @edit-pet="$emit('edit-pet', $event)"
        @delete-pet="$emit('delete-pet', $event)"
      />

      <!-- Add pet card -->
      <div class="add-pet-card" @click="$emit('add-pet')">
        <div class="add-pet-card__icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <span class="add-pet-card__label">新增毛孩</span>
      </div>
    </div>

    <div v-if="pets.length === 0 && !loading" class="empty-state">
      <p>還沒有毛孩，點擊右方「+」新增第一隻！</p>
    </div>

    <div v-if="loading" class="loading-state">
      <q-spinner-dots size="40px" color="primary" />
      <p class="mt-3" style="color: var(--ml-text-sec); font-size: 14px;">載入中...</p>
    </div>
  </div>
</template>

<script setup>
import PetCard from './PetCard.vue';

defineProps({
  pets: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

defineEmits(['add-pet', 'select-pet', 'edit-pet', 'delete-pet']);
</script>

<style scoped>
.pet-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 640px) {
  .pet-grid { grid-template-columns: repeat(3, 1fr); }
}

.add-pet-card {
  border-radius: var(--ml-r-sm);
  border: 2px dashed var(--ml-primary-bd);
  background: var(--ml-primary-l);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.add-pet-card:hover { background: #fde8c0; }

.add-pet-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(145deg, #F5A030 0%, #D97810 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.add-pet-card__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-primary);
}

.empty-state {
  text-align: center;
  color: var(--ml-text-muted);
  font-size: 14px;
  margin-top: 32px;
}

.loading-state {
  text-align: center;
  padding: 48px 0;
}
</style>
