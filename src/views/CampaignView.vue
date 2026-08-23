<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { useCampaignRulesStore } from '../controllers/useCampaignRulesStore'
import { DEFAULT_CAMPAIGN_RULES } from '../models/repositories/CampaignRulesRepository'
import type {
  CampaignRulesDocument,
  DiceRoundingMode,
  DiceSuccessDirection,
} from '../models/types/RpgDataModel'
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '../models/types/Campaign'

const ROUNDING_MODE_LABELS: Record<DiceRoundingMode, string> = {
  RoundNearest: 'Au plus proche',
  RoundDown: 'Vers le bas',
  RoundUp: 'Vers le haut',
}

const SUCCESS_DIRECTION_LABELS: Record<DiceSuccessDirection, string> = {
  AboveOrEqual: 'Réussite si ≥ cible',
  BelowOrEqual: 'Réussite si ≤ cible',
}

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const authStore = useAuthStore()
const rulesStore = useCampaignRulesStore()

const campaignId = computed(() => route.params.id as string)
const canEdit = computed(() => authStore.isMj.value || authStore.isAdmin.value)

const campaign = computed(() =>
  campaignStore.campaigns.value.find((item) => item.id === campaignId.value),
)
const campaignRules = computed(() => rulesStore.rules.value)
const primaryStats = computed(() => campaignRules.value?.Statistics.Primary ?? [])

async function loadCampaignData() {
  await campaignStore.fetchCampaigns()

  if (campaignId.value) {
    await rulesStore.fetchCampaignRules(campaignId.value)
  }
}

onMounted(async () => {
  await loadCampaignData()
})

watch(
  () => campaignId.value,
  async (nextId) => {
    if (!nextId) return
    await rulesStore.fetchCampaignRules(nextId)
  },
)

// --- Edit mode ---
const editing = ref(false)
const saving = ref(false)
const form = reactive({
  DisplayName: '',
  Description: '',
  Lore: '',
  GlobalNote: '',
  Status: 'Recruiting' as CampaignStatus,
})

const rulesForm = reactive({
  CurrencyName: '',
  AdvantageDiceCount: 0,
  DisadvantageDiceCount: 0,
  MaxItems: 0,
  MaxArmorSlots: 0,
  MaxWeaponSlots: 0,
  DiceNotation: '',
  RoundingMode: 'RoundNearest' as DiceRoundingMode,
  SuccessDirection: 'AboveOrEqual' as DiceSuccessDirection,
  CriticalThreshold: 0,
})

const diceNotationValid = computed(() => /^d\d+$/.test(rulesForm.DiceNotation))

function startEdit() {
  if (!campaign.value) return
  form.DisplayName = campaign.value.DisplayName
  form.Description = campaign.value.Description
  form.Lore = campaign.value.Lore
  form.GlobalNote = campaign.value.GlobalNote
  form.Status = campaign.value.Status

  const currentRules = campaignRules.value ?? DEFAULT_CAMPAIGN_RULES
  rulesForm.CurrencyName = currentRules.CurrencyName
  rulesForm.AdvantageDiceCount = currentRules.AdvantageDiceCount
  rulesForm.DisadvantageDiceCount = currentRules.DisadvantageDiceCount
  rulesForm.MaxItems = currentRules.MaxItems
  rulesForm.MaxArmorSlots = currentRules.MaxArmorSlots
  rulesForm.MaxWeaponSlots = currentRules.MaxWeaponSlots
  rulesForm.DiceNotation = currentRules.Dice.DiceNotation
  rulesForm.RoundingMode = currentRules.Dice.RoundingMode
  rulesForm.SuccessDirection = currentRules.Dice.SuccessDirection
  rulesForm.CriticalThreshold = currentRules.Dice.CriticalThreshold

  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!diceNotationValid.value) return

  saving.value = true
  const rulesPatch: Partial<CampaignRulesDocument> = {
    CurrencyName: rulesForm.CurrencyName,
    AdvantageDiceCount: rulesForm.AdvantageDiceCount,
    DisadvantageDiceCount: rulesForm.DisadvantageDiceCount,
    MaxItems: rulesForm.MaxItems,
    MaxArmorSlots: rulesForm.MaxArmorSlots,
    MaxWeaponSlots: rulesForm.MaxWeaponSlots,
    Dice: {
      DiceNotation: rulesForm.DiceNotation,
      RoundingMode: rulesForm.RoundingMode,
      SuccessDirection: rulesForm.SuccessDirection,
      CriticalThreshold: rulesForm.CriticalThreshold,
    },
  }

  await Promise.all([
    campaignStore.editCampaign(campaignId.value, { ...form }),
    rulesStore.updateCampaignRules(campaignId.value, rulesPatch),
  ])
  saving.value = false
  editing.value = false
}

async function confirmDelete() {
  if (
    !confirm(
      `Supprimer la campagne "${campaign.value?.DisplayName}" ? Cette action est irréversible.`,
    )
  )
    return
  await campaignStore.removeCampaign(campaignId.value)
  router.push({ name: 'campaign-list' })
}

