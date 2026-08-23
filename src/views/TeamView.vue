<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignStore } from '../controllers/useCampaignStore'
import { listCharactersByCampaign } from '../models/repositories/CharacterRepository'
import {
  getCharacterState,
  resetTeamStatesToMax,
} from '../models/repositories/CharacterStateRepository'
import { listEquipmentByCampaign } from '../models/repositories/EquipmentRepository'
import type { SecondaryAttributes } from '../models/types/Character'
import type { Posture } from '../models/types/Participant'
import { computeArmorTotal, computeEffectiveStat, type ArmorTotal } from '../utils/effectiveStats'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => route.params.id as string)
const authStore = useAuthStore()
const campaignStore = useCampaignStore()

interface PlayerRow {
  uid: string
  characterId: string
  name: string
  raceId: string
  classId: string
  level: number
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture | '—'
  secondary: SecondaryAttributes
  armor: ArmorTotal
}

const secondaryAttributeLabels: Record<keyof SecondaryAttributes, string> = {
  puissance: 'Puissance',
  finesse: 'Finesse',
  aura: 'Aura',
  relation: 'Relation',
  instinct: 'Instinct',
  savoir: 'Savoir',
}

const playerRows = ref<PlayerRow[]>([])
const loadingState = ref(false)
const resettingState = ref(false)
const errorState = ref('')

const campaign = computed(() =>
  campaignStore.campaigns.value.find((c) => c.id === campaignId.value),
)
const canRestTeam = computed(() => authStore.isMj.value || authStore.isAdmin.value)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function getHpVisual(current: number, max: number) {
  const c1 = '#dd3c35'
  const c2 = '#5a120f'
  const c3 = '#17120d'
  const safeMax = Math.max(0, max)

  if (safeMax <= 0) {
    return {
      fillPercent: 0,
      fillColor: c1,
      fillOpacity: 1,
      trackColor: c2,
    }
  }

  const hp = clamp(current, -safeMax, safeMax)
  if (hp >= 0) {
    return {
      fillPercent: Math.round((hp / safeMax) * 100),
      fillColor: c1,
      fillOpacity: 1,
      trackColor: c2,
    }
  }

  return {
    fillPercent: Math.round((1 - Math.abs(hp) / safeMax) * 100),
    fillColor: c2,
    fillOpacity: 1,
    trackColor: c3,
  }
}

function getManaVisual(current: number, max: number) {
  const safeMax = Math.max(0, max)
  if (safeMax <= 0) {
    return {
      fillPercent: 0,
      fillColor: '#2d7ff7',
      trackColor: '#10263f',
    }
  }

  const mana = clamp(current, 0, safeMax)
  return {
    fillPercent: Math.round((mana / safeMax) * 100),
    fillColor: '#2d7ff7',
    trackColor: '#10263f',
  }
}

function getPostureTone(posture: Posture | '—') {
  if (posture === 'DEFENSIF') return 'def'
  if (posture === 'OFFENSIF') return 'off'
  if (posture === 'FOCUS') return 'focus'
  return 'neutral'
}

