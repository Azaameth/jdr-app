<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import type { Class } from '../models/types/Class'

const route = useRoute()
const campaignId = computed(() => String(route.params.id ?? ''))
const campaignStore = useCampaignStore()
const cards = ref<Class[]>([])
const loading = ref(true)
const error = ref('')
const currentIndex = ref(0)
const visibleCount = 3

const currentCampaign = computed(() =>
  campaignStore.campaigns.value.find((campaign) => campaign.id === campaignId.value),
)

const campaignTitle = computed(() => currentCampaign.value?.title || 'Campagne')

const emptyMessage = computed(() => {
  if (loading.value) {
    return 'Chargement des classes...'
  }
  return cards.value.length === 0 ? 'Aucune classe Alésia disponible.' : ''
})

const visibleCards = computed(() => {
  const total = cards.value.length
  if (total === 0) return []

  const count = Math.min(visibleCount, total)
  return Array.from(
    { length: count },
    (_, offset) => cards.value[(currentIndex.value + offset) % total],
  ).filter((card): card is Class => Boolean(card))
})

const hasNavigation = computed(() => cards.value.length > visibleCount)

function prevPage() {
  const total = cards.value.length
  if (!hasNavigation.value || total === 0) return
  currentIndex.value = (currentIndex.value - 1 + total) % total
}

function nextPage() {
  const total = cards.value.length
  if (!hasNavigation.value || total === 0) return
  currentIndex.value = (currentIndex.value + 1) % total
}

async function loadClasses() {
  try {
    await campaignStore.fetchCampaigns()
    const campaign = currentCampaign.value

    const tagsToTry = [campaign?.slug, campaignId.value].filter(
      (tag, index, arr): tag is string => Boolean(tag) && arr.indexOf(tag) === index,
    )

    let results: Class[] = []
    for (const tag of tagsToTry) {
      results = await listClassesByCampaign(tag)
      if (results.length > 0) {
        break
      }
    }

    cards.value = results
    currentIndex.value = 0

    if (!campaign && campaignStore.error.value) {
      error.value = campaignStore.error.value
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des classes.'
  } finally {
    loading.value = false
  }
}

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '').replace(/\.png$/i, '.jpg')
  const withImages = clean.startsWith('images/') ? clean : `images/${clean}`
  return `${import.meta.env.BASE_URL}${withImages}`
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  const src = img.src
  if (src.endsWith('.png')) {
    img.src = src.replace(/\.png$/i, '.jpg')
  }
}

onMounted(loadClasses)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="carousel-page">
      <header class="page-header">
        <div>
          <p class="section-label">Classes de campagne</p>
          <h1>{{ campaignTitle }}</h1>
        </div>
      </header>

      <div class="carousel-shell">
        <button
          class="nav-button left"
          :disabled="!hasNavigation"
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
                  <img
                    v-if="card.img"
                    :src="imageUrl(card.img)"
                    :alt="card.n"
                    @error="handleImageError"
                  />
                  <div v-else class="card-image-placeholder">
                    <i class="ti ti-sword"></i>
                  </div>
                </div>
                <div class="card-body">
                  <strong class="card-title">{{ card.n }}</strong>
                  <span class="card-subtitle">{{ card.sub }}</span>
                  <div class="card-meta">
                    <span>PV {{ card.pv }}</span>
                    <span>Mana {{ card.mana }}</span>
                    <span>Arm {{ card.arm }}</span>
                  </div>
                  <div class="detail-group">
                    <h3>Capacités</h3>
                    <ul>
                      <li v-for="(item, index) in card.caps" :key="index">{{ item }}</li>
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </template>
        </div>
        <button
          class="nav-button right"
          :disabled="!hasNavigation"
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
  position: relative;
  width: 100%;
  padding: 0 4rem;
}
.carousel-window {
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
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
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
  z-index: 2;
}
.nav-button.left {
  left: 0.5rem;
}
.nav-button.right {
  right: 0.5rem;
}
.nav-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.card {
  scroll-snap-align: center;
  position: relative;
  min-height: 560px;
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
  background: rgba(212, 168, 67, 0.04);
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: rgba(212, 168, 67, 0.25);
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
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: #f2e6cc;
  font-size: 0.95rem;
}
.card-meta span {
  background: rgba(212, 168, 67, 0.08);
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
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
@media (max-width: 700px) {
  .carousel-row {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }
  .card {
    min-height: 520px;
  }
}

@media (max-width: 560px) {
  .carousel-row {
    grid-template-columns: 1fr;
  }
  .carousel-shell {
    padding: 0 3.25rem;
  }
  .nav-button.left {
    left: 0.25rem;
  }
  .nav-button.right {
    right: 0.25rem;
  }
}
</style>
