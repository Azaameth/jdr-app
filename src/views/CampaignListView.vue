<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { CAMPAIGN_STATUS_LABELS } from '../models/types/Campaign'

const router = useRouter()
const authStore = useAuthStore()
const campaignStore = useCampaignStore()

const user = computed(() => authStore.user.value)
const canManageCampaigns = computed(() => authStore.isMj.value || authStore.isAdmin.value)
const campaigns = computed(() => campaignStore.campaigns.value)
const loading = computed(() => campaignStore.loading.value)
const error = computed(() => campaignStore.error.value)
const authReady = computed(() => authStore.authReady.value)
const showLoginPopup = computed(() => authReady.value && !user.value)
const campaignCount = computed(() => campaigns.value.length)
const recruitingCount = computed(
  () => campaigns.value.filter((campaign) => campaign.status === 'recrutement').length,
)
const activeCount = computed(
  () => campaigns.value.filter((campaign) => campaign.status === 'active').length,
)
const endedCount = computed(
  () => campaigns.value.filter((campaign) => campaign.status === 'terminee').length,
)

const hasCampaigns = computed(() => campaigns.value.length > 0)

watch(
  () => user.value?.uid,
  async (uid) => {
    if (!uid) return
    await campaignStore.fetchCampaigns()
  },
  { immediate: true },
)

function signIn() {
  authStore.signInWithGoogle()
}

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
  if (canManageCampaigns.value && user.value) {
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
    <div class="page-backdrop" aria-hidden="true"></div>

    <section class="hero">
      <div>
        <p class="eyebrow">La Tour des Sorciers</p>
        <h1>Mes campagnes</h1>
        <p class="hero-text">
          Retrouvez vos tables, ouvrez une campagne ou créez la prochaine aventure à lancer.
        </p>
      </div>

      <div class="hero-stats" aria-label="Résumé des campagnes">
        <div class="stat-card">
          <span class="stat-value">{{ campaignCount }}</span>
          <span class="stat-label">campagnes</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ recruitingCount }}</span>
          <span class="stat-label">en recrutement</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ activeCount }}</span>
          <span class="stat-label">actives</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ endedCount }}</span>
          <span class="stat-label">terminées</span>
        </div>
      </div>
    </section>

    <p v-if="loading" class="inline-state">Chargement des campagnes...</p>
    <p v-if="error" class="error inline-state">{{ error }}</p>

    <section v-if="hasCampaigns" class="campaign-grid" :class="{ managing: canManageCampaigns }">
      <article
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="campaign-card"
        @click="openCampaign(campaign.id)"
      >
        <div class="card-topline">
          <span class="status">{{ CAMPAIGN_STATUS_LABELS[campaign.status] }}</span>
          <span v-if="campaign.gmId && campaign.gmId === user?.uid" class="badge">Votre MJ</span>
          <span v-else-if="!campaign.gmId" class="badge muted">MJ libre</span>
        </div>

        <div class="card-body">
          <h2>{{ campaign.title }}</h2>
          <p>{{ campaign.summary }}</p>
        </div>

        <div class="card-footer">
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
        </div>
      </article>

      <article v-if="canManageCampaigns" class="campaign-card add-card" @click="addCampaign()">
        <div class="add-content">
          <span class="plus">+</span>
          <div>
            <p class="add-label">Nouveau dossier</p>
            <h2>Nouvelle campagne</h2>
            <p>Créer une campagne et la faire apparaître sur l’accueil.</p>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="empty-state">
      <h2>Aucune campagne pour le moment</h2>
      <p>
        Lancez la première table pour installer le portail, ou connectez-vous avec un compte MJ.
      </p>
      <button v-if="canManageCampaigns" class="action-btn empty-action" @click="addCampaign()">
        Créer une campagne
      </button>
    </section>

    <div v-if="showLoginPopup" class="login-overlay" role="dialog" aria-modal="true">
      <section class="login-panel">
        <h2>Connexion requise</h2>
        <p>Connectez-vous pour accéder au portail des campagnes.</p>
        <button @click="signIn" :disabled="authStore.loading.value">
          {{ authStore.loading.value ? 'Connexion...' : 'Se connecter avec Google' }}
        </button>
        <p v-if="authStore.error.value" class="error">{{ authStore.error.value }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.campaign-list {
  position: relative;
  min-height: 100vh;
  padding: 2rem clamp(1rem, 2.5vw, 2.5rem) 3rem;
  overflow: hidden;
  color: #f2e6cc;
  background:
    radial-gradient(circle at top left, rgba(212, 168, 67, 0.16), transparent 32%),
    radial-gradient(circle at top right, rgba(117, 138, 94, 0.12), transparent 28%),
    linear-gradient(180deg, #0f0d09 0%, #120f0a 45%, #0d0b08 100%);
}

.page-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 15% 20%, rgba(240, 201, 106, 0.07), transparent 18%),
    radial-gradient(circle at 82% 15%, rgba(212, 168, 67, 0.08), transparent 16%),
    radial-gradient(circle at 70% 76%, rgba(192, 57, 43, 0.07), transparent 14%);
  filter: blur(6px);
}