const teamSummary = computed(() => {
  const totals = playerRows.value.reduce(
    (acc, player) => {
      acc.hp += Math.max(player.hp, 0)
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
    hpVisual: getHpVisual(totals.hp, totals.maxHp),
    manaVisual: getManaVisual(totals.mana, totals.maxMana),
  }
})

const playerSummaries = computed(() =>
  playerRows.value.map((player) => ({
    ...player,
    hpRate: player.maxHp > 0 ? Math.round((player.hp / player.maxHp) * 100) : 0,
    manaRate: player.maxMana > 0 ? Math.round((player.mana / player.maxMana) * 100) : 0,
    hpVisual: getHpVisual(player.hp, player.maxHp),
    manaVisual: getManaVisual(player.mana, player.maxMana),
  })),
)

const secondaryLeaders = computed(() => {
  const keys = Object.keys(secondaryAttributeLabels) as Array<keyof SecondaryAttributes>

  return keys.map((attribute) => {
    const leaders = [...playerRows.value]
      .sort((left, right) => right.secondary[attribute] - left.secondary[attribute])
      .slice(0, 3)
      .map((player, index) => ({
        characterId: player.characterId,
        name: player.name,
        score: player.secondary[attribute],
        rank: index + 1,
      }))

    return {
      key: attribute,
      label: secondaryAttributeLabels[attribute],
      leaders,
    }
  })
})

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
    const [characters, equipmentDocs] = await Promise.all([
      listCharactersByCampaign(campaignId.value),
      listEquipmentByCampaign(campaignId.value),
    ])
    // Transformations stay nested under their parent sheet and are excluded from
    // the team roster rows.
    const playable = characters.filter((character) => !character.parentCharacterId)
    const states = await Promise.all(
      playable.map((character) => getCharacterState(campaignId.value, character.id)),
    )
    const stateByCharacterId = new Map(playable.map((character, index) => [character.id, states[index]]))
    const equipmentByCharacterId = new Map(
      equipmentDocs.map((equipmentDoc) => [equipmentDoc.characterId, equipmentDoc]),
    )

    playerRows.value = playable.map((character) => {
      const state = stateByCharacterId.get(character.id)
      const equipmentDoc = equipmentByCharacterId.get(character.id)
      const equipment = equipmentDoc ? [...equipmentDoc.Weapons, ...equipmentDoc.Armor] : []
      return {
        uid: character.ownerUid,
        characterId: character.id,
        name: character.name,
        raceId: character.raceId,
        classId: character.classId,
        level: character.level,
        hp: state?.HealthCurrent ?? 0,
        maxHp: computeEffectiveStat(state?.Health ?? 0, equipment, 'Health'),
        mana: state?.ManaCurrent ?? 0,
        maxMana: computeEffectiveStat(state?.Mana ?? 0, equipment, 'Mana'),
        posture: state?.Posture ?? '—',
        secondary: character.attributes.secondary,
        armor: computeArmorTotal(equipment),
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
    const characters = await listCharactersByCampaign(campaignId.value)
    const ids = characters.filter((c) => !c.parentCharacterId).map((c) => c.id)
    await resetTeamStatesToMax(campaignId.value, ids)
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
      <div class="title-row panel-surface title-panel">
        <div class="title-copy">
          <span class="eyebrow">Campagne</span>
          <h1>Équipe — {{ campaign?.DisplayName ?? 'Campagne' }}</h1>
        </div>
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
            <div
              class="resource-bar"
              role="progressbar"
              aria-label="Points de vie équipe"
              :style="{ background: teamSummary.hpVisual.trackColor }"
            >
              <span
                class="resource-fill"
                :style="{
                  width: `${teamSummary.hpVisual.fillPercent}%`,
                  background: teamSummary.hpVisual.fillColor,
                  opacity: teamSummary.hpVisual.fillOpacity,
                }"
              />
            </div>
            <p class="summary-rate">{{ teamSummary.hpRate }}%</p>
          </article>

          <article class="summary-card">
            <h2>Mana équipe</h2>
            <p class="summary-value">{{ teamSummary.mana }} / {{ teamSummary.maxMana }}</p>
            <div
              class="resource-bar"
              role="progressbar"
              aria-label="Mana équipe"
              :style="{ background: teamSummary.manaVisual.trackColor }"
            >
              <span
                class="resource-fill"
                :style="{
                  width: `${teamSummary.manaVisual.fillPercent}%`,
                  background: teamSummary.manaVisual.fillColor,
                }"
              />
            </div>
            <p class="summary-rate">{{ teamSummary.manaRate }}%</p>
          </article>
        </section>

        <section class="team-recap-panel panel-surface" aria-label="Récapitulatif de l'équipe">
          <table class="team-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Race</th>
                <th>Classe</th>
                <th>Niv.</th>
                <th>Armure</th>
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
                <td class="armor-cell">
                  <span class="armor-total">{{ p.armor.total }}</span>
                  <span class="armor-breakdown">AM {{ p.armor.magique }} · AP {{ p.armor.physique }}</span>
                </td>
                <td>
                  <div class="resource-cell">
                    <span>{{ p.hp }} / {{ p.maxHp }} ({{ p.hpRate }}%)</span>
                    <div
                      class="resource-bar"
                      role="progressbar"
                      aria-label="Points de vie"
                      :style="{ background: p.hpVisual.trackColor }"
                    >
                      <span
                        class="resource-fill"
                        :style="{
                          width: `${p.hpVisual.fillPercent}%`,
                          background: p.hpVisual.fillColor,
                          opacity: p.hpVisual.fillOpacity,
                        }"
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <div class="resource-cell">
                    <span>{{ p.mana }} / {{ p.maxMana }} ({{ p.manaRate }}%)</span>
                    <div
                      class="resource-bar"
                      role="progressbar"
                      aria-label="Points de mana"
                      :style="{ background: p.manaVisual.trackColor }"
                    >
                      <span
                        class="resource-fill"
                        :style="{
                          width: `${p.manaVisual.fillPercent}%`,
                          background: p.manaVisual.fillColor,
                        }"
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <span class="posture-badge" :class="`posture-${getPostureTone(p.posture)}`">
                    {{ p.posture }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section
          class="secondary-panel panel-surface"
          aria-label="Meilleurs personnages par attribut secondaire"
        >
          <table class="secondary-table">
            <tbody>
              <tr v-for="entry in secondaryLeaders" :key="entry.key">
                <td class="secondary-name">{{ entry.label }}</td>
                <td v-for="leader in entry.leaders" :key="`${entry.key}-${leader.characterId}`">
                  <button
                    type="button"
                    class="leader-chip"
                    :class="`leader-rank-${leader.rank}`"
                    @click="openPlayer(leader.characterId)"
                  >
                    <span class="leader-rank">#{{ leader.rank }}</span>
                    <span class="leader-name">{{ leader.name }}</span>
                    <strong>{{ leader.score }}</strong>
                  </button>
                </td>
                <td
                  v-for="index in 3 - entry.leaders.length"
                  :key="`${entry.key}-empty-${index}`"
                  class="leader-empty"
                >
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </main>
  </CampaignShell>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}

