<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../controllers/useAuthStore'
import { useCampaignStore } from '../../controllers/useCampaignStore'
import { usePlayerStore } from '../../controllers/usePlayerStore'

const props = defineProps<{
  campaignId: string
}>()

const router = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()
const playerStore = usePlayerStore()

const user = computed(() => authStore.user.value)
const campaign = computed(() =>
  campaignStore.campaigns.value.find((item) => item.id === props.campaignId),
)

const characterId = ref<string | null>(null)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
  if (user.value?.uid) {
    characterId.value = await playerStore.resolveCharacterId(user.value.uid, props.campaignId)
  }
})

async function logout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="campaign-shell">
    <aside class="sidebar">
      <div class="sidebar-group">
        <div class="group-heading">Joueur</div>
        <div class="group-card">
          <span>{{ user?.displayName ?? 'Invité' }}</span>
          <strong>{{ user?.role ?? 'Rôle inconnu' }}</strong>
        </div>
        <RouterLink
          v-if="characterId"
          :to="`/campaigns/${props.campaignId}/players/${characterId}/notes`"
          class="group-link"
        >
          Notes perso
        </RouterLink>
        <RouterLink
          v-if="characterId"
          :to="`/campaigns/${props.campaignId}/players/${characterId}`"
          class="group-link"
        >
          Personnage
        </RouterLink>
        <span v-else class="group-link disabled">Personnage (non assigné)</span>
      </div>

      <div class="sidebar-group">
        <div class="group-heading">Équipe</div>
        <RouterLink :to="`/campaigns/${props.campaignId}/team`" class="group-link"
          >Situation globale</RouterLink
        >
      </div>

      <div class="sidebar-group campaign-group">
        <div class="group-heading">Campagne</div>
        <div class="group-card campaign-card">
          <strong>{{ campaign?.title ?? 'Campagne inconnue' }}</strong>
          <p>{{ campaign?.summary ?? 'Résumé et contexte de la campagne.' }}</p>
        </div>
        <div class="sidebar-links">
          <RouterLink :to="`/campaigns/${props.campaignId}`" class="sidebar-link"
            >Univers</RouterLink
          >
          <RouterLink :to="`/campaigns/${props.campaignId}/races`" class="sidebar-link"
            >Races</RouterLink
          >
          <RouterLink :to="`/campaigns/${props.campaignId}/classes`" class="sidebar-link"
            >Classes</RouterLink
          >
        </div>
      </div>

      <div class="sidebar-group tools-group">
        <div class="group-heading">Outils</div>
        <div class="tool-row">
          <span>Lanceur de dés</span>
          <span>Dés d’Aventure</span>
        </div>
      </div>

      <div class="account-box">
        <div>
          <p>{{ user?.displayName ?? 'Invité' }}</p>
          <span>{{ user?.role ?? 'Rôle inconnu' }}</span>
        </div>
        <button class="logout-btn" @click="logout()">Déconnexion</button>
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
  position: sticky;
  top: 0;
  align-self: flex-start;
  width: 320px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  background: linear-gradient(180deg, #16120c 0%, #120e08 100%);
  border-right: 1px solid rgba(212, 168, 67, 0.22);
  box-shadow: 2px 0 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.sidebar-group {
  display: grid;
  gap: 0.9rem;
}

.group-heading {
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #a07820;
}

.persona-card,
.group-card,
.account-box {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 22px;
  background: rgba(20, 16, 10, 0.82);
  border: 1px solid rgba(212, 168, 67, 0.16);
}

.persona-card {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.avatar {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(212, 168, 67, 0.16);
  color: #f0c96a;
  font-weight: 700;
}

.persona-name {
  margin: 0;
  font-size: 1rem;
  color: #f2e6cc;
  font-weight: 700;
}

.persona-desc,
.group-card p,
.account-box span {
  margin: 0;
  font-size: 0.95rem;
  color: #cfc09a;
  line-height: 1.4;
}

.group-card {
  gap: 0.35rem;
}

.group-card strong {
  color: #f2e6cc;
}

.sidebar-links,
.tool-row {
  display: grid;
  gap: 0.55rem;
}

.sidebar-link,
.group-link {
  display: block;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  background: rgba(212, 168, 67, 0.08);
  color: #f2e6cc;
  text-decoration: none;
  transition: background 0.2s ease;
}

.group-link.disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.sidebar-link:hover,
.group-link:hover {
  background: rgba(212, 168, 67, 0.16);
}

.campaign-card {
  padding: 1rem;
}

.tool-row {
  grid-template-columns: 1fr 1fr;
}

.tool-row span,
.group-link,
.sidebar-link {
  font-size: 0.95rem;
}

.account-box {
  margin-top: auto;
}

.account-box p {
  margin: 0;
  color: #f2e6cc;
  font-weight: 700;
}

.account-box span {
  display: block;
  color: #a09070;
}

.logout-btn {
  width: 100%;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(212, 168, 67, 0.1);
  color: #f2e6cc;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.logout-btn:hover {
  transform: translateY(-1px);
  background: rgba(212, 168, 67, 0.18);
}

.content {
  flex: 1;
  padding: 1.75rem;
}

@media (max-width: 900px) {
  .campaign-shell {
    flex-direction: column;
  }

  .sidebar {
    position: relative;
    width: 100%;
    min-height: auto;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid rgba(212, 168, 67, 0.2);
    box-shadow: none;
  }

  .tool-row {
    grid-template-columns: 1fr;
  }
}
</style>
