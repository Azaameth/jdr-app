<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../controllers/useAuthStore'

const props = defineProps<{
  campaignId: string
  teamId?: string
  playerId?: string
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user.value)

const hierarchy = computed(() => {
  const items = [{ label: 'Campagne', to: `/campaigns/${props.campaignId}` }]

  if (props.teamId) {
    items.push({ label: 'Équipe', to: `/campaigns/${props.campaignId}/team/${props.teamId}` })
  }

  if (props.playerId) {
    items.push({ label: 'Joueur', to: `/campaigns/${props.campaignId}/players/${props.playerId}` })
  }

  return items
})

function goUp() {
  if (props.playerId) {
    router.push(`/campaigns/${props.campaignId}/team/${props.teamId ?? ''}`)
    return
  }

  if (props.teamId) {
    router.push(`/campaigns/${props.campaignId}`)
  }
}

function goToSibling(target: string) {
  if (props.playerId) {
    router.push(`/campaigns/${props.campaignId}/players/${target}`)
  }
}
</script>

<template>
  <div class="campaign-shell">
    <aside class="sidebar">
      <div class="section-block">
        <h3>Hiérarchie</h3>
        <div class="crumbs">
          <RouterLink v-for="item in hierarchy" :key="item.to" :to="item.to" class="crumb-item">
            {{ item.label }}
          </RouterLink>
        </div>
        <div class="actions">
          <button v-if="props.playerId || props.teamId" class="action-btn" @click="goUp">
            Remonter
          </button>
          <button v-if="props.playerId" class="action-btn" @click="goToSibling('2')">
            Joueur suivant
          </button>
        </div>
      </div>

      <div class="section-block">
        <h3>Navigation</h3>
        <RouterLink :to="`/campaigns/${props.campaignId}`" class="nav-link"
          >Vue campagne</RouterLink
        >
        <RouterLink :to="`/campaigns/${props.campaignId}/team`" class="nav-link">Équipe</RouterLink>
        <RouterLink :to="`/campaigns/${props.campaignId}/players/1`" class="nav-link"
          >Joueur</RouterLink
        >
      </div>

      <div class="user-card">
        <p class="user-name">{{ user?.displayName ?? 'Invité' }}</p>
        <p class="user-role">{{ user?.role ?? 'visiteur' }}</p>
        <button class="logout-btn" @click="authStore.signOut()">Se déconnecter</button>
      </div>
    </aside>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.campaign-shell {
  display: flex;
  min-height: 100vh;
  background: #111008;
  color: #f2e6cc;
}

.sidebar {
  width: 280px;
  padding: 1rem;
  background: linear-gradient(180deg, #16120c 0%, #120e08 100%);
  border-right: 1px solid rgba(212, 168, 67, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-block {
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: 10px;
  padding: 0.9rem;
  background: rgba(212, 168, 67, 0.06);
}

.crumbs {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.crumb-item,
.nav-link {
  color: #f0c96a;
  text-decoration: none;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.action-btn,
.logout-btn {
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(212, 168, 67, 0.1);
  color: #f2e6cc;
  border-radius: 6px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
}

.user-card {
  margin-top: auto;
  border-top: 1px solid rgba(212, 168, 67, 0.16);
  padding-top: 1rem;
}

.user-name {
  font-weight: 700;
  color: #f0c96a;
}

.user-role {
  color: #a09070;
  margin-bottom: 0.6rem;
}

.content {
  flex: 1;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .campaign-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid rgba(212, 168, 67, 0.2);
  }
}
</style>
