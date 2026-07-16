import { createRouter, createWebHashHistory } from 'vue-router'

import { useAuthStore } from '../controllers/useAuthStore'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'campaign-list' },
    },
    {
      path: '/campaigns',
      name: 'campaign-list',
      component: () => import('../views/CampaignListView.vue'),
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
      path: '/campaigns/:id/cosmology',
      name: 'cosmology',
      component: () => import('../views/CosmologyView.vue'),
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
      path: '/campaigns/:id/players/:characterId',
      name: 'player',
      component: () => import('../views/PlayerListView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated.value) {
    return { name: 'campaign-list' }
  }

  // Un joueur ne peut accéder qu'à sa propre fiche personnage
  // La vérification fine se fait dans PlayerView (nécessite un lookup async)

  return true
})

export default router