.hero,
.inline-state,
.campaign-grid,
.empty-state {
  position: relative;
  z-index: 1;
}

.hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border: 1px solid rgba(212, 168, 67, 0.16);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(22, 18, 12, 0.95), rgba(17, 14, 9, 0.88));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
}

.eyebrow {
  margin-bottom: 0.35rem;
  color: #f0c96a;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.77rem;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.1rem, 4vw, 3.6rem);
  line-height: 1;
}

.hero-text {
  max-width: 60ch;
  margin-top: 0.8rem;
  color: #d2c39b;
  font-size: 1.02rem;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 0.75rem;
  min-width: min(420px, 100%);
}

.stat-card {
  padding: 0.9rem 1rem;
  border-radius: 20px;
  background: rgba(212, 168, 67, 0.08);
  border: 1px solid rgba(212, 168, 67, 0.15);
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f0c96a;
}

.stat-label {
  display: block;
  color: #d2c39b;
  font-size: 0.92rem;
}

.inline-state {
  margin: 0 0 1rem;
  color: #d2c39b;
}

.campaign-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.campaign-grid.managing {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.campaign-card {
  min-height: 250px;
  padding: 1.1rem;
  border: 1px solid rgba(212, 168, 67, 0.16);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(25, 20, 13, 0.96), rgba(17, 14, 9, 0.98));
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.campaign-card:hover {
  transform: translateY(-3px);
  border-color: rgba(240, 201, 106, 0.35);
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.32);
}

.card-topline,
.card-footer {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.card-body {
  display: grid;
  gap: 0.55rem;
  margin-top: auto;
}

.card-body h2,
.add-content h2,
.empty-state h2 {
  margin: 0;
  color: #f7edd5;
}

.card-body p,
.add-content p,
.empty-state p {
  color: #d2c39b;
  line-height: 1.55;
}

.badge {
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  background: rgba(117, 138, 94, 0.18);
  color: #dff0bd;
  font-size: 0.8rem;
}

.badge.muted {
  background: rgba(212, 168, 67, 0.08);
  color: #f0c96a;
}

.action-btn {
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(212, 168, 67, 0.12);
  color: #f2e6cc;
  cursor: pointer;
  font-weight: 600;
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

.action-btn:hover {
  border-color: rgba(240, 201, 106, 0.35);
  background: rgba(212, 168, 67, 0.18);
}

.add-card {
  border-style: dashed;
  background: linear-gradient(180deg, rgba(212, 168, 67, 0.08), rgba(17, 14, 9, 0.96));
  justify-content: center;
}

.add-content {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.add-label {
  margin-bottom: 0.25rem;
  color: #f0c96a !important;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.76rem;
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

.empty-state {
  display: grid;
  gap: 0.75rem;
  place-items: start;
  padding: 2rem 1.5rem;
  border: 1px solid rgba(212, 168, 67, 0.16);
  border-radius: 24px;
  background: rgba(22, 18, 12, 0.78);
}

.empty-action {
  margin-top: 0.5rem;
}

.error {
  color: #ffb0b0;
}

.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(7, 5, 2, 0.66);
  backdrop-filter: blur(2px);
}

.login-panel {
  width: min(440px, 92vw);
  padding: 2rem;
  border-radius: 16px;
  background: rgba(22, 18, 12, 0.98);
  border: 1px solid rgba(212, 168, 67, 0.2);
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.38);
}

.login-panel h2 {
  margin-top: 0;
}

.login-panel button {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #a07820, #d4a843);
  color: #111008;
  cursor: pointer;
  font-weight: 700;
}

.login-panel button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-stats {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .campaign-list {
    padding: 1rem 0.75rem 2rem;
  }

  .hero {
    padding: 1.2rem;
    border-radius: 22px;
  }

  .hero-stats {
    grid-template-columns: 1fr 1fr;
  }

  .campaign-card {
    min-height: 0;
  }

  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
