<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BackpackGrid from '../components/BackpackGrid.vue'
import DonDetailModal from '../components/DonDetailModal.vue'
import DonList from '../components/DonList.vue'
import InventorySlotModal, {
  type InventorySlotContext,
  type InventorySlotDeletePayload,
  type InventorySlotSavePayload,
} from '../components/InventorySlotModal.vue'
import WeaponArmorList from '../components/WeaponArmorList.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useInventoryStore } from '../controllers/useInventoryStore'
import { usePlayerStore } from '../controllers/usePlayerStore'
import { getCharacterById } from '../models/repositories/CharacterRepository'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import { getParticipantByCharacterId } from '../models/repositories/ParticipantRepository'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import type { CharacterGift, CharacterProfile } from '../models/types/Character'
import type { Class } from '../models/types/Class'
import type { InventoryCategory, InventoryItem, WeaponArmorItem } from '../models/types/Inventory'
import type { Participant, Posture } from '../models/types/Participant'
import type { Race } from '../models/types/Race'

const props = withDefaults(
  defineProps<{
    campaignId?: string
    characterId?: string
  }>(),
  {
    campaignId: undefined,
    characterId: undefined,
  },
)

const route = useRoute()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const inventoryStore = useInventoryStore()
const campaignId = computed(() => props.campaignId ?? (route.params.id as string))
const characterId = computed(() => props.characterId ?? (route.params.characterId as string))

const character = ref<CharacterProfile | null>(null)
const participant = ref<Participant | null>(null)
const inventory = computed(() => inventoryStore.inventory.value)
const weapons = computed(() => inventory.value?.weapons ?? [])
const armor = computed(() => inventory.value?.armor ?? [])
const backpackItems = computed(() => inventory.value?.items ?? [])
const races = ref<Race[]>([])
const classes = ref<Class[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const sessionLoading = ref<'hp' | 'mana' | 'posture' | null>(null)
const sessionError = ref('')

// Slot editing: only the inventory's owner (character's uid) or an mj/admin
// may open the modal in edit mode (FR-009). Everyone else — including all
// viewers when Firebase isn't configured (no inventory loaded) — sees no
// edit affordance, enforced both here and by the display components' render.
const canEditInventory = computed(() => {
  const inv = inventory.value
  const currentUser = authStore.user.value
  if (!inv || !currentUser) return false
  return inv.uid === currentUser.uid || authStore.isMj.value || authStore.isAdmin.value
})

const slotModalOpen = ref(false)
const slotModalContext = ref<InventorySlotContext | null>(null)

function openBackpackSlot(payload: { category: InventoryCategory; item?: InventoryItem }) {
  if (!canEditInventory.value) return
  slotModalContext.value = { kind: 'backpack', category: payload.category, item: payload.item }
  slotModalOpen.value = true
}

function openEquipmentSlot(payload: { kind: 'weapons' | 'armor'; item?: WeaponArmorItem }) {
  if (!canEditInventory.value) return
  slotModalContext.value = { kind: payload.kind, item: payload.item }
  slotModalOpen.value = true
}

function closeSlotModal() {
  slotModalOpen.value = false
  slotModalContext.value = null
}

const donModalOpen = ref(false)
const donModalGift = ref<CharacterGift | null>(null)

function openDonModal(gift: CharacterGift) {
  donModalGift.value = gift
  donModalOpen.value = true
}

function closeDonModal() {
  donModalOpen.value = false
  donModalGift.value = null
}

async function handleSlotSave(payload: InventorySlotSavePayload) {
  const success =
    payload.kind === 'backpack'
      ? await inventoryStore.saveBackpackItem(payload.item)
      : await inventoryStore.saveEquipmentItem(payload.kind, payload.item)

  // On failure (e.g. category-full rejection), keep the modal open so the
  // French error surfaced by the store is visible via `errorMessage`.
  if (success) {
    closeSlotModal()
  }
}

async function handleSlotDelete(payload: InventorySlotDeletePayload) {
  const success =
    payload.kind === 'backpack'
      ? await inventoryStore.removeBackpackItem(payload.itemId)
      : await inventoryStore.removeEquipmentItem(payload.kind, payload.itemId)

  if (success) {
    closeSlotModal()
  }
}

const postureOptions: Array<{ value: Posture; label: string; tone: string }> = [
  { value: 'DEFENSIF', label: 'Défensif', tone: 'def' },
  { value: 'OFFENSIF', label: 'Offensif', tone: 'off' },
  { value: 'FOCUS', label: 'Focus', tone: 'focus' },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

const hpVisual = computed(() => {
  const session = participant.value?.session
  const max = Math.max(0, session?.maxHp ?? 0)
  const c1 = '#dd3c35'
  const c2 = '#5a120f'
  const c3 = '#17120d'

  if (max <= 0) {
    return {
      fillPercent: 0,
      fillColor: c1,
      fillOpacity: 1,
      trackColor: c2,
    }
  }

  const hp = clamp(session?.hp ?? 0, -max, max)
  if (hp >= 0) {
    return {
      fillPercent: Math.round((hp / max) * 100),
      fillColor: c1,
      fillOpacity: 1,
      trackColor: c2,
    }
  }

  return {
    // In negative phase, c2 shrinks and reveals c3 underneath.
    fillPercent: Math.round((1 - Math.abs(hp) / max) * 100),
    fillColor: c2,
    fillOpacity: 1,
    trackColor: c3,
  }
})

const manaVisual = computed(() => {
  const session = participant.value?.session
  const max = Math.max(0, session?.maxMana ?? 0)
  if (max <= 0) {
    return {
      fillPercent: 0,
      fillColor: '#2d7ff7',
      trackColor: '#10263f',
    }
  }

  const mana = clamp(session?.mana ?? 0, 0, max)
  return {
    fillPercent: Math.round((mana / max) * 100),
    fillColor: '#2d7ff7',
    trackColor: '#10263f',
  }
})

const selectedRace = computed(() => {
  const raceId = character.value?.raceId
  if (!raceId) return null
  const normalized = raceId.trim().toLowerCase()
  return (
    races.value.find((race) => race.id === raceId) ??
    races.value.find((race) => race.n.trim().toLowerCase() === normalized) ??
    null
  )
})

const selectedClass = computed(() => {
  const classId = character.value?.classId
  if (!classId) return null
  const normalized = classId.trim().toLowerCase()
  return (
    classes.value.find((klass) => klass.id === classId) ??
    classes.value.find((klass) => klass.n.trim().toLowerCase() === normalized) ??
    null
  )
})

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}

function handlePortraitError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  img.style.display = 'none'
}