</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <p v-if="campaignStore.loading.value">Chargement...</p>
      <p v-else-if="!campaign">Campagne introuvable.</p>

      <template v-else-if="!editing">
        <div class="header-row">
          <h1>{{ campaign.DisplayName }}</h1>
          <span class="status-badge">{{ CAMPAIGN_STATUS_LABELS[campaign.Status] }}</span>
          <div class="actions" v-if="canEdit">
            <button class="btn" @click="startEdit">Modifier</button>
            <button class="btn danger" @click="confirmDelete">Supprimer</button>
          </div>
        </div>

        <section class="card" v-if="campaign.Description">
          <h2>Résumé</h2>
          <p class="body-text">{{ campaign.Description }}</p>
        </section>

        <section class="card" v-if="campaign.Lore">
          <h2>Lore</h2>
          <p class="body-text lore">{{ campaign.Lore }}</p>
        </section>

        <section class="card" v-if="campaign.GlobalNote">
          <h2>Note globale</h2>
          <p class="body-text">{{ campaign.GlobalNote }}</p>
        </section>

        <section class="card rules-card" v-if="campaignRules">
          <h2>Règles de campagne</h2>
          <div class="rules-grid">
            <div>
              <b>Dé :</b> {{ campaignRules.Dice.DiceNotation }}
              ({{ SUCCESS_DIRECTION_LABELS[campaignRules.Dice.SuccessDirection] }},
              critique ±{{ campaignRules.Dice.CriticalThreshold }},
              arrondi {{ ROUNDING_MODE_LABELS[campaignRules.Dice.RoundingMode] }})
            </div>
            <div><b>Devise :</b> {{ campaignRules.CurrencyName }}</div>
            <div><b>Stats :</b> {{ primaryStats.length }}</div>
            <div>
              <b>Bonus / Malus :</b> {{ campaignRules.AdvantageDiceCount }} / {{ campaignRules.DisadvantageDiceCount }}
            </div>
            <div>
              <b>Inventaire :</b> {{ campaignRules.MaxWeaponSlots }} armes / {{ campaignRules.MaxArmorSlots }} armures / {{ campaignRules.MaxItems }} objets
            </div>
          </div>
          <ul v-if="primaryStats.length" class="stats-list">
            <li v-for="stat in primaryStats" :key="stat.Key">{{ stat.Label }}</li>
          </ul>
        </section>

        <section class="card meta">
          <div><b>MJ :</b> {{ campaign.GmId || 'Non assigné' }}</div>
          <div><b>Créée le :</b> {{ campaign.CreatedAt.toDate().toLocaleDateString('fr-FR') }}</div>
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
            <input v-model="form.DisplayName" type="text" />
          </label>
          <label>
            Statut
            <select v-model="form.Status">
              <option value="Recruiting">Recrutement</option>
              <option value="Active">Active</option>
              <option value="Closed">Terminée</option>
            </select>
          </label>
          <label>
            Résumé
            <textarea v-model="form.Description" rows="3" />
          </label>
          <label>
            Lore
            <textarea v-model="form.Lore" rows="6" />
          </label>
          <label>
            Note globale
            <textarea v-model="form.GlobalNote" rows="3" />
          </label>
        </section>

        <section class="card form">
          <h2>Règles de campagne</h2>
          <label>
            Devise
            <input v-model="rulesForm.CurrencyName" type="text" />
          </label>
          <label>
            Dé (ex. d20)
            <input v-model="rulesForm.DiceNotation" type="text" :class="{ invalid: !diceNotationValid }" />
          </label>
          <label>
            Arrondi
            <select v-model="rulesForm.RoundingMode">
              <option v-for="(label, mode) in ROUNDING_MODE_LABELS" :key="mode" :value="mode">
                {{ label }}
              </option>
            </select>
          </label>
          <label>
            Sens de réussite
            <select v-model="rulesForm.SuccessDirection">
              <option v-for="(label, direction) in SUCCESS_DIRECTION_LABELS" :key="direction" :value="direction">
                {{ label }}
              </option>
            </select>
          </label>
          <label>
            Seuil critique
            <input v-model.number="rulesForm.CriticalThreshold" type="number" min="0" />
          </label>
          <label>
            Dés de bonus (avantage)
            <input v-model.number="rulesForm.AdvantageDiceCount" type="number" min="0" />
          </label>
          <label>
            Dés de malus (désavantage)
            <input v-model.number="rulesForm.DisadvantageDiceCount" type="number" min="0" />
          </label>
          <label>
            Max. objets
            <input v-model.number="rulesForm.MaxItems" type="number" min="0" />
          </label>
          <label>
            Max. armures
            <input v-model.number="rulesForm.MaxArmorSlots" type="number" min="0" />
          </label>
          <label>
            Max. armes
            <input v-model.number="rulesForm.MaxWeaponSlots" type="number" min="0" />
          </label>

          <div class="form-actions">
            <button class="btn" :disabled="saving || !diceNotationValid" @click="saveEdit">
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
.rules-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  font-size: 0.9rem;
  color: #d4c49a;
}
.stats-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1rem;
  color: #f0c96a;
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
input.invalid {
  border-color: rgba(192, 57, 43, 0.7);
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
