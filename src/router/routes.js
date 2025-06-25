const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { 
        path: 'pet/:id', 
        name: 'pet-details',
        component: () => import('pages/PetDetailsPage.vue') 
      },
      {
        path: 'bowl-logs',
        name: 'bowl-logs',
        component: () => import('pages/BowlLogsPage.vue')
      }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
