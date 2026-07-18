<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BackpackGrid from '../components/BackpackGrid.vue'
import DonDetailModal from '../components/DonDetailModal.vue'
import DonList from '../components/DonList.vue'
import InventorySlotModal, {
  type InventorySlotContext,
  type InventorySlotDeletePayload,
  type InventorySlotSavePayload,
} from '../components/InventorySlotModal.vue'
import AdvantageToggles from '../components/vitruve/AdvantageToggles.vue'
import AdventureDiceBox from '../components/vitruve/AdventureDiceBox.vue'
import CaracTab from '../components/vitruve/CaracTab.vue'
import ChildSheetTab from '../components/vitruve/ChildSheetTab.vue'
import FicheTab from '../components/vitruve/FicheTab.vue'
import JetCalculator from '../components/vitruve/JetCalculator.vue'
import PartyStatus from '../components/vitruve/PartyStatus.vue'
import RawCharacterEditor from '../components/vitruve/RawCharacterEditor.vue'
import { useTickState } from '../components/vitruve/tickState'
import VitruveSheet from '../components/vitruve/VitruveSheet.vue'
import WeaponArmorList from '../components/WeaponArmorList.vue'
import { useAuthStore } from '../controllers/useAuthStore'
import { useCampaignSessionStore } from '../controllers/useCampaignSessionStore'
import { useInventoryStore } from '../controllers/useInventoryStore'
import { usePlayerStore } from '../controllers/usePlayerStore'
import {
  getCharacterById,
  listChildrenOf,
  updateCharacter,
} from '../models/repositories/CharacterRepository'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import { getParticipantByCharacterId } from '../models/repositories/ParticipantRepository'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import type { CharacterAttributes, CharacterGift, CharacterProfile } from '../models/types/Character'
import type { Class } from '../models/types/Class'
import type { InventoryCategory, InventoryItem, WeaponArmorItem } from '../models/types/Inventory'
import type {
  CharacterSessionState,
  InjuryState,
  Participant,
  Posture,
  SecondaryAttributeName,
} from '../models/types/Participant'
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
const campaignSessionStore = useCampaignSessionStore()
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

// The session (PV/Mana) steppers were previously unconditionally enabled
// whenever a participant session existed (the page-level forbidden guard
// already restricts viewers to the character's owner or an mj/admin).
// canEditSession mirrors that: true exactly when the session box would have
// rendered before this restructure, so VitruveSheet's steppers keep the
// same visibility as pre-WP02 — no permission regression.
const canEditSession = computed(() => Boolean(participant.value?.session))

// Owner or mj/admin may edit the Fiche's histoire and cycle Caractéristiques
// injury squares — same predicate shape as canEditInventory above, mirrored
// per WP03's instruction rather than inventing a new helper shape.
const canEditCharacter = computed(() => {
  const char = character.value
  const currentUser = authStore.user.value
  if (!char || !currentUser) return false
  return char.ownerUid === currentUser.uid || authStore.isMj.value || authStore.isAdmin.value
})

// Dés d'Aventure (FR-010): only mj/admin may adjust the shared counters —
// every other role sees a read-only readout (AdventureDiceBox renders no
// buttons at all when this is false, not merely disabled ones).
const canAdjustAdventureDice = computed(() => authStore.isMj.value || authStore.isAdmin.value)

// WP06: MJ-only raw-data editor trigger (FR-004). Kept as its own named
// predicate rather than reusing canAdjustAdventureDice — the two happen to
// share the same mj/admin rule today but gate unrelated features, and
// collapsing them into one name would make a future divergence (e.g. an
// admin-only raw editor) a silent behavior change instead of a one-line diff.
const canEditRawData = computed(() => authStore.isMj.value || authStore.isAdmin.value)

const tickState = useTickState()
const ficheError = ref('')
const caracError = ref('')
const advDisError = ref('')
const childError = ref('')

// Child characters (transformations, e.g. Furmiaou — FR-011/FR-015) of the
// currently displayed character, fetched alongside it in loadCharacter().
// Excluded from every roster surface (I-C2) but shown here as extra tabs.
const children = ref<CharacterProfile[]>([])

