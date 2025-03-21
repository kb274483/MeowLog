<template>
  <div>
    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <pet-card 
        v-for="pet in pets" 
        :key="pet.id" 
        :pet="pet" 
        @click="$emit('select-pet', pet)"
        @edit-pet="$emit('edit-pet', $event)"
        @delete-pet="$emit('delete-pet', $event)"
      />
      
      <div 
        class="min-h-24 w-full flex flex-col items-center justify-center bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors duration-200"
        @click="$emit('add-pet')"
      >
        <div class="rounded-full bg-amber-200 p-3 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>
    </div>
    
    <div v-if="pets.length === 0 && !loading" class="text-center text-gray-500 mt-8">
      <p>No pets yet, click the plus button to add your first pet!</p>
    </div>
    
    <div v-if="loading" class="text-center py-12">
      <q-spinner-dots size="40px" color="amber" />
      <p class="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
</template>

<script setup>
import PetCard from './PetCard.vue';

defineProps({
  pets: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['add-pet', 'select-pet', 'edit-pet', 'delete-pet']);
</script>
