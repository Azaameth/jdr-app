<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => String(route.params.id ?? ''))
const campaignStore = useCampaignStore()
const players = computed(() => playerRows.value)
const loadingPlayers = computed(() => loadingPlayersState.value)
const playersError = computed(() => playersErrorState.value)

const playerRows = ref<Array<{ uid: string; name: string }>>([])
const loadingPlayersState = ref(false)
const playersErrorState = ref('')

onMounted(async () => {
  await campaignStore.fetchCampaigns()
  await loadPlayers()
})

const campaign = computed(() =>
  campaignStore.campaigns.value.find((c) => c.id === campaignId.value),
)

async function loadPlayers() {
  loadingPlayersState.value = true
  playersErrorState.value = ''

  try {
    const characters = await listCharactersByCampaign(campaignId.value)
    playerRows.value = characters.map((character) => ({
      uid: character.ownerUid,
      name: character.name,
    }))
  } catch (err) {
    playersErrorState.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement des participants.'
  } finally {
    loadingPlayersState.value = false
  }
}

function openPlayer(uid: string) {
  router.push(`/campaigns/${campaignId.value}/players/${uid}`)
}
</script>

<template>
  <main>
    <h1>Participants — {{ campaign?.title ?? 'Campagne' }}</h1>
    <p v-if="loadingPlayers">Chargement des participants...</p>
    <p v-else-if="playersError" class="error">{{ playersError }}</p>
    <p v-else-if="players.length === 0">Aucun participant pour cette campagne.</p>
    <ul>
      <li v-for="p in players" :key="p.uid">
        <a @click.prevent="openPlayer(p.uid)" href="#">{{ p.name }}</a>
      </li>
    </ul>
  </main>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
a {
  color: #f0c96a;
  text-decoration: none;
  cursor: pointer;
}

.error {
  color: #ffb0b0;
}
</style>