type VitruveTabKey = 'fiche' | 'carac' | 'dons' | 'inv' | string
const BASE_TAB_KEYS: VitruveTabKey[] = ['fiche', 'carac', 'dons', 'inv']
const activeTab = ref<VitruveTabKey>('fiche')
const vitruveTabs = computed<Array<{ key: VitruveTabKey; label: string }>>(() => [
  { key: 'fiche', label: 'Fiche' },
  { key: 'carac', label: 'Caractéristiques' },
  { key: 'dons', label: 'Dons' },
  { key: 'inv', label: 'Inventaire' },
  // One tab per child, labeled with the child's name (FR-011). No children
  // ⇒ no extra tabs (SC-004) — this spread is simply empty.
  ...children.value.map((child) => ({ key: child.id, label: child.name })),
])

// The child (if any) whose tab is currently active — null for the four base
// tabs. Drives both the ChildSheetTab render and the calculator context
// below; a single source of truth so the two can't drift into a "half
// switched" state (child attributes + parent injuries, the FR-016 bug the
// WP06 reviewer guidance calls out explicitly).
const activeChild = computed<CharacterProfile | null>(() => {
  if (BASE_TAB_KEYS.includes(activeTab.value)) return null
  return children.value.find((child) => child.id === activeTab.value) ?? null
})

const EMPTY_ATTRIBUTES: CharacterAttributes = {
  primary: { force: 0, social: 0, mental: 0 },
  secondary: { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 },
}

// Active-context for the jet calculator (FR-016): parent's attributes +
// injuries when a base tab is active, the active child's when a child tab is
// active — attributes AND injuries always switch together. `contextKey`
// changes whenever this switches (character OR tab), which JetCalculator
// uses to reset its local manual-mod/category state, and which the watcher
// below uses to reset the ticked-compétences sum.
const activeContext = computed(() => {
  const child = activeChild.value
  if (child) {
    return {
      attributes: child.attributes,
      injuries: participant.value?.childSessions?.[child.id]?.injuries,
      contextKey: child.id,
    }
  }
  return {
    attributes: character.value?.attributes ?? EMPTY_ATTRIBUTES,
    injuries: participant.value?.session.injuries,
    contextKey: characterId.value,
  }
})

watch(characterId, () => {
  activeTab.value = 'fiche'
})

// Stale child-tab fallback (spec edge case): if the character switched (or
// reloaded) and the active tab referenced a child that no longer exists in
// the freshly-fetched `children` list, fall back to Fiche rather than
// rendering nothing / a dead tab.
watch(children, (list) => {
  if (BASE_TAB_KEYS.includes(activeTab.value)) return
  if (!list.some((child) => child.id === activeTab.value)) {
    activeTab.value = 'fiche'
  }
})

// Ticks are ephemeral (research D-04): never leak between characters OR
// across a parent/child context switch (WP06 extends this from the
// character-only reset above to any contextKey change).
watch(
  () => activeContext.value.contextKey,
  () => {
    tickState.reset()
  },
)

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

// Posture (Focus/Offensif/Défensif) options, passed down to CaracTab so it
// doesn't duplicate this list; selecting one emits 'set-posture', handled
// below by the existing changePosture persistence.
const postureOptions: Array<{ value: Posture; label: string; tone: string }> = [
  { value: 'DEFENSIF', label: 'Défensif', tone: 'def' },
  { value: 'OFFENSIF', label: 'Offensif', tone: 'off' },
  { value: 'FOCUS', label: 'Focus', tone: 'focus' },
]

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

// Cycles a Caractéristiques injury square (saine → jaune → rouge → saine).
// Optimistic-update + revert-on-error, matching changeSessionResource /
// changePosture above. usePlayerStore().setInjury requires subscribeParty
// to have attached a campaign context first (enforced by the store itself,
// see usePlayerStore.spec.ts's "does nothing when subscribeParty has not
// been called" case) — loadCharacter below calls it for that reason.
async function handleSetInjury(attr: SecondaryAttributeName, state: InjuryState | null) {
  if (!participant.value || !campaignId.value || !characterId.value) return

  const previous = participant.value
  const nextInjuries = { ...previous.session.injuries }
  if (state === null) {
    delete nextInjuries[attr]
  } else {
    nextInjuries[attr] = state
  }
  participant.value = {
    ...previous,
    session: { ...previous.session, injuries: nextInjuries },
  }
  caracError.value = ''

  await playerStore.setInjury(characterId.value, attr, state)
  if (playerStore.error.value) {
    participant.value = previous
    caracError.value = playerStore.error.value ?? ''
  }
}

