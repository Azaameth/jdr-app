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
      <header class="list-header panel-surface">
        <div>
          <span class="eyebrow">Personnages</span>
          <h1>Personnages accessibles</h1>
        </div>
        <span class="count-pill">{{ availableCharacters.length }} personnage{{ availableCharacters.length > 1 ? 's' : '' }}</span>
      </header>

      <p v-if="loadingState">Chargement...</p>
      <p v-else-if="errorState" class="error">{{ errorState }}</p>
      <p v-else-if="availableCharacters.length === 0">
        Aucun personnage associé à votre utilisateur pour cette campagne.
      </p>

      <template v-else>
        <nav class="tabs panel-surface" aria-label="Navigation des personnages">
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

.panel-surface {
  border: 1px solid rgba(212, 168, 67, 0.24);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(212, 168, 67, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(38, 29, 16, 0.96), rgba(24, 18, 10, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 236, 188, 0.05);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
}

.eyebrow {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d9b067;
}

h1 {
  font-size: 1.35rem;
  color: #f0c96a;
  margin: 0;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.2);
  color: #f0d189;
  font-weight: 700;
  font-size: 0.78rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 0.8rem;
}

.tab {
  border: 1px solid rgba(212, 168, 67, 0.18);
  background: rgba(26, 18, 8, 0.85);
  color: #e7d3a0;
  border-radius: 999px;
  padding: 0.42rem 0.9rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.tab:hover {
  transform: translateY(-1px);
  background: #2a1f0e;
  border-color: rgba(212, 168, 67, 0.35);
}

.tab.active {
  color: #f0c96a;
  border-color: rgba(201, 168, 76, 0.5);
  background: rgba(201, 168, 76, 0.18);
}

.error {
  color: #ffb0b0;
}
</style>
