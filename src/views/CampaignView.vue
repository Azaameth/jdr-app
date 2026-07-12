<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import type { CampaignStatus } from '../models/types/Campaign'

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const authStore = useAuthStore()

const campaignId = computed(() => route.params.id as string)
const user = computed(() => authStore.user.value)
const canEdit = computed(() => user.value?.role === 'mj' || user.value?.role === 'admin')

const campaign = computed(() =>
  campaignStore.campaigns.value.find((item) => item.id === campaignId.value),
)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
})

// --- Edit mode ---
const editing = ref(false)
const saving = ref(false)
const form = reactive({
  title: '',
  summary: '',
  lore: '',
  globalNote: '',
  status: 'recrutement' as CampaignStatus,
})

function startEdit() {
  if (!campaign.value) return
  form.title = campaign.value.title
  form.summary = campaign.value.summary
  form.lore = campaign.value.lore
  form.globalNote = campaign.value.globalNote
  form.status = campaign.value.status
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  saving.value = true
  await campaignStore.editCampaign(campaignId.value, { ...form })
  saving.value = false
  editing.value = false
}

async function confirmDelete() {
  if (!confirm(`Supprimer la campagne "${campaign.value?.title}" ? Cette action est irréversible.`))
    return
  await campaignStore.removeCampaign(campaignId.value)
  router.push({ name: 'campaign-list' })
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  recrutement: 'Recrutement',
  active: 'Active',
  terminee: 'Terminée',
}
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <p v-if="campaignStore.loading.value">Chargement...</p>
      <p v-else-if="!campaign">Campagne introuvable.</p>

      <template v-else-if="!editing">
        <div class="header-row">
          <h1>{{ campaign.title }}</h1>
          <span class="status-badge">{{ STATUS_LABELS[campaign.status] }}</span>
          <div class="actions" v-if="canEdit">
            <button class="btn" @click="startEdit">Modifier</button>
            <button class="btn danger" @click="confirmDelete">Supprimer</button>
          </div>
        </div>

        <section class="card" v-if="campaign.summary">
          <h2>Résumé</h2>
          <p class="body-text">{{ campaign.summary }}</p>
        </section>

        <section class="card" v-if="campaign.lore">
          <h2>Lore</h2>
          <p class="body-text lore">{{ campaign.lore }}</p>
        </section>

        <section class="card" v-if="campaign.globalNote">
          <h2>Note globale</h2>
          <p class="body-text">{{ campaign.globalNote }}</p>
        </section>

        <section class="card meta">
          <div><b>MJ :</b> {{ campaign.gmId || 'Non assigné' }}</div>
          <div><b>Créée le :</b> {{ campaign.createdAt.toDate().toLocaleDateString('fr-FR') }}</div>
        </section>
      </template>

      <!-- Mode édition -->
      <template v-else>
        <div class="header-row">
          <h1>Modifier la campagne</h1>
        </div>

        <section class="card form">
          <label>
            Titre
            <input v-model="form.title" type="text" />
          </label>
          <label>
            Statut
            <select v-model="form.status">
              <option value="recrutement">Recrutement</option>
              <option value="active">Active</option>
              <option value="terminee">Terminée</option>
            </select>
          </label>
          <label>
            Résumé
            <textarea v-model="form.summary" rows="3" />
          </label>
          <label>
            Lore
            <textarea v-model="form.lore" rows="6" />
          </label>
          <label>
            Note globale
            <textarea v-model="form.globalNote" rows="3" />
          </label>
          <div class="form-actions">
            <button class="btn" :disabled="saving" @click="saveEdit">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button class="btn secondary" @click="cancelEdit">Annuler</button>
          </div>
        </section>
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
h1 {
  font-size: 1.5rem;
  color: #f0c96a;
  margin: 0;
}
h2 {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0 0 0.5rem;
}
.status-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  background: rgba(212, 168, 67, 0.15);
  color: #f0c96a;
  border: 1px solid rgba(212, 168, 67, 0.3);
}
.actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
}
.card {
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 1rem 1.25rem;
}
.body-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #d4c49a;
  margin: 0;
}
.lore {
  white-space: pre-wrap;
}
.meta {
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  color: #b8a07a;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #c9a84c;
}
input,
select,
textarea {
  background: #120d05;
  border: 1px solid #5c4a2a;
  border-radius: 4px;
  color: #f2e6cc;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.btn {
  padding: 0.45rem 1rem;
  border-radius: 6px;
  border: 1px solid rgba(212, 168, 67, 0.3);
  background: rgba(212, 168, 67, 0.12);
  color: #f0c96a;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn.secondary {
  background: transparent;
  color: #b8a07a;
  border-color: #5c4a2a;
}
.btn.danger {
  border-color: rgba(192, 57, 43, 0.5);
  color: #ffb0b0;
  background: rgba(192, 57, 43, 0.1);
}
</style>