// A child with no childSessions entry yet has no vitals to read (CharacterProfile
// itself carries none — see ChildSheetTab.vue's FALLBACK_SESSION comment for why).
// This all-zero base is what the FIRST ± bootstraps from, so `base.hp + delta` is
// always a real number, never NaN.
const EMPTY_CHILD_SESSION: CharacterSessionState = {
  hp: 0,
  maxHp: 0,
  mana: 0,
  maxMana: 0,
  posture: 'FOCUS',
}

// PV ± on a child tab (FR-015): same optimistic-update + revert-on-error shape
// as changeSessionResource, but writes to the PARENT participant's
// childSessions.<childId>.* (setChildVitals), never a participant doc of its
// own (children have none — I-C2).
async function adjustChildHp(childId: string, delta: number) {
  if (!participant.value || !characterId.value) return

  const previous = participant.value
  const base = previous.childSessions?.[childId] ?? EMPTY_CHILD_SESSION
  const next = clampSessionValue('hp', base.hp + delta, base.maxHp)
  if (next === base.hp && previous.childSessions?.[childId]) return

  participant.value = {
    ...previous,
    childSessions: { ...previous.childSessions, [childId]: { ...base, hp: next } },
  }
  childError.value = ''

  await playerStore.setChildVitals(characterId.value, childId, { hp: next })
  if (playerStore.error.value) {
    participant.value = previous
    childError.value = playerStore.error.value ?? ''
  }
}

// Cycles a child's Caractéristiques injury square — same replace-map
// semantics (whole `injuries` object rewritten) as handleSetInjury, but
// scoped to childSessions.<childId>.injuries.
async function handleSetChildInjury(
  childId: string,
  attr: SecondaryAttributeName,
  state: InjuryState | null,
) {
  if (!participant.value || !characterId.value) return

  const previous = participant.value
  const base = previous.childSessions?.[childId] ?? EMPTY_CHILD_SESSION
  const nextInjuries = { ...base.injuries }
  if (state === null) {
    delete nextInjuries[attr]
  } else {
    nextInjuries[attr] = state
  }

  participant.value = {
    ...previous,
    childSessions: {
      ...previous.childSessions,
      [childId]: { ...base, injuries: nextInjuries },
    },
  }
  childError.value = ''

  await playerStore.setChildVitals(characterId.value, childId, { injuries: nextInjuries })
  if (playerStore.error.value) {
    participant.value = previous
    childError.value = playerStore.error.value ?? ''
  }
}

// Thin template-facing wrappers: ChildSheetTab's emits carry no childId (it
// only knows about the one child it renders), so these close over
// `activeChild` here rather than requiring the template to reference
// `activeChild.id` directly inside an inline handler expression (which
// vue-tsc can't narrow past the surrounding v-else-if's null check).
function handleChildAdjustHp(delta: number) {
  const child = activeChild.value
  if (!child) return
  adjustChildHp(child.id, delta)
}

function handleChildSetInjury(attr: SecondaryAttributeName, state: InjuryState | null) {
  const child = activeChild.value
  if (!child) return
  handleSetChildInjury(child.id, attr, state)
}

// Avantage/Désavantage toggles (FR-008): same optimistic-update + revert
// shape as handleSetInjury above — advantage/disadvantage live on the same
// CharacterSessionState, so they're gated by canEditSession (the predicate
// already governing every other field of that state, e.g. the PV/Mana
// steppers) rather than a new predicate. Out-of-map edit, sanctioned by
// WP04: AdvantageToggles/JetCalculator mount from VitruveSheet's `widgets`
// slot, wired here since PlayerView already owns the session mutation flow.
async function handleSetAdvantage(value: boolean) {
  if (!participant.value || !characterId.value) return

  const previous = participant.value
  participant.value = {
    ...previous,
    session: { ...previous.session, advantage: value },
  }
  advDisError.value = ''

  await playerStore.setAdvantage(characterId.value, value)
  if (playerStore.error.value) {
    participant.value = previous
    advDisError.value = playerStore.error.value ?? ''
  }
}

