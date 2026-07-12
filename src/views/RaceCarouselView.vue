<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import type { Race } from '../models/types/Race'

const route = useRoute()
const campaignId = computed(() => String(route.params.id ?? ''))
const cards = ref<Race[]>([])
const loading = ref(true)
const error = ref('')
const currentIndex = ref(0)
const visibleCount = 3

const emptyMessage = computed(() => {
  if (loading.value) {
    return 'Chargement des races...'
  }
  return cards.value.length === 0 ? 'Aucune race disponible pour cette campagne.' : ''
})

const visibleCards = computed(() => {
  return cards.value.slice(currentIndex.value, currentIndex.value + visibleCount)
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value + visibleCount < cards.value.length)

function prevPage() {
  if (hasPrev.value) {
    currentIndex.value = Math.max(0, currentIndex.value - 1)
  }
}

function nextPage() {
  if (hasNext.value) {
    currentIndex.value = Math.min(cards.value.length - visibleCount, currentIndex.value + 1)
  }
}

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/images/${path}`
  return normalized.replace(/\.png$/i, '.jpg')
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  const src = img.src
  if (src.endsWith('.png')) {
    img.src = src.replace(/\.png$/i, '.jpg')
  }
}

async function loadRaces() {
  try {
    cards.value = await listRacesByCampaign(campaignId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des races.'
  } finally {
    loading.value = false
  }
}

onMounted(loadRaces)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="carousel-page">
      <header class="page-header">
        <div>
          <p class="section-label">Races de campagne</p>
          <h1>Races d'Alésia</h1>
        </div>
      </header>

      <div class="carousel-shell">
        <button
          class="nav-button left"
          :disabled="!hasPrev"
          @click="prevPage"
          aria-label="Précédent"
        >
          ‹
        </button>
        <div class="carousel-window">
          <template v-if="error">
            <div class="empty-state error">{{ error }}</div>
          </template>
          <template v-else-if="emptyMessage">
            <div class="empty-state">{{ emptyMessage }}</div>
          </template>
          <template v-else>
            <div class="carousel-row">
              <article v-for="card in visibleCards" :key="card.id" class="card">
                <div class="card-image">
                  <img :src="imageUrl(card.img)" :alt="card.n" @error="handleImageError" />
                </div>
                <div class="card-body">
                  <strong class="card-title">{{ card.n }}</strong>
                  <span class="card-subtitle">{{ card.sub }}</span>
                  <div class="card-details">
                    <div class="detail-group">
                      <h3>Points forts</h3>
                      <ul>
                        <li v-for="(item, index) in card.bon" :key="index">{{ item }}</li>
                      </ul>
                    </div>
                    <div class="detail-group">
                      <h3>Points faibles</h3>
                      <ul>
                        <li v-for="(item, index) in card.mal" :key="index">{{ item }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </template>
        </div>
        <button
          class="nav-button right"
          :disabled="!hasNext"
          @click="nextPage"
          aria-label="Suivant"
        >
          ›
        </button>
      </div>
    </main>
  </CampaignShell>
</template>

<style scoped>
.carousel-page {
  padding: 1.5rem 0;
  color: #f2e6cc;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
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
.carousel-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
}
.carousel-window {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
}
.carousel-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 1.25rem;
  width: min(1080px, 100%);
}
.nav-button {
  position: relative;
  top: auto;
  transform: none;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.2);
  background: rgba(17, 13, 7, 0.86);
  color: #f2e6cc;
  font-size: 1.75rem;
  cursor: pointer;
}
.nav-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.card {
  scroll-snap-align: center;
  position: relative;
  min-height: 540px;
  width: 100%;
  max-width: 360px;
  display: grid;
  grid-template-rows: 360px 1fr;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(22, 18, 12, 0.92);
  border: 1px solid rgba(212, 168, 67, 0.14);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
}
.card-image {
  position: relative;
  min-height: 100%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.35));
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem;
}
.card-title {
  font-size: 1.55rem;
  display: block;
  color: #f2e6cc;
}
.card-subtitle {
  color: #cfc09a;
  font-size: 0.95rem;
}
.card-details {
  display: grid;
  gap: 1rem;
}
.detail-group h3 {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #bfa166;
}
.detail-group ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
}
.detail-group li {
  font-size: 0.95rem;
  color: #e2d5b0;
  line-height: 1.4;
}
.empty-state {
  min-height: 260px;
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
@media (max-width: 980px) {
  .carousel-row {
    grid-template-columns: repeat(3, minmax(240px, 1fr));
  }
}
@media (max-width: 760px) {
  .carousel-row {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }
}
@media (max-width: 560px) {
  .carousel-row {
    grid-template-columns: 1fr;
  }
  .carousel-shell {
    flex-direction: column;
  }
  .nav-button {
    width: 48px;
    height: 48px;
  }
}
</style>
