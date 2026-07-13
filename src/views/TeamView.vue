<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import {
  listMembershipsByCampaign,
  resetTeamSessionToMax,
} from '../models/repositories/MembershipRepository'
import type { Posture } from '../models/types/Membership'
import type { Race } from '../models/types/Race'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => route.params.id as string)
const authStore = useAuthStore()
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
const resettingState = ref(false)
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
const canRestTeam = computed(() => authStore.isMj.value || authStore.isAdmin.value)

const teamSummary = computed(() => {
  const totals = playerRows.value.reduce(
    (acc, player) => {
      acc.hp += player.hp
      acc.maxHp += player.maxHp
      acc.mana += player.mana
      acc.maxMana += player.maxMana
      return acc
    },
    { hp: 0, maxHp: 0, mana: 0, maxMana: 0 },
  )

  return {
    ...totals,
    hpRate: totals.maxHp > 0 ? Math.round((totals.hp / totals.maxHp) * 100) : 0,
    manaRate: totals.maxMana > 0 ? Math.round((totals.mana / totals.maxMana) * 100) : 0,
  }
})

const playerSummaries = computed(() =>
  playerRows.value.map((player) => ({
    ...player,
    hpRate: player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0,
    manaRate: player.maxMana > 0 ? Math.round((player.mana / player.maxMana) * 100) : 0,
  })),
)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
  await loadPlayers()
})

watch(
  () => campaignId.value,
  async () => {
    await loadPlayers()
  },
)

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

async function restTeam() {
  if (!canRestTeam.value || resettingState.value) return
  if (!confirm("Faire reposer l'équipe et remettre PV/Mana au maximum ?")) return

  resettingState.value = true
  errorState.value = ''
  try {
    await resetTeamSessionToMax(campaignId.value)
    await loadPlayers()
  } catch (err) {
    errorState.value = err instanceof Error ? err.message : "Erreur lors du repos de l'équipe."
  } finally {
    resettingState.value = false
  }
}
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <div class="title-row">
        <h1>Équipe — {{ campaign?.title ?? 'Campagne' }}</h1>
        <button
          v-if="canRestTeam"
          class="rest-btn"
          :disabled="resettingState || loadingState"
          @click="restTeam"
        >
          {{ resettingState ? 'Repos en cours...' : "Faire reposer l'équipe" }}
        </button>
      </div>
      <p v-if="loadingState">Chargement...</p>
      <p v-else-if="errorState" class="error">{{ errorState }}</p>
      <p v-else-if="playerRows.length === 0">Aucun participant pour cette campagne.</p>
      <template v-else>
        <section class="summary-grid" aria-label="Résumé d'équipe">
          <article class="summary-card">
            <h2>PDV équipe</h2>
            <p class="summary-value">{{ teamSummary.hp }} / {{ teamSummary.maxHp }}</p>
            <p class="summary-rate">{{ teamSummary.hpRate }}%</p>
          </article>

          <article class="summary-card">
            <h2>Mana équipe</h2>
            <p class="summary-value">{{ teamSummary.mana }} / {{ teamSummary.maxMana }}</p>
            <p class="summary-rate">{{ teamSummary.manaRate }}%</p>
          </article>
        </section>

        <table>
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
              v-for="p in playerSummaries"
              :key="p.characterId"
              class="player-row"
              @click="openPlayer(p.characterId)"
            >
              <td class="name">{{ p.name }}</td>
              <td>{{ p.raceId }}</td>
              <td>{{ p.classId }}</td>
              <td>{{ p.level }}</td>
              <td>{{ p.hp }} / {{ p.maxHp }} ({{ p.hpRate }}%)</td>
              <td>{{ p.mana }} / {{ p.maxMana }} ({{ p.manaRate }}%)</td>
              <td>{{ p.posture }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.title-row h1 {
  margin: 0;
}

.rest-btn {
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 67, 0.32);
  background: rgba(212, 168, 67, 0.14);
  color: #f2e6cc;
  cursor: pointer;
  font-weight: 600;
}

.rest-btn:hover {
  background: rgba(212, 168, 67, 0.22);
}

.rest-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-card {
  padding: 0.85rem 1rem;
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 14px;
  background: rgba(32, 24, 13, 0.7);
}

.summary-card h2 {
  margin: 0;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #f0c96a;
}

.summary-value {
  margin: 0.45rem 0 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.summary-rate {
  margin: 0.25rem 0 0;
  color: #d2c39b;
  font-size: 0.9rem;
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

@media (max-width: 720px) {
  .title-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