function clampSessionValue(resource: 'hp' | 'mana', value: number, max: number) {
  const boundedMax = Math.max(0, max)
  if (resource === 'hp') {
    return Math.max(-boundedMax, Math.min(Math.trunc(value), boundedMax))
  }
  return Math.max(0, Math.min(Math.trunc(value), boundedMax))
}

async function changeSessionResource(resource: 'hp' | 'mana', delta: number) {
  if (!participant.value || !campaignId.value || !characterId.value) return
  if (sessionLoading.value) return

  const session = participant.value.session
  const current = resource === 'hp' ? session.hp : session.mana
  const max = resource === 'hp' ? session.maxHp : session.maxMana
  const next = clampSessionValue(resource, current + delta, max)
  if (next === current) return

  const previous = participant.value
  participant.value = {
    ...previous,
    session: {
      ...previous.session,
      [resource]: next,
    },
  }

  sessionLoading.value = resource
  sessionError.value = ''

  try {
    const updated = await playerStore.setSessionResource(
      campaignId.value,
      characterId.value,
      resource,
      next,
    )
    if (!updated) {
      throw new Error('Impossible de mettre a jour la session du participant.')
    }
    participant.value = updated
  } catch (err) {
    participant.value = previous
    sessionError.value =
      err instanceof Error ? err.message : 'Erreur lors de la mise a jour de la session.'
  } finally {
    sessionLoading.value = null
  }
}