async function handleSetDisadvantage(value: boolean) {
  if (!participant.value || !characterId.value) return

  const previous = participant.value
  participant.value = {
    ...previous,
    session: { ...previous.session, disadvantage: value },
  }
  advDisError.value = ''

  await playerStore.setDisadvantage(characterId.value, value)
  if (playerStore.error.value) {
    participant.value = previous
    advDisError.value = playerStore.error.value ?? ''
  }
}

// Histoire save (FicheTab's save-histoire emit): owners may only write
// `backstory` per firestore.rules — updateCharacter(id, { backstory }) never
// sends extra fields, so this exercises that rule cleanly.
async function handleSaveHistoire(text: string) {
  if (!character.value || !characterId.value) return
  const previous = character.value
  character.value = { ...previous, backstory: text }
  ficheError.value = ''

  try {
    await updateCharacter(characterId.value, { backstory: text })
  } catch (err) {
    character.value = previous
    ficheError.value =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'histoire."
  }
}

async function loadCharacter() {
  if (!campaignId.value || !characterId.value) {
    character.value = null
    participant.value = null
    races.value = []
    classes.value = []
    children.value = []
    error.value = ''
    forbidden.value = false
    sessionError.value = ''
    sessionLoading.value = null
    ficheError.value = ''
    caracError.value = ''
    advDisError.value = ''
    childError.value = ''
    playerStore.unsubscribeParty()
    campaignSessionStore.unsubscribe()
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  forbidden.value = false
  sessionError.value = ''
  ficheError.value = ''
  caracError.value = ''
  advDisError.value = ''
  childError.value = ''
  playerStore.subscribeParty(campaignId.value)
  campaignSessionStore.subscribe(campaignId.value)

  try {
    const [char, participantRow, , raceList, classList, childList] = await Promise.all([
      getCharacterById(characterId.value),
      getParticipantByCharacterId(characterId.value, campaignId.value),
      inventoryStore.loadInventory(characterId.value, campaignId.value),
      listRacesByCampaign(campaignId.value),
      listClassesByCampaign(campaignId.value),
      listChildrenOf(campaignId.value, characterId.value),
    ])
    character.value = char
    participant.value = participantRow
    races.value = raceList
    classes.value = classList
    children.value = childList

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

// MJ/admin raw-data editor (FR-004): trigger lives in VitruveSheet's widgets
// slot (see template), gated by canEditRawData. On a successful save,
// loadCharacter() re-runs in full — the MJ may have just edited
// parentCharacterId (adding/removing a child relationship) or any other
// field, so a full reload keeps `character` AND `children` consistent
// instead of patching just one of them.
const rawEditorOpen = ref(false)

function openRawEditor() {
  rawEditorOpen.value = true
}

function closeRawEditor() {
  rawEditorOpen.value = false
}

async function handleRawEditorSaved() {
  rawEditorOpen.value = false
  await loadCharacter()
}

onBeforeUnmount(() => {
  playerStore.unsubscribeParty()
  campaignSessionStore.unsubscribe()
})
</script>

<template>
  <div class="player-view">
    <p v-if="loading">Chargement...</p>
    <p v-else-if="forbidden" class="error">Accès refusé.</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="character" class="vitruve-layout">
      <VitruveSheet
        :character="character"
        :participant="participant"
        :race-name="selectedRace?.n"
        :class-name="selectedClass?.n"
        :can-edit-session="canEditSession"
        :session-loading="sessionLoading"
        :session-error="sessionError"
        @adjust-hp="(delta) => changeSessionResource('hp', delta)"
        @adjust-mana="(delta) => changeSessionResource('mana', delta)"
      >
        <template #widgets>
          <JetCalculator
            :attributes="activeContext.attributes"
            :injuries="activeContext.injuries"
            :context-key="activeContext.contextKey"
          />
          <p v-if="advDisError" class="error">{{ advDisError }}</p>
          <AdvantageToggles
            :session="participant?.session ?? null"
            :can-edit="canEditSession"
            @set-advantage="handleSetAdvantage"
            @set-disadvantage="handleSetDisadvantage"
          />
          <PartyStatus :highlight-character-id="characterId" />
          <AdventureDiceBox :can-adjust="canAdjustAdventureDice" />
          <button
            v-if="canEditRawData"
            type="button"
            class="raw-editor-trigger"
            @click="openRawEditor"
          >
            Éditer les données brutes
          </button>
        </template>
      </VitruveSheet>

      <div class="vpanel">
        <div class="pchar-tabs" role="tablist">
          <button
            v-for="tab in vitruveTabs"
            :key="tab.key"
            type="button"
            role="tab"
            class="pchar-tab"
            :class="{ active: activeTab === tab.key }"
            :aria-selected="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="vpanel-content">
          <section v-if="activeTab === 'fiche'" class="tab-pane">
            <p v-if="ficheError" class="error">{{ ficheError }}</p>
            <FicheTab
              :character="character"
              :race-name="selectedRace?.n"
              :can-edit="canEditCharacter"
              @save-histoire="handleSaveHistoire"
            />
          </section>

          <section v-else-if="activeTab === 'carac'" class="tab-pane">
            <p v-if="caracError" class="error">{{ caracError }}</p>
            <CaracTab
              :character="character"
              :session="participant?.session ?? null"
              :can-edit="canEditCharacter"
              :race="selectedRace"
              :posture-options="postureOptions"
              :session-loading="sessionLoading"
              @set-injury="handleSetInjury"
              @set-posture="changePosture"
            />
          </section>

          <section v-else-if="activeTab === 'dons'" class="tab-pane">
            <h2>Dons</h2>
            <DonList :gifts="character.gifts" @open="openDonModal" />
          </section>

          <section v-else-if="activeTab === 'inv'" class="tab-pane">
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

            <h2>Sac à dos</h2>
            <BackpackGrid
              :items="backpackItems"
              :editable="canEditInventory"
              @slot-click="openBackpackSlot"
            />
          </section>

          <section v-else-if="activeChild" class="tab-pane">
            <p v-if="childError" class="error">{{ childError }}</p>
            <ChildSheetTab
              :child="activeChild"
              :child-session="participant?.childSessions?.[activeChild.id] ?? null"
              :can-edit="canEditCharacter"
              @adjust-hp="handleChildAdjustHp"
              @set-injury="handleChildSetInjury"
            />
          </section>
        </div>
      </div>
    </div>

    <p v-else>Personnage introuvable.</p>

    <RawCharacterEditor
      v-if="character"
      :character="character"
      :open="rawEditorOpen"
      @close="closeRawEditor"
      @saved="handleRawEditorSaved"
    />

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
}
.error {
  color: #ffb0b0;
}
.raw-editor-trigger {
  width: 100%;
  margin-top: 4px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px dashed rgba(212, 168, 67, 0.35);
  background: none;
  color: #a89a7c;
  font-size: 0.82rem;
  cursor: pointer;
}
.raw-editor-trigger:hover {
  color: #f0c96a;
  border-color: #d4a843;
}

/* Two-column vitruve layout (FR-001): fixed left sheet + flexible right
   tabbed panel. `min-width: 0` on both grid children stops long content
   (e.g. inventory grids) from blowing out the track — legacy does this for
   the same reason (see legacy-reference/index.html's `.vitruve-layout > *`). */
.vitruve-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
  min-width: 0;
}
.vitruve-layout > * {
  min-width: 0;
}

.vpanel {
  background: linear-gradient(160deg, rgba(35, 25, 10, 0.98), rgba(22, 16, 8, 0.99));
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: 8px;
  padding: 1.1rem;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}
.pchar-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.18);
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.pchar-tab {
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  color: #a09070;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.pchar-tab:hover {
  color: #f2e6cc;
}
.pchar-tab.active {
  color: #f0c96a;
  border-bottom-color: #f0c96a;
}
.vpanel-content {
  flex: 1;
}
.tab-pane h2 {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0.75rem 0 0.5rem;
}
.tab-pane h2:first-child {
  margin-top: 0;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 1rem;
}
.weapon-armor-grid {
  align-items: start;
}

@media (max-width: 767px) {
  .vitruve-layout {
    grid-template-columns: 1fr;
  }

  .weapon-armor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
