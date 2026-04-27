<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-1 scale-[0.97]"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-1 scale-[0.97]"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[10000] flex items-center justify-center px-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40"
        @click="onClose"
      />

      <!-- Modal card -->
      <div
        class="relative bg-white rounded-2xl overflow-hidden w-80"
        :style="cardStyle"
      >
        <div class="p-4 pb-3.5">

          <!-- Main row: icon | text | close -->
          <div class="flex items-start gap-3">

            <!-- Icon -->
            <div
              class="flex-shrink-0 flex items-center justify-center rounded-[13px] mt-0.5"
              :style="iconStyle"
            >
              <component :is="currentIcon" class="w-5 h-5 text-white" />
            </div>

            <!-- Text -->
            <div class="flex-1 min-w-0">
              <p class="font-bold text-[15px] text-[#261E0A] tracking-tight mb-0.5">
                {{ title }}
              </p>
              <p class="text-[13px] text-[#7A6640] leading-relaxed">
                {{ message }}
              </p>
            </div>

            <!-- Close -->
            <button
              class="flex-shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-lg mt-0.5
                     bg-[#FAF8F5] border border-[#EDE5D8] hover:bg-[#EDE5D8] transition-colors"
              @click="onClose"
            >
              <svg class="w-3.5 h-3.5 text-[#B8A882]" fill="none" stroke="currentColor"
                   stroke-width="2.2" stroke-linecap="round" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Divider -->
          <div class="h-px bg-[#EDE5D8] my-3" />

          <!-- Footer: progress bar + button -->
          <div class="flex items-center gap-3">

            <!-- Auto-close progress bar -->
            <div
              v-if="autoClose"
              class="flex-1 h-1 rounded-full overflow-hidden"
              :style="{ background: config.colorL }"
            >
              <div
                :key="progressKey"
                class="h-full rounded-full origin-left"
                :style="{
                  background: config.color,
                  animation: `ml-progress-shrink ${duration}ms linear forwards`,
                }"
              />
            </div>

            <!-- Confirm button -->
            <button
              class="flex-shrink-0 px-[18px] py-[7px] rounded-[10px] font-bold text-[13px]
                     text-white transition-opacity hover:opacity-85 active:opacity-70"
              :style="{ background: config.color, boxShadow: `0 3px 10px ${config.color}38` }"
              @click="onClose"
            >
              {{ buttonText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch, ref, h } from 'vue'

// ── Icons (render function 版，避免 runtime template compile 問題) ──
const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2.5',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  viewBox: '0 0 24 24',
}

const drawPath = (d, delay = 0.1, duration = 0.5) =>
  h('path', {
    d,
    pathLength: 1,
    'stroke-dasharray': 1,
    'stroke-dashoffset': 1,
    style: {
      animation: `ml-icon-draw ${duration}s ease ${delay}s forwards`,
    },
  })

const CheckIcon = {
  render: () => h('svg', svgProps, [drawPath('M5 13l4 4L19 7', 0.1, 0.4)]),
}
const XIcon = {
  render: () => h('svg', svgProps, [
    drawPath('M6 18L18 6', 0.1, 0.25),
    drawPath('M6 6l12 12', 0.3, 0.25),
  ]),
}
const InfoIcon = {
  render: () => h('svg', svgProps, [
    drawPath('M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 0.05, 0.5),
    drawPath('M12 8v4', 0.45, 0.2),
    drawPath('M12 16h.01', 0.6, 0.15),
  ]),
}
const WarnIcon = {
  render: () => h('svg', svgProps, [
    drawPath('M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 0.05, 0.5),
    drawPath('M12 9v4', 0.45, 0.2),
    drawPath('M12 17h.01', 0.6, 0.15),
  ]),
}

// ── Props ──────────────────────────────────────────────
const props = defineProps({
  show:       { type: Boolean, default: false },
  type:       {
    type: String, default: 'info',
    validator: (v) => ['success', 'error', 'info', 'warning'].includes(v)
  },
  title:      { type: String, default: '訊息通知' },
  message:    { type: String, default: '' },
  buttonText: { type: String, default: '確定' },
  autoClose:  { type: Boolean, default: true },
  duration:   { type: Number,  default: 5000 },
})

const emit = defineEmits(['close'])

// ── Config map ─────────────────────────────────────────
const TYPE_CONFIG = {
  success: { color: '#2E7A65', colorL: '#E6F4F0', icon: CheckIcon },
  error:   { color: '#C43C28', colorL: '#FDECEA', icon: XIcon     },
  info:    { color: '#E8911C', colorL: '#FEF4E6', icon: InfoIcon  },
  warning: { color: '#B87010', colorL: '#FFF5DC', icon: WarnIcon  },
}

const config      = computed(() => TYPE_CONFIG[props.type] ?? TYPE_CONFIG.info)
const currentIcon = computed(() => config.value.icon)

const cardStyle = computed(() => ({
  boxShadow: '0 16px 48px rgba(38,30,10,0.16), 0 0 0 1px rgba(38,30,10,0.06)',
  border: `1.5px solid ${config.value.colorL}`,
}))

const iconStyle = computed(() => ({
  width: '42px', height: '42px',
  background: config.value.color,
  boxShadow: `0 3px 10px ${config.value.color}38`,
}))

// ── Auto-close ─────────────────────────────────────────
const progressKey = ref(0)
let timer = null

const onClose = () => emit('close')

watch(() => props.show, (val) => {
  if (val) {
    progressKey.value++
    if (props.autoClose) {
      clearTimeout(timer)
      timer = setTimeout(onClose, props.duration)
    }
  } else {
    clearTimeout(timer)
  }
})
</script>

<style>
/* 全域 keyframes — scoped 內的 keyframe 名稱不受影響，但 inline style 無法參照 scoped hash */
@keyframes ml-progress-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
@keyframes ml-icon-draw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
</style>
