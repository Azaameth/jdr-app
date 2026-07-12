import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../controllers/useAuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
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
      path: '/campaigns/:id/players',
      name: 'player-list',
      component: () => import('../views/PlayerListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/players/:uid/notes',
      name: 'player-notes',
      component: () => import('../views/PlayerNotesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/team/:teamId',
      name: 'team-detail',
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

  if (to.name === 'login' && authStore.isAuthenticated.value) {
    return { name: 'campaign-list' }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    return { name: 'login' }
  }

  return true
})

export default router
