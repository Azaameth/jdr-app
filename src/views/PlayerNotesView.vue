<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { usePlayerStore } from '../controllers/usePlayerStore'

const route = useRoute()
const authStore = useAuthStore()
const playerStore = usePlayerStore()

const campaignId = computed(() => String(route.params.id ?? ''))
const uid = computed(() => String(route.params.uid ?? ''))

const note = ref('')
// participantRef holds the resolved participant's Firestore doc id (participants/{id}),
// used as the key for the participantNotes/{id} note document.
const participantRef = ref('')
const lastSavedNote = ref('')
const loadingState = ref(false)
const savingState = ref(false)
const forbiddenState = ref(false)
const errorState = ref('')
const saveInfo = ref('')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave = false

function clearSaveTimer() {
  if (!saveTimer) return
  clearTimeout(saveTimer)
  saveTimer = null
}

function scheduleSave() {
  clearSaveTimer()
  saveTimer = setTimeout(() => {
    void persistPersonalNote()
  }, 550)
}

async function persistPersonalNote() {
  if (!campaignId.value || !participantRef.value || loadingState.value || forbiddenState.value) {
    return
  }
  if (note.value === lastSavedNote.value) {
    return
  }

  if (savingState.value) {
    pendingSave = true
    return
  }

  savingState.value = true
  saveInfo.value = 'Enregistrement...'

  try {
    await playerStore.setPersonalNote(participantRef.value, note.value)
    if (playerStore.error.value) {
      throw new Error(playerStore.error.value)
    }

    lastSavedNote.value = note.value
    saveInfo.value = 'Notes enregistrées.'
    errorState.value = ''
  } catch (err) {
    saveInfo.value = ''
    errorState.value =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement des notes."
  } finally {
    savingState.value = false

    if (pendingSave) {
      pendingSave = false
      void persistPersonalNote()
    }
  }
}

async function loadPersonalNote() {
  clearSaveTimer()
  pendingSave = false
  loadingState.value = true
  forbiddenState.value = false
  errorState.value = ''
  saveInfo.value = ''
  participantRef.value = ''
  note.value = ''
  lastSavedNote.value = ''

  const user = authStore.user.value
  if (!campaignId.value || !uid.value || !user?.uid) {
    loadingState.value = false
    return
  }

  let targetRef = uid.value

  if (authStore.isPlayer.value) {
    const ownCharacterId = await playerStore.resolveCharacterId(user.uid, campaignId.value)
    const canOpenTarget =
      uid.value === user.uid || (ownCharacterId ? uid.value === ownCharacterId : false)

    if (!canOpenTarget) {
      forbiddenState.value = true
      loadingState.value = false
      return
    }

    if (ownCharacterId) {
      targetRef = ownCharacterId
    }
  }

  try {
    const participant = await playerStore.resolveParticipant(campaignId.value, targetRef)
    if (!participant) {
      throw new Error('Participant introuvable pour cette campagne.')
    }

    participantRef.value = participant.id
    note.value = await playerStore.getPersonalNote(participant.id)
    lastSavedNote.value = note.value
  } catch (err) {
    errorState.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement des notes personnelles.'
  } finally {
    loadingState.value = false
  }
}

watch(
  [campaignId, uid, () => authStore.user.value?.uid],
  () => {
    void loadPersonalNote()
  },
  { immediate: true },
)

watch(note, () => {
  if (loadingState.value || forbiddenState.value) return
  if (!participantRef.value) return
  if (note.value === lastSavedNote.value) return
  saveInfo.value = 'Modifications locales non enregistrées.'
  scheduleSave()
})

onBeforeUnmount(() => {
  clearSaveTimer()
})
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main class="player-notes-view">
      <header class="head">
        <h1>Notes personnelles</h1>
        <p class="subtitle">Campagne {{ campaignId }} · Joueur {{ uid }}</p>
      </header>

      <p v-if="loadingState">Chargement...</p>
      <p v-else-if="forbiddenState" class="error">Accès refusé.</p>
      <p v-else-if="errorState" class="error">{{ errorState }}</p>

      <section v-else class="card">
        <label for="personal-note">Vos notes</label>
        <textarea
          id="personal-note"
          v-model="note"
          :disabled="savingState"
          rows="14"
          placeholder="Écrivez ici vos notes de session, objectifs et rappels personnels..."
        />

        <div class="meta-row">
          <span v-if="savingState">Enregistrement en cours...</span>
          <span v-else-if="saveInfo">{{ saveInfo }}</span>
          <span v-else>Aucune modification en attente.</span>
        </div>
      </section>
    </main>
  </CampaignShell>
</template>

<style scoped>
.player-notes-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #f2e6cc;
}

.head {
  display: grid;
  gap: 0.35rem;
}

h1 {
  margin: 0;
  color: #f0c96a;
  font-size: 1.45rem;
}

.subtitle {
  margin: 0;
  color: #c9b78d;
  font-size: 0.95rem;
}

.card {
  display: grid;
  gap: 0.65rem;
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 8px;
  padding: 1rem;
}

label {
  font-weight: 600;
  color: #e8c878;
}

textarea {
  width: 100%;
  min-height: 320px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid #5c4a2a;
  background: #120d05;
  color: #f2e6cc;
  padding: 0.8rem;
  line-height: 1.45;
  font-family: inherit;
  font-size: 0.95rem;
}

textarea:disabled {
  opacity: 0.7;
}

.meta-row {
  min-height: 1.25rem;
  font-size: 0.85rem;
  color: #bfae86;
}

.error {
  color: #ffb0b0;
}

@media (max-width: 800px) {
  textarea {
    min-height: 260px;
  }
}
</style>
