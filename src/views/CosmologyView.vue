<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import CosmologyTierCard from '../components/CosmologyTierCard.vue'
import { listCosmologyTiers } from '../models/repositories/CosmologyRepository'
import type { CosmologyTier } from '../models/types/Cosmology'

const route = useRoute()
const campaignId = computed(() => String(route.params.id ?? ''))

const tiers = ref<CosmologyTier[]>([])
const loading = ref(true)
const error = ref('')
const openTiers = reactive<Record<string, boolean>>({})

const emptyMessage = computed(() => {
  if (loading.value) {
    return 'Chargement de la cosmologie...'
  }
  return tiers.value.length === 0 ? 'Aucune donnée de cosmologie disponible.' : ''
})

const branchTiers = computed(() => tiers.value.filter((tier) => tier.branch))

function toggleTier(id: string) {
  openTiers[id] = !openTiers[id]
}

async function loadCosmology() {
  try {
    tiers.value = await listCosmologyTiers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de la cosmologie.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCosmology)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="cosmology-page">
      <header class="page-header">
        <p class="section-label">Cosmologie</p>
        <h1>Hiérarchie Cosmique d'Alésia</h1>
      </header>

      <template v-if="error">
        <div class="empty-state error">{{ error }}</div>
      </template>
      <template v-else-if="emptyMessage">
        <div class="empty-state">{{ emptyMessage }}</div>
      </template>
      <template v-else>
        <div class="cosmology-tree">
          <div v-if="tiers[0]" class="tier-slot">
            <CosmologyTierCard
              :tier="tiers[0]"
              :open="!!openTiers[tiers[0].id]"
              @toggle="toggleTier(tiers[0].id)"
            />
          </div>

          <div class="connector"></div>

          <div v-if="tiers[1]" class="tier-slot">
            <CosmologyTierCard
              :tier="tiers[1]"
              :open="!!openTiers[tiers[1].id]"
              @toggle="toggleTier(tiers[1].id)"
            />
          </div>

          <div class="connector"></div>

          <div class="branch-row">
            <div class="branch-bar" aria-hidden="true"></div>
            <div v-for="tier in branchTiers" :key="tier.id" class="branch-slot">
              <CosmologyTierCard
                :tier="tier"
                :open="!!openTiers[tier.id]"
                @toggle="toggleTier(tier.id)"
              />
            </div>
          </div>
        </div>

        <div class="legend-row">
          <div v-for="tier in tiers" :key="tier.id" class="legend-item">
            <span class="swatch" :class="`tier-${tier.id}`"></span>
            {{ tier.legendLabel }}
          </div>
        </div>
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
.cosmology-page {
  padding: 1.5rem 0;
  color: #f2e6cc;
}
.page-header {
  margin-bottom: 1.5rem;
}
.section-label {
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #a07820;
  margin-bottom: 0.45rem;
}
h1 {
  margin: 0;
  font-size: clamp(2rem, 2.5vw, 3rem);
}
.empty-state {
  min-height: 200px;
  color: #cfc09a;
  display: grid;
  place-items: center;
  padding: 2rem;
  border-radius: 22px;
  background: rgba(20, 16, 10, 0.82);
  border: 1px solid rgba(212, 168, 67, 0.16);
}
.error {
  color: #f09990;
}

.cosmology-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  padding: 1.25rem 0;
}

.tier-slot {
  display: flex;
  justify-content: center;
}

.connector {
  width: 2px;
  height: 30px;
  flex-shrink: 0;
  background: rgba(180, 140, 60, 0.35);
}

.branch-row {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  width: 100%;
  padding-top: 1px;
}

.branch-bar {
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: rgba(180, 140, 60, 0.35);
}

.branch-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.legend-row {
  display: flex;
  gap: 0.9rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #a09070;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.swatch.tier-deique {
  background: linear-gradient(135deg, #8b6914, #c9a84c);
}
.swatch.tier-legendaire {
  background: linear-gradient(135deg, #4a2060, #7b3fa0);
}
.swatch.tier-effroyable {
  background: linear-gradient(135deg, #5c1a1a, #8b2020);
}
.swatch.tier-rare {
  background: linear-gradient(135deg, #1a4a30, #1d6b5a);
}
.swatch.tier-commune {
  background: linear-gradient(135deg, #2a2a3a, #3a3a5a);
}

@media (max-width: 860px) {
  .branch-row {
    flex-direction: column;
    align-items: center;
  }
  .branch-bar {
    display: none;
  }
  .branch-slot {
    margin-top: 1.5rem;
  }
}
</style>
