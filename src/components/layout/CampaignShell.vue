<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../controllers/useAuthStore'
import { useCampaignStore } from '../../controllers/useCampaignStore'
import { usePlayerStore } from '../../controllers/usePlayerStore'
import { CAMPAIGN_STATUS_LABELS } from '../../models/types/Campaign'

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

const campaignStatusClass = computed(() => {
  if (!campaign.value) return 'status-unknown'
  if (campaign.value.status === 'active') return 'status-active'
  if (campaign.value.status === 'recrutement') return 'status-recruiting'
  if (campaign.value.status === 'terminee') return 'status-ended'
  return 'status-unknown'
})

const campaignStatusLabel = computed(() => {
  if (!campaign.value) return 'Statut inconnu'
  return CAMPAIGN_STATUS_LABELS[campaign.value.status] ?? 'Statut inconnu'
})

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
    <header class="campaign-topbar">
      <div class="campaign-topbar-title-row">
        <p class="campaign-topbar-label">Campagne</p>
        <h1 class="campaign-topbar-title">{{ campaign?.title ?? 'Campagne inconnue' }}</h1>
      </div>
      <span class="campaign-status" :class="campaignStatusClass">
        {{ campaignStatusLabel }}
      </span>
    </header>

    <div class="campaign-body">
      <aside class="sidebar">
        <div class="sidebar-group">
          <div class="group-heading">Joueur</div>
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

        <div class="sidebar-group">
          <div class="group-heading">Campagne</div>
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
            <RouterLink :to="`/campaigns/${props.campaignId}/castes`" class="sidebar-link"
              >Castes</RouterLink
            >
          </div>
        </div>

        <div class="sidebar-group tools-group">
          <div class="group-heading">Outils</div>
          <RouterLink :to="`/campaigns/${props.campaignId}/des`" class="group-link">
            Lanceur de des
          </RouterLink>
          <span class="group-link disabled">Des d'Aventure</span>
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
  </div>
</template>

<style scoped>
.campaign-shell {
  --topbar-height: 86px;
  display: block;
  min-height: 100vh;
  background: #111008;
  color: #f2e6cc;
}

.campaign-body {
  display: flex;
  min-height: calc(100vh - var(--topbar-height));
}

.sidebar {
  position: sticky;
  top: var(--topbar-height);
  align-self: flex-start;
  width: 320px;
  min-height: calc(100vh - var(--topbar-height));
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

.campaign-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgba(212, 168, 67, 0.26);
  background:
    radial-gradient(circle at 10% 0%, rgba(212, 168, 67, 0.2), transparent 42%),
    linear-gradient(135deg, rgba(25, 18, 10, 0.98), rgba(17, 13, 8, 0.98));
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32);
}

.campaign-topbar-title-row {
  display: grid;
  gap: 0.2rem;
}

.campaign-topbar-label {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #a07820;
}

.campaign-topbar-title {
  margin: 0;
  font-size: clamp(1.05rem, 1.6vw, 1.4rem);
  color: #f2e6cc;
}

.campaign-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-recruiting {
  color: #f2d28a;
  background: rgba(212, 168, 67, 0.18);
  border-color: rgba(212, 168, 67, 0.35);
}

.status-active {
  color: #c7f4a0;
  background: rgba(125, 201, 75, 0.16);
  border-color: rgba(125, 201, 75, 0.32);
}

.status-ended {
  color: #f0c3a7;
  background: rgba(186, 116, 74, 0.16);
  border-color: rgba(186, 116, 74, 0.32);
}

.status-unknown {
  color: #d9cbb2;
  background: rgba(217, 203, 178, 0.1);
  border-color: rgba(217, 203, 178, 0.2);
}

@media (max-width: 900px) {
  .campaign-shell {
    --topbar-height: 98px;
  }

  .campaign-body {
    flex-direction: column;
  }

  .sidebar {
    position: relative;
    top: 0;
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

  .campaign-topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
