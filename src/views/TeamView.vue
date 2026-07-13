<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { matchClassFromCharacter, matchRaceFromCharacter } from '../models/characterCatalog'
import {
  createCharacterWithMembership,
  listCharactersByCampaign,
} from '../models/repositories/CharacterRepository'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import { listMembershipsByCampaign } from '../models/repositories/MembershipRepository'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import type { CharacterGender, CharacterProfile } from '../models/types/Character'
import type { Class } from '../models/types/Class'
import type { Posture } from '../models/types/Membership'
import type { Race } from '../models/types/Race'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => route.params.id as string)
const campaignStore = useCampaignStore()
const authStore = useAuthStore()

interface PlayerRow {
  uid: string
  characterId: string
  name: string
  raceName: string
  className: string
  level: number
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture | '—'
}

const playerRows = ref<PlayerRow[]>([])
const races = ref<Race[]>([])
const classes = ref<Class[]>([])
const loadingState = ref(false)
const errorState = ref('')

const canEdit = computed(() => authStore.isMj.value || authStore.isAdmin.value)
const formVisible = ref(false)
const formSaving = ref(false)
const formError = ref('')
const newName = ref('')
const newOwnerUid = ref('')
const newRaceId = ref('')
const newClassId = ref('')
const newGender = ref<CharacterGender>('Homme')

const campaign = computed(() =>
  campaignStore.campaigns.value.find((c) => c.id === campaignId.value),
)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
  await loadPlayers()
})

function resolveRaceName(character: CharacterProfile): string {
  const match = matchRaceFromCharacter(character, races.value)
  return match?.n ?? `(inconnu : ${character.raceId})`
}

function resolveClassName(character: CharacterProfile): string {
  const match = matchClassFromCharacter(character, classes.value)
  return match?.n ?? `(inconnu : ${character.classId})`
}

async function loadPlayers() {
  loadingState.value = true
  errorState.value = ''
  try {
    const [characters, memberships, raceList, classList] = await Promise.all([
      listCharactersByCampaign(campaignId.value),
      listMembershipsByCampaign(campaignId.value),
      listRacesByCampaign(campaignId.value),
      listClassesByCampaign(campaignId.value),
    ])
    races.value = raceList
    classes.value = classList
    const membershipByUid = new Map(memberships.map((m) => [m.uid, m]))
    playerRows.value = characters.map((character) => {
      const membership = membershipByUid.get(character.ownerUid)
      return {
        uid: character.ownerUid,
        characterId: character.id,
        name: character.name,
        raceName: resolveRaceName(character),
        className: resolveClassName(character),
        level: character.level,
        hp: membership?.session?.hp ?? 0,
        maxHp: membership?.session?.maxHp ?? 0,
        mana: membership?.session?.mana ?? 0,
        maxMana: membership?.session?.maxMana ?? 0,
        posture: membership?.session?.posture ?? '—',
      }
    })
  } catch (err) {
    errorState.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement des participants.'
  } finally {
    loadingState.value = false
  }
}

function openPlayer(characterId: string) {
  router.push(`/campaigns/${campaignId.value}/players/${characterId}`)
}

function openNewCharacterForm() {
  newName.value = ''
  newOwnerUid.value = ''
  newRaceId.value = races.value[0]?.id ?? ''
  newClassId.value = classes.value[0]?.id ?? ''
  newGender.value = 'Homme'
  formError.value = ''
  formVisible.value = true
}

function cancelNewCharacterForm() {
  formVisible.value = false
  formError.value = ''
}

async function submitNewCharacter() {
  if (!newName.value.trim() || !newOwnerUid.value.trim()) {
    formError.value = 'Le nom et le propriétaire sont obligatoires.'
    return
  }
  if (!races.value.some((r) => r.id === newRaceId.value)) {
    formError.value = 'Race invalide.'
    return
  }
  if (!classes.value.some((c) => c.id === newClassId.value)) {
    formError.value = 'Classe invalide.'
    return
  }

  formSaving.value = true
  formError.value = ''
  try {
    await createCharacterWithMembership({
      campaignId: campaignId.value,
      ownerUid: newOwnerUid.value.trim(),
      name: newName.value.trim(),
      raceId: newRaceId.value,
      classId: newClassId.value,
      gender: newGender.value,
      elements: [],
    })
    formVisible.value = false
    await loadPlayers()
  } catch (err) {
    formError.value =
      err instanceof Error ? err.message : 'Erreur lors de la création du personnage.'
  } finally {
    formSaving.value = false
  }
}
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <div class="header-row">
        <h1>Équipe — {{ campaign?.title ?? 'Campagne' }}</h1>
        <button
          v-if="canEdit && !formVisible"
          type="button"
          class="new-character-btn"
          @click="openNewCharacterForm"
        >
          Nouveau personnage
        </button>
      </div>

      <div v-if="formVisible" class="new-character-form">
        <label>
          Nom
          <input v-model="newName" type="text" />
        </label>
        <label>
          Propriétaire (uid)
          <input v-model="newOwnerUid" type="text" />
        </label>
        <label>
          Race
          <select v-model="newRaceId">
            <option v-for="r in races" :key="r.id" :value="r.id">{{ r.n }}</option>
          </select>
        </label>
        <label>
          Classe
          <select v-model="newClassId">
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.n }}</option>
          </select>
        </label>
        <label>
          Genre
          <select v-model="newGender">
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
            <option value="Autre">Autre</option>
          </select>
        </label>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="form-actions">
          <button type="button" :disabled="formSaving" @click="submitNewCharacter">Créer</button>
          <button type="button" :disabled="formSaving" @click="cancelNewCharacterForm">
            Annuler
          </button>
        </div>
      </div>

      <p v-if="loadingState">Chargement...</p>
      <p v-else-if="errorState" class="error">{{ errorState }}</p>
      <p v-else-if="playerRows.length === 0">Aucun participant pour cette campagne.</p>
      <table v-else>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Race</th>
            <th>Classe</th>
            <th>Niv.</th>
            <th>PV</th>
            <th>Mana</th>
            <th>Posture</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in playerRows"
            :key="p.characterId"
            class="player-row"
            @click="openPlayer(p.characterId)"
          >
            <td class="name">{{ p.name }}</td>
            <td>{{ p.raceName }}</td>
            <td>{{ p.className }}</td>
            <td>{{ p.level }}</td>
            <td>{{ p.hp }} / {{ p.maxHp }}</td>
            <td>{{ p.mana }} / {{ p.maxMana }}</td>
            <td>{{ p.posture }}</td>
          </tr>
        </tbody>
      </table>
    </main>
  </CampaignShell>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}
.header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.new-character-btn {
  border: 1px solid #5c4a2a;
  background: #1a1208;
  color: #e7d3a0;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.new-character-btn:hover {
  background: #2a1f0e;
}
.new-character-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  background: #2a1f0e;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}
.new-character-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #b8a07a;
}
.new-character-form input,
.new-character-form select {
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 4px;
  color: #f2e6cc;
  padding: 0.35rem 0.5rem;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
}
.form-actions button {
  border: 1px solid #5c4a2a;
  background: #1a1208;
  color: #e7d3a0;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}
.form-actions button:hover {
  background: #2a1f0e;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th {
  text-align: left;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #5c4a2a;
  color: #f0c96a;
  font-weight: 600;
}
td {
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #3a2e1a;
}
.player-row {
  cursor: pointer;
}
.player-row:hover td {
  background: #2a1f0e;
}
.name {
  font-weight: 600;
  color: #f0c96a;
}
.error {
  color: #ffb0b0;
}
</style>
