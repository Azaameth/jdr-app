<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { listFactions } from '../models/repositories/FactionRepository'
import type { Faction } from '../models/types/Faction'

const route = useRoute()
const campaignId = computed(() => String(route.params.id ?? ''))

const factions = ref<Faction[]>([])
const loading = ref(true)
const error = ref('')
const activeIndex = ref(0)

const emptyMessage = computed(() => {
  if (loading.value) {
    return 'Chargement des factions...'
  }
  return factions.value.length === 0 ? 'Aucune faction disponible.' : ''
})

const activeFaction = computed(() => factions.value[activeIndex.value] ?? null)

async function loadFactions() {
  try {
    factions.value = await listFactions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des factions.'
  } finally {
    loading.value = false
  }
}

onMounted(loadFactions)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="castes-page">
      <header class="page-header">
        <p class="section-label">Castes & Factions</p>
        <h1>Castes & Factions du monde</h1>
      </header>

      <template v-if="error">
        <div class="empty-state error">{{ error }}</div>
      </template>
      <template v-else-if="emptyMessage">
        <div class="empty-state">{{ emptyMessage }}</div>
      </template>
      <template v-else-if="activeFaction">
        <div class="tabs" role="tablist">
          <button
            v-for="(faction, index) in factions"
            :key="faction.id"
            type="button"
            role="tab"
            class="tab"
            :class="{ active: index === activeIndex }"
            :aria-selected="index === activeIndex"
            @click="activeIndex = index"
          >
            <span class="tab-icon">{{ faction.icon }}</span>
            <span class="tab-label">{{ faction.title }}</span>
          </button>
        </div>

        <section class="fiche" :style="{ '--fiche-accent': activeFaction.accent }">
          <div class="fiche-header">
            <div class="fiche-stamp">{{ activeFaction.icon }}</div>
            <div>
              <div class="fiche-title">{{ activeFaction.title }}</div>
              <div class="fiche-sub">{{ activeFaction.subtitle }}</div>
            </div>
            <span class="badge">{{ activeFaction.badge }}</span>
          </div>
          <p class="fiche-text">{{ activeFaction.description }}</p>
          <div class="fiche-grid">
            <div v-for="fact in activeFaction.facts" :key="fact.label" class="fiche-cell">
              <div class="fiche-cell-label">{{ fact.label }}</div>
              <div class="fiche-cell-val">{{ fact.value }}</div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
.castes-page {
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
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}
.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(212, 168, 67, 0.16);
  background: rgba(20, 16, 10, 0.82);
  color: #cfc09a;
  cursor: pointer;
  font-size: 0.9rem;
}
.tab.active {
  border-color: rgba(212, 168, 67, 0.5);
  background: rgba(212, 168, 67, 0.12);
  color: #f2e6cc;
}
.tab-icon {
  font-size: 1.05rem;
}
.fiche {
  border-radius: 22px;
  padding: 1.5rem;
  background: rgba(22, 18, 12, 0.92);
  border: 1px solid rgba(212, 168, 67, 0.14);
}
.fiche-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.fiche-stamp {
  width: 52px;
  height: 52px;
  min-width: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  font-size: 1.5rem;
  background: color-mix(in srgb, var(--fiche-accent) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--fiche-accent) 45%, transparent);
}
.fiche-title {
  font-size: 1.4rem;
  color: #f2e6cc;
}
.fiche-sub {
  color: #cfc09a;
  font-size: 0.9rem;
}
.badge {
  margin-left: auto;
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.3);
  color: #f0c96a;
  white-space: nowrap;
}
.fiche-text {
  color: #e2d5b0;
  line-height: 1.6;
  margin: 0 0 1.25rem;
}
.fiche-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.5rem;
}
.fiche-cell-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a07820;
  margin-bottom: 0.2rem;
}
.fiche-cell-val {
  color: #f2e6cc;
  font-size: 0.95rem;
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
@media (max-width: 560px) {
  .fiche-grid {
    grid-template-columns: 1fr;
  }
}
</style>