async function changePosture(posture: Posture) {
  if (!participant.value || !campaignId.value || !characterId.value) return
  if (sessionLoading.value) return
  if (participant.value.session.posture === posture) return

  const previous = participant.value
  participant.value = {
    ...previous,
    session: {
      ...previous.session,
      posture,
    },
  }

  sessionLoading.value = 'posture'
  sessionError.value = ''

  try {
    const updated = await playerStore.setSessionPosture(
      campaignId.value,
      characterId.value,
      posture,
    )
    if (!updated) {
      throw new Error('Impossible de mettre a jour la posture du participant.')
    }
    participant.value = updated
  } catch (err) {
    participant.value = previous
    sessionError.value =
      err instanceof Error ? err.message : 'Erreur lors de la mise a jour de la posture.'
  } finally {
    sessionLoading.value = null
  }
}

async function loadCharacter() {
  if (!campaignId.value || !characterId.value) {
    character.value = null
    participant.value = null
    races.value = []
    classes.value = []
    error.value = ''
    forbidden.value = false
    sessionError.value = ''
    sessionLoading.value = null
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  forbidden.value = false
  sessionError.value = ''

  try {
    const [char, participantRow, , raceList, classList] = await Promise.all([
      getCharacterById(characterId.value),
      getParticipantByCharacterId(characterId.value, campaignId.value),
      inventoryStore.loadInventory(characterId.value, campaignId.value),
      listRacesByCampaign(campaignId.value),
      listClassesByCampaign(campaignId.value),
    ])
    character.value = char
    participant.value = participantRow
    races.value = raceList
    classes.value = classList

    // Guard : un joueur ne peut voir que son propre personnage
    const user = authStore.user.value
    if (authStore.isPlayer.value && char?.ownerUid !== user?.uid) {
      forbidden.value = true
      return
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur de chargement.'
  } finally {
    loading.value = false
  }
}

watch([campaignId, characterId, () => authStore.user.value?.uid], loadCharacter, {
  immediate: true,
})
</script>

<template>
  <div class="player-view">
    <p v-if="loading">Chargement...</p>
    <p v-else-if="forbidden" class="error">Accès refusé.</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="character">
      <!-- Identité -->
      <section class="card identity-card">
        <div class="identity-head">
          <img
            v-if="character.img"
            class="portrait"
            :src="imageUrl(character.img)"
            :alt="`Portrait de ${character.name}`"
            @error="handlePortraitError"
          />

          <div class="identity-main">
            <h1>{{ character.name }}</h1>

            <div v-if="participant?.session" class="session-box">
              <div class="session-row">
                <div class="session-labels">
                  <span>Vie</span>
                  <b>{{ participant.session.hp }} / {{ participant.session.maxHp }}</b>
                </div>
                <div
                  class="session-bar"
                  role="progressbar"
                  aria-label="Points de vie"
                  :style="{ background: hpVisual.trackColor }"
                >
                  <span
                    class="session-fill"
                    :style="{
                      width: `${hpVisual.fillPercent}%`,
                      background: hpVisual.fillColor,
                      opacity: hpVisual.fillOpacity,
                    }"
                  />
                </div>
                <div class="session-actions">
                  <button
                    type="button"
                    class="delta-btn"
                    :disabled="
                      sessionLoading !== null ||
                      participant.session.hp <= -participant.session.maxHp
                    "
                    @click="changeSessionResource('hp', -1)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    class="delta-btn"
                    :disabled="
                      sessionLoading !== null || participant.session.hp >= participant.session.maxHp
                    "
                    @click="changeSessionResource('hp', 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="session-row">
                <div class="session-labels">
                  <span>Mana</span>
                  <b>{{ participant.session.mana }} / {{ participant.session.maxMana }}</b>
                </div>
                <div
                  class="session-bar"
                  role="progressbar"
                  aria-label="Points de mana"
                  :style="{ background: manaVisual.trackColor }"
                >
                  <span
                    class="session-fill"
                    :style="{
                      width: `${manaVisual.fillPercent}%`,
                      background: manaVisual.fillColor,
                    }"
                  />
                </div>
                <div class="session-actions">
                  <button
                    type="button"
                    class="delta-btn"
                    :disabled="sessionLoading !== null || participant.session.mana <= 0"
                    @click="changeSessionResource('mana', -1)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    class="delta-btn"
                    :disabled="
                      sessionLoading !== null ||
                      participant.session.mana >= participant.session.maxMana
                    "
                    @click="changeSessionResource('mana', 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <p v-if="sessionError" class="error session-error">{{ sessionError }}</p>

            <div class="grid-2 identity-details">
              <span><b>Race :</b> {{ character.raceId }}</span>
              <span><b>Classe :</b> {{ character.classId }}</span>
              <span><b>Genre :</b> {{ character.gender }}</span>
              <span><b>Niveau :</b> {{ character.level }}</span>
              <span v-if="character.xp !== undefined"><b>XP :</b> {{ character.xp }}</span>
              <span><b>Éléments :</b> {{ character.elements.join(', ') || '—' }}</span>
              <span><b>Langues :</b> {{ character.languages.join(', ') || '—' }}</span>
            </div>
          </div>

          <aside v-if="participant?.session" class="position-panel">
            <p class="position-title">Position</p>
            <div class="position-grid">
              <button
                v-for="option in postureOptions"
                :key="option.value"
                type="button"
                class="position-chip"
                :class="[
                  `position-${option.tone}`,
                  participant.session.posture === option.value ? 'position-active' : '',
                ]"
                :disabled="sessionLoading !== null"
                @click="changePosture(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section class="card" v-if="selectedRace || selectedClass">
        <h2>Bonus d'origine</h2>
        <div class="grid-2 bonus-grid">
          <div class="bonus-block" v-if="selectedRace">
            <h3>Race · {{ selectedRace.n }}</h3>
            <template v-if="selectedRace.bon.length">
              <p class="bonus-label">Bonus</p>
              <ul class="bonus-list">
                <li v-for="(item, index) in selectedRace.bon" :key="`race-bon-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
            <template v-if="selectedRace.mal.length">
              <p class="bonus-label">Malus</p>
              <ul class="bonus-list malus-list">
                <li v-for="(item, index) in selectedRace.mal" :key="`race-mal-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
          </div>

          <div class="bonus-block" v-if="selectedClass">
            <h3>Classe · {{ selectedClass.n }}</h3>
            <div class="class-stats">
              <span><b>PV :</b> {{ selectedClass.pv }}</span>
              <span><b>Mana :</b> {{ selectedClass.mana }}</span>
              <span><b>Armure :</b> {{ selectedClass.arm }}</span>
            </div>
            <template v-if="selectedClass.caps.length">
              <p class="bonus-label">Capacités</p>
              <ul class="bonus-list">
                <li v-for="(item, index) in selectedClass.caps" :key="`class-cap-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
          </div>
        </div>
      </section>

      <!-- Attributs -->
      <section class="card">
        <h2>Attributs principaux</h2>
        <div class="grid-3">
          <div class="attr" v-for="(val, key) in character.attributes.primary" :key="key">
            <span class="label">{{ key }}</span>
            <span class="val">{{ val }}</span>
          </div>
        </div>
        <h2>Attributs secondaires</h2>
        <div class="grid-3">
          <div class="attr" v-for="(val, key) in character.attributes.secondary" :key="key">
            <span class="label">{{ key }}</span>
            <span class="val">{{ val }}</span>
          </div>
        </div>
      </section>

      <!-- Compétences -->
      <section class="card" v-if="character.skills.length">
        <h2>Compétences</h2>
        <div class="grid-2">
          <div v-for="skill in character.skills" :key="skill.id" class="skill-row">
            <span>{{ skill.name }}</span>
            <span class="badge">{{ skill.domain }}</span>
            <span class="val">{{ skill.rank }}</span>
          </div>
        </div>
      </section>

      <!-- Dons -->
      <section class="card">
        <h2>Dons</h2>
        <DonList :gifts="character.gifts" @open="openDonModal" />
      </section>

      <!-- Histoire -->
      <section class="card" v-if="character.backstory">
        <h2>Histoire</h2>
        <p class="lore">{{ character.backstory }}</p>
      </section>

      <section class="card">
        <h2>Armes & Armures</h2>
        <div class="grid-2 weapon-armor-grid">
          <WeaponArmorList
            title="Armes"
            kind="weapons"
            :items="weapons"
            :editable="canEditInventory"
            @slot-click="openEquipmentSlot"
          />
          <WeaponArmorList
            title="Armures & Protections"
            kind="armor"
            :items="armor"
            :editable="canEditInventory"
            @slot-click="openEquipmentSlot"
          />
        </div>
      </section>

      <section class="card">
        <h2>Sac à dos</h2>
        <BackpackGrid :items="backpackItems" :editable="canEditInventory" @slot-click="openBackpackSlot" />
      </section>
    </template>

    <p v-else>Personnage introuvable.</p>

    <InventorySlotModal
      v-if="slotModalContext"
      :open="slotModalOpen"
      :context="slotModalContext"
      :error-message="inventoryStore.error.value"
      @close="closeSlotModal"
      @save="handleSlotSave"
      @delete="handleSlotDelete"
    />

    <DonDetailModal :open="donModalOpen" :gift="donModalGift" @close="closeDonModal" />
  </div>
