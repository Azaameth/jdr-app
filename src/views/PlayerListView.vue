<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import type { CharacterProfile } from '../models/types/Character'
import PlayerView from './PlayerView.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const campaignId = computed(() => String(route.params.id ?? ''))
const routeCharacterId = computed(() => String(route.params.characterId ?? ''))

const allCharacters = ref<CharacterProfile[]>([])
const loadingState = ref(false)
const errorState = ref('')
const activeCharacterId = ref('')

function isOwnedByUser(character: CharacterProfile, uid: string) {
  const withLegacy = character as CharacterProfile & { userId?: string }
  return character.ownerUid === uid || withLegacy.userId === uid
}

const availableCharacters = computed(() => {
  const user = authStore.user.value
  if (!user) return []

  if (authStore.isAdmin.value || authStore.isMj.value) {
    return allCharacters.value
  }

  return allCharacters.value.filter((character) => isOwnedByUser(character, user.uid))
})

onMounted(async () => {
  await loadCharacters()
})

watch([routeCharacterId, availableCharacters], syncActiveCharacter)

async function loadCharacters() {
  loadingState.value = true
  errorState.value = ''

  try {
    // Transformation children (e.g. Furmiaou) are shown nested under their
    // parent's sheet via ChildSheetTab, not as their own tab — same
    // exclusion usePlayerStore().party already applies for PartyStatus.
    allCharacters.value = (await listCharactersByCampaign(campaignId.value)).filter(
      (character) => !character.parentCharacterId,
    )
    syncActiveCharacter()
  } catch (err) {
    errorState.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement des personnages.'
  } finally {
    loadingState.value = false
  }
}

function syncActiveCharacter() {
  const ids = new Set(availableCharacters.value.map((character) => character.id))

  if (routeCharacterId.value && ids.has(routeCharacterId.value)) {
    activeCharacterId.value = routeCharacterId.value
    return
  }

  const fallback = availableCharacters.value[0]?.id
  activeCharacterId.value = fallback ?? ''

  if (!fallback) {
    return
  }

  if (routeCharacterId.value !== fallback) {
    router.replace(`/campaigns/${campaignId.value}/players/${fallback}`)
  }
}

function openCharacter(characterId: string) {
  if (characterId === activeCharacterId.value) return
  activeCharacterId.value = characterId
  router.push(`/campaigns/${campaignId.value}/players/${characterId}`)
}
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="player-list-view">
      <h1>Personnages accessibles</h1>

      <p v-if="loadingState">Chargement...</p>
      <p v-else-if="errorState" class="error">{{ errorState }}</p>
      <p v-else-if="availableCharacters.length === 0">
        Aucun personnage associé à votre utilisateur pour cette campagne.
      </p>

      <template v-else>
        <nav class="tabs" aria-label="Navigation des personnages">
          <button
            v-for="character in availableCharacters"
            :key="character.id"
            type="button"
            class="tab"
            :class="{ active: character.id === activeCharacterId }"
            @click="openCharacter(character.id)"
          >
            {{ character.name }}
          </button>
        </nav>

        <PlayerView :campaign-id="campaignId" :character-id="activeCharacterId" />
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
.player-list-view {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: #f2e6cc;
}

h1 {
  font-size: 1.35rem;
  color: #f0c96a;
  margin: 0;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab {
  border: 1px solid #5c4a2a;
  background: #1a1208;
  color: #e7d3a0;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.tab:hover {
  background: #2a1f0e;
}

.tab.active {
  color: #f0c96a;
  border-color: #c9a84c;
  background: rgba(201, 168, 76, 0.18);
}

.error {
  color: #ffb0b0;
}
</style>
