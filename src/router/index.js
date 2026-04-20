import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

let _appInitialized = false

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to, from, next) => {
    if (!_appInitialized) {
      _appInitialized = true
      const { useUserStore } = await import('src/stores/userStore')
      const { loadAppSnapshot } = await import('src/services/appSnapshotService')
      const userStore = useUserStore()

      const snapshot = await loadAppSnapshot()
      if (snapshot?.userId && snapshot?.user) {
        userStore.hydrateFromSnapshot(snapshot)
        userStore.loading = false
        // 非首頁才由 guard 啟動 background auth；IndexPage 的 onMounted 會自己處理
        if (to.path !== '/') {
          void userStore.initAuth({ background: true })
        }
      } else {
        await userStore.initAuth()
      }
    }
    next()
  })

  return Router
})
