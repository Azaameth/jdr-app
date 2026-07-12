<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'

const router = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()

const user = computed(() => authStore.user.value)
const userRole = computed(() => user.value?.role ?? null)
const canManageCampaigns = computed(() => userRole.value === 'mj' || userRole.value === 'admin')
const campaigns = computed(() => campaignStore.campaigns.value)
const loading = computed(() => campaignStore.loading.value)
const error = computed(() => campaignStore.error.value)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
})

function openCampaign(id: string) {
  router.push(`/campaigns/${id}`)
}

async function addCampaign() {
  await campaignStore.addCampaign({
    title: 'Nouvelle campagne',
    lore: '',
    summary: 'À compléter',
    globalNote: '',
    gmId: '',
    status: 'recrutement',
  })
}

async function enrollMj(campaignId: string) {
  if (user.value?.role === 'mj' || user.value?.role === 'admin') {
    await campaignStore.enrollMj(campaignId, user.value.uid)
  }
}

async function withdrawMj(campaignId: string) {
  await campaignStore.withdrawMj(campaignId)
}

async function removeCampaign(campaignId: string, title: string) {
  if (!confirm(`Supprimer la campagne "${title}" ?`)) return
  await campaignStore.removeCampaign(campaignId)
}
</script>

<template>
  <main class="campaign-list">
    <h1>Mes campagnes</h1>
    <p v-if="loading">Chargement des campagnes...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="row">
      <article
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="campaign-card"
        @click="openCampaign(campaign.id)"
      >
        <h2>{{ campaign.title }}</h2>
        <p>{{ campaign.summary }}</p>
        <span class="status">{{ campaign.status }}</span>

        <button
          v-if="campaign.gmId && campaign.gmId === user?.uid"
          class="action-btn warning"
          @click.stop="withdrawMj(campaign.id)"
        >
          Retirer le MJ
        </button>

        <button
          v-else-if="!campaign.gmId && canManageCampaigns"
          class="action-btn"
          @click.stop="enrollMj(campaign.id)"
        >
          S’inscrire comme MJ
        </button>
        <button
          v-if="canManageCampaigns"
          class="action-btn danger"
          @click.stop="removeCampaign(campaign.id, campaign.title)"
        >
          Supprimer
        </button>
      </article>
      <article v-if="canManageCampaigns" class="campaign-card add-card" @click="addCampaign()">
        <div class="add-content">
          <span class="plus">+</span>
          <div>
            <h2>Nouvelle campagne</h2>
            <p>Créer une campagne</p>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.campaign-list {
  color: #f2e6cc;
}

.row {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.campaign-card {
  min-width: 260px;
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 14px;
  padding: 1rem;
  background: rgba(22, 18, 12, 0.95);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-btn {
  margin-top: auto;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(212, 168, 67, 0.1);
  color: #f2e6cc;
  cursor: pointer;
}

.action-btn.warning {
  border-color: rgba(192, 57, 43, 0.4);
  color: #ffb0b0;
}

.action-btn.danger {
  border-color: rgba(192, 57, 43, 0.5);
  color: #ffb0b0;
  background: rgba(192, 57, 43, 0.08);
}

.add-card {
  border-style: dashed;
  background: rgba(212, 168, 67, 0.06);
  justify-content: center;
}

.add-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.plus {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(212, 168, 67, 0.2);
  color: #f0c96a;
  font-size: 1.6rem;
  font-weight: 700;
}

.status {
  display: inline-block;
  width: fit-content;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: rgba(212, 168, 67, 0.12);
  color: #f0c96a;
}

.error {
  color: #ffb0b0;
}
</style>
