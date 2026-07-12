<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import { listMembershipsByCampaign } from '../models/repositories/MembershipRepository'
import type { Posture } from '../models/types/Membership'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => route.params.id as string)
const campaignStore = useCampaignStore()

interface PlayerRow {
  uid: string
  name: string
  raceId: string
  classId: string
  level: number
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture | '—'
}

const playerRows = ref<PlayerRow[]>([])
const loadingState = ref(false)
const errorState = ref('')

const campaign = computed(() =>
  campaignStore.campaigns.value.find((c) => c.id === campaignId.value),
)

onMounted(async () => {
  await campaignStore.fetchCampaigns()
  await loadPlayers()
})

async function loadPlayers() {
  loadingState.value = true
  errorState.value = ''
  try {
    const [characters, memberships] = await Promise.all([
      listCharactersByCampaign(campaignId.value),
      listMembershipsByCampaign(campaignId.value),
    ])
    const membershipByUid = new Map(memberships.map((m) => [m.uid, m]))
    playerRows.value = characters.map((character) => {
      const membership = membershipByUid.get(character.ownerUid)
      return {
        uid: character.ownerUid,
        name: character.name,
        raceId: character.raceId,
        classId: character.classId,
        level: character.level,
        hp: membership?.session.hp ?? 0,
        maxHp: membership?.session.maxHp ?? 0,
        mana: membership?.session.mana ?? 0,
        maxMana: membership?.session.maxMana ?? 0,
        posture: membership?.session.posture ?? '—',
      }
    })
  } catch (err) {
    errorState.value =
      err instanceof Error ? err.message : 'Erreur lors du chargement des participants.'
  } finally {
    loadingState.value = false
  }
}

function openPlayer(uid: string) {
  router.push(`/campaigns/${campaignId.value}/players/${uid}`)
}
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <h1>Équipe — {{ campaign?.title ?? 'Campagne' }}</h1>
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
          <tr v-for="p in playerRows" :key="p.uid" class="player-row" @click="openPlayer(p.uid)">
            <td class="name">{{ p.name }}</td>
            <td>{{ p.raceId }}</td>
            <td>{{ p.classId }}</td>
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
