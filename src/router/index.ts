import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../controllers/useAuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/campaigns',
      name: 'campaign-list',
      component: () => import('../views/CampaignListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id',
      name: 'campaign',
      component: () => import('../views/CampaignView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/team',
      name: 'team',
      component: () => import('../views/TeamView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/players/:uid',
      name: 'player',
      component: () => import('../views/PlayerView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.user.value) {
    return { name: 'home' }
  }
  return true
})

export default router
