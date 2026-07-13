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
      path: '/campaigns/:id/races',
      name: 'race-carousel',
      component: () => import('../views/RaceCarouselView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/classes',
      name: 'class-carousel',
      component: () => import('../views/ClassCarouselView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/castes',
      name: 'castes',
      component: () => import('../views/FactionBrowserView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/des',
      name: 'dice-roller',
      component: () => import('../views/DiceRollerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/players',
      redirect: (to) => `/campaigns/${to.params.id}/team`,
    },
    {
      path: '/campaigns/:id/players/:uid/notes',
      name: 'player-notes',
      component: () => import('../views/PlayerNotesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campaigns/:id/players/:characterId',
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

  // Un joueur ne peut accéder qu'à sa propre fiche personnage
  // La vérification fine se fait dans PlayerView (nécessite un lookup async)

  return true
})

export default router
