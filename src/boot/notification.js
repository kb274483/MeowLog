import { reactive } from 'vue'


const state = reactive({
  show: false,
  type: 'info',
  title: '',
  message: '',
  buttonText: '確定',
  autoClose: true,
  duration: 3000
})

// 通知
const notification = {
  // 顯示
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
  
  // 關閉
  close() {
    state.show = false
  },
  
  // Success
  success(message, options = {}) {
    this.show({
      type: 'success',
      title: '成功',
      message,
      ...options
    })
  },
  
  // Error
  error(message, options = {}) {
    this.show({
      type: 'error',
      title: '錯誤',
      message,
      ...options
    })
  },
  
  // Info
  info(message, options = {}) {
    this.show({
      type: 'info',
      title: '資訊',
      message,
      ...options
    })
  },
  
  // Warning
  warning(message, options = {}) {
    this.show({
      type: 'warning',
      title: '警告',
      message,
      ...options
    })
  }
}

export { state, notification } 