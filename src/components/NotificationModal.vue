<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform opacity-0 scale-95"
    enter-to-class="transform opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform opacity-100 scale-100"
    leave-to-class="transform opacity-0 scale-95"
  >
    <div 
      v-if="show" 
      class="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6"
    >
      <div 
        class="fixed inset-0 transition-opacity"
        @click="onClose"
      >
        <div class="absolute inset-0 bg-black opacity-50"></div>
      </div>
      
      <div 
        class="bg-white rounded-lg px-6 pt-5 pb-6 overflow-hidden shadow-xl transform transition-all w-[60%] sm:w-1/2"
        :class="typeClasses"
      >
        <div class="flex justify-between items-start">
          <div class="flex items-center">
            <div 
              class="rounded-full p-2 mr-3" 
              :class="iconBgClass"
            >
              <span 
                class="flex items-center justify-center h-6 w-6"
                :class="iconClass"
              >
                <template v-if="type === 'success'">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </template>
                <template v-else-if="type === 'error'">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </template>
                <template v-else-if="type === 'info'">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </template>
                <template v-else-if="type === 'warning'">
                  <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </template>
              </span>
            </div>
            <div>
              <h3 
                class="text-lg font-medium"
                :class="titleClass"
              >
                {{ title }}
              </h3>
            </div>
          </div>
          
          <button
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
            @click="onClose"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="mt-3">
          <p class="text-sm text-gray-500">
            {{ message }}
          </p>
        </div>
        
        <div class="mt-5 sm:mt-6">
          <button
            class="w-full rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:text-sm"
            :class="buttonClass"
            @click="onClose"
          >
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch } from 'vue'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'info', 'warning'].includes(value)
  },
  title: {
    type: String,
    default: '訊息通知'
  },
  message: {
    type: String,
    default: ''
  },
  buttonText: {
    type: String,
    default: '確定'
  },
  autoClose: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    default: 5000
  }
})

// Emits
const emit = defineEmits(['close'])

// Computed
const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'border-l-4 border-b-4 border-[#49897D]'
    case 'error':
      return 'border-l-4 border-b-4 border-[#F4C6C7]'
    case 'info':
      return 'border-l-4 border-b-4 border-[#5BA9D9]'
    case 'warning':
      return 'border-l-4 border-b-4 border-[#FFA340]'
    default:
      return ''
  }
})

const iconBgClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-100'
    case 'error':
      return 'bg-red-100'
    case 'info':
      return 'bg-blue-100'
    case 'warning':
      return 'bg-yellow-100'
    default:
      return 'bg-gray-100'
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'info':
      return 'text-blue-500'
    case 'warning':
      return 'text-yellow-500'
    default:
      return 'text-gray-500'
  }
})

const titleClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-800'
    case 'error':
      return 'text-red-800'
    case 'info':
      return 'text-blue-800'
    case 'warning':
      return 'text-yellow-800'
    default:
      return 'text-gray-800'
  }
})

const buttonClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-[#49897D] hover:bg-[#49897DCC]'
    case 'error':
      return 'bg-[#F23535] hover:bg-[#F23535CC]'
    case 'info':
      return 'bg-[#5BA9D9] hover:bg-[#5BA9D9CC]'
    case 'warning':
      return 'bg-[#FFA340] hover:bg-[#FFA340CC]'
    default:
      return 'bg-gray-600 hover:bg-gray-700'
  }
})

// Methods
const onClose = () => {
  emit('close')
}

// Auto close timer
let timer = null

watch(() => props.show, (newVal) => {
  if (newVal && props.autoClose) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      emit('close')
    }, props.duration)
  }
})
</script> 