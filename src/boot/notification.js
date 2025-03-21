import { reactive } from 'vue'

// 創建一個響應式狀態來存儲通知數據
const state = reactive({
  show: false,
  type: 'info',
  title: '',
  message: '',
  buttonText: '確定',
  autoClose: true,
  duration: 3000
})

// 通知服務
const notification = {
  // 顯示通知
  show(options) {
    Object.assign(state, {
      show: true,
      type: 'info',
      title: '通知',
      message: '',
      buttonText: '確定',
      autoClose: true,
      duration: 3000,
      ...options
    })
  },
  
  // 關閉通知
  close() {
    state.show = false
  },
  
  // 成功通知
  success(message, options = {}) {
    this.show({
      type: 'success',
      title: '成功',
      message,
      ...options
    })
  },
  
  // 錯誤通知
  error(message, options = {}) {
    this.show({
      type: 'error',
      title: '錯誤',
      message,
      ...options
    })
  },
  
  // 信息通知
  info(message, options = {}) {
    this.show({
      type: 'info',
      title: '信息',
      message,
      ...options
    })
  },
  
  // 警告通知
  warning(message, options = {}) {
    this.show({
      type: 'warning',
      title: '警告',
      message,
      ...options
    })
  }
}

// 導出狀態和服務
export { state, notification } 