</template>

<style scoped>
.player-view {
  padding: 1.25rem;
  color: #f2e6cc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;
}
.card {
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 1rem 1.25rem;
}
.identity-card {
  padding-top: 1.1rem;
}
.identity-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: start;
}
.identity-main {
  min-width: 0;
}
.portrait {
  width: 110px;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #5c4a2a;
}
h1 {
  font-size: 1.5rem;
  color: #f0c96a;
  margin: 0 0 0.75rem;
}
.identity-details {
  margin-top: 0.7rem;
}
.session-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem;
  border: 1px solid #6e5733;
  border-radius: 8px;
  background: #20160b;
}
.session-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 0.55rem;
}
.session-labels {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  font-size: 0.82rem;
}
.session-labels b {
  color: #f2e6cc;
  font-size: 0.86rem;
}
.session-bar {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #443118;
  background: #150f08;
}
.session-fill {
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
.session-actions {
  display: flex;
  gap: 0.25rem;
}
.delta-btn {
  width: 1.9rem;
  height: 1.55rem;
  border: 1px solid #6e5733;
  border-radius: 4px;
  background: #2c1f0f;
  color: #f0c96a;
  font-weight: 700;
  cursor: pointer;
}
.delta-btn:hover:not(:disabled) {
  background: #3a2914;
}
.delta-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.session-error {
  margin: 0.5rem 0 0;
}
.position-panel {
  min-width: 170px;
  border: 1px solid #6e5733;
  border-radius: 8px;
  padding: 0.5rem;
  background: #20160b;
}
.position-title {
  margin: 0 0 0.45rem;
  color: #c9a84c;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.position-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.position-chip {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.32rem 0.45rem;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}
.position-chip:hover:not(:disabled) {
  filter: brightness(1.1);
}
.position-chip:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.position-def {
  background: #0f5d26;
}
.position-off {
  background: #812516;
}
.position-focus {
  background: #174f94;
}
.position-active {
  border-color: #f0c96a;
  box-shadow: inset 0 0 0 1px rgba(240, 201, 106, 0.3);
  color: #fff5de;
  font-weight: 700;
}
h2 {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0.75rem 0 0.5rem;
}
h3 {
  font-size: 0.9rem;
  color: #c9a84c;
  margin: 0.5rem 0 0.25rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 1rem;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
}
.attr {
  display: flex;
  justify-content: space-between;
  background: #2a1f0e;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.label {
  text-transform: capitalize;
  font-size: 0.85rem;
}
.val {
  font-weight: 700;
  color: #f0c96a;
}
.skill-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
}
.badge {
  font-size: 0.7rem;
  background: #3a2e1a;
  border: 1px solid #5c4a2a;
  border-radius: 3px;
  padding: 0 4px;
  color: #c9a84c;
}
.lore {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #d4c49a;
  white-space: pre-wrap;
}
.weapon-armor-grid {
  align-items: start;
}
.error {
  color: #ffb0b0;
}
.bonus-grid {
  align-items: start;
}
.bonus-block {
  background: #2a1f0e;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
}
.bonus-label {
  margin: 0.45rem 0 0.2rem;
  color: #c9a84c;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.bonus-list {
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
}
.malus-list {
  color: #e0b9a1;
}
.class-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
}
@media (max-width: 780px) {
  .identity-head {
    grid-template-columns: 1fr;
  }

  .portrait {
    margin: 0 auto;
  }

  .position-panel {
    min-width: 0;
  }

  .position-grid {
    flex-direction: row;
  }

  .session-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .session-actions {
    justify-content: flex-end;
  }

  .weapon-armor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