.title-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  padding: 0.95rem 1rem;
}

.title-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d9b067;
}

.title-row h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 2rem);
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

.panel-surface {
  margin-bottom: 1rem;
  padding: 1.05rem 1.1rem 1.1rem;
  border: 1px solid rgba(212, 168, 67, 0.24);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(212, 168, 67, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(38, 29, 16, 0.92), rgba(24, 18, 10, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 236, 188, 0.06);
}

.team-recap-panel {
  padding-top: 0.8rem;
}

.secondary-panel {
  padding-top: 0.8rem;
}

.summary-card {
  padding: 0.85rem 1rem;
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(40, 30, 17, 0.88), rgba(26, 19, 10, 0.88));
  box-shadow: inset 0 1px 0 rgba(255, 236, 188, 0.05);
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

.resource-cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.resource-bar {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #443118;
  background: #150f08;
}

.resource-fill {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  border-radius: inherit;
  transition:
    width 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.armor-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.armor-total {
  font-size: 1rem;
  font-weight: 700;
  color: #d2c39b;
}

.armor-breakdown {
  font-size: 0.72rem;
  color: #8a7a5c;
}

.posture-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  padding: 0.28rem 0.5rem;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #fff5de;
}

.posture-def {
  background: #0f5d26;
}

.posture-off {
  background: #812516;
}

.posture-focus {
  background: #174f94;
}

.posture-neutral {
  background: #3a2e1a;
  color: #d2c39b;
}

.secondary-table {
  width: 100%;
  background: rgba(15, 11, 6, 0.38);
  border: 1px solid rgba(212, 168, 67, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.team-table {
  background: rgba(15, 11, 6, 0.38);
  border: 1px solid rgba(212, 168, 67, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.secondary-name {
  font-weight: 700;
  color: #f0c96a;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  width: 12rem;
}

.leader-chip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(212, 168, 67, 0.12);
  background: linear-gradient(180deg, rgba(34, 25, 14, 0.92), rgba(21, 16, 9, 0.96));
  color: #f2e6cc;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.leader-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(212, 168, 67, 0.3);
  background: linear-gradient(180deg, rgba(48, 35, 18, 0.96), rgba(28, 21, 11, 0.98));
}

.leader-chip strong {
  color: #f0c96a;
  font-size: 1rem;
}

.leader-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  padding: 0.18rem 0.4rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #1a1207;
  background: #d2c39b;
}

.leader-name {
  font-weight: 600;
}

.leader-rank-1 {
  border-color: rgba(240, 201, 106, 0.34);
}

.leader-rank-1 .leader-rank {
  background: linear-gradient(180deg, #f7d989, #d8ab36);
}

.leader-rank-2 {
  border-color: rgba(191, 202, 212, 0.28);
}

.leader-rank-2 .leader-rank {
  background: linear-gradient(180deg, #dde4ea, #9aa8b4);
}

.leader-rank-3 {
  border-color: rgba(172, 107, 58, 0.28);
}

.leader-rank-3 .leader-rank {
  background: linear-gradient(180deg, #cf9b70, #9a6031);
}

.leader-empty {
  color: #7b6b4f;
  text-align: center;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9rem;
}
th {
  text-align: left;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid #5c4a2a;
  color: #f0c96a;
  font-weight: 600;
  background: rgba(27, 20, 11, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.76rem;
}
td {
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid #3a2e1a;
  vertical-align: middle;
}
.player-row {
  cursor: pointer;
}
.player-row:hover td {
  background: rgba(42, 31, 14, 0.92);
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

  .leader-chip {
    grid-template-columns: 1fr;
    justify-items: start;
  }
}
</style>
