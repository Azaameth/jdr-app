import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
    },
    {
      path: '/campaigns/:id',
      name: 'campaign',
      component: () => import('../views/CampaignView.vue'),
    },
    {
      path: '/campaigns/:id/team',
      name: 'team',
      component: () => import('../views/TeamView.vue'),
    },
    {
      path: '/campaigns/:id/players/:uid',
      name: 'player',
      component: () => import('../views/PlayerView.vue'),
    },
  ],
})

export default router
