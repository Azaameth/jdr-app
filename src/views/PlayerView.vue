<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BackpackGrid from '../components/BackpackGrid.vue'
import DonDetailModal from '../components/DonDetailModal.vue'
import DonList from '../components/DonList.vue'
import InventorySlotModal, {
  type InventorySlotContext,
  type InventorySlotDeletePayload,
  type InventorySlotMovePayload,
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
import { useCampaignRulesStore } from '../controllers/useCampaignRulesStore'
import { useCampaignSessionStore } from '../controllers/useCampaignSessionStore'
import { useEquipmentStore } from '../controllers/useEquipmentStore'
import { usePlayerStore } from '../controllers/usePlayerStore'
import {
  getCharacterByCampaign,
  listChildrenOf,
  updateCharacter,
} from '../models/repositories/CharacterRepository'
import {
  getCharacterState,
  type CharacterStateDocument,
} from '../models/repositories/CharacterStateRepository'
import type { GearEntry } from '../models/repositories/EquipmentRepository'
import type { BagItemDocument } from '../models/repositories/ItemRepository'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import { computeEffectiveStat } from '../utils/effectiveStats'
import type { CharacterAttributes, CharacterGift, CharacterProfile } from '../models/types/Character'
import type { Class } from '../models/types/Class'
import type { InjuryState, Posture, SecondaryAttributeName } from '../models/types/Participant'
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
const equipmentStore = useEquipmentStore()
const campaignRulesStore = useCampaignRulesStore()
const campaignId = computed(() => props.campaignId ?? (route.params.id as string))
const characterId = computed(() => props.characterId ?? (route.params.characterId as string))

const character = ref<CharacterProfile | null>(null)
// Live combat state for the displayed character, keyed off its own
// Campaigns/{id}/Characters/{id}/States/Current doc (NEXTSTEPS.md Cluster
// 3b) — optimistically patched on write, kept in sync with the shared
// party-wide live listener below (same shape as the old `participant` ref).
const characterState = ref<CharacterStateDocument | null>(null)
// Live state for whichever child (transformation) tab is active, if any —
// each child is its own Character doc with its own States/Current, so this
// is populated the same way as `characterState`, just for a different id.
const childState = ref<CharacterStateDocument | null>(null)
const equipment = computed(() => equipmentStore.equipment.value)
const weapons = computed(() => equipment.value.Weapons)
const armor = computed(() => equipment.value.Armor)
const backpackItems = computed(() => equipmentStore.items.value)
const equippedItems = computed(() => [...weapons.value, ...armor.value])
const effectiveMaxHp = computed(() =>
  computeEffectiveStat(characterState.value?.Health ?? 0, equippedItems.value, 'Health'),
)
const effectiveMaxMana = computed(() =>
  computeEffectiveStat(characterState.value?.Mana ?? 0, equippedItems.value, 'Mana'),
)
const races = ref<Race[]>([])
const classes = ref<Class[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const sessionLoading = ref<'hp' | 'mana' | 'posture' | null>(null)
const sessionError = ref('')

// The session (PV/Mana) steppers were previously unconditionally enabled
// whenever a participant session existed (the page-level forbidden guard
// already restricts viewers to the character's owner or an mj/admin).
// canEditSession mirrors that: true exactly when the session box would have
// rendered before this restructure, so VitruveSheet's steppers keep the
// same visibility as pre-WP02 — no permission regression.
const canEditSession = computed(() => Boolean(characterState.value))

// Owner or mj/admin may edit the Fiche's histoire, cycle Caractéristiques
// injury squares, and edit the equipment/inventory tab — firestore.rules'
// Equipment/Main and Items write rules key off the CHARACTER doc's PlayerId
// (ownsThisCharacter()), not anything on the equipment doc itself, so one
// predicate covers all three.
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

// Child characters (transformations) are shown in dedicated tabs but stay out
// of the roster surfaces.
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

// Keep the active child and the active tab in a single source of truth so the
// calculator and the child sheet always stay in sync.
const activeChild = computed<CharacterProfile | null>(() => {
  if (BASE_TAB_KEYS.includes(activeTab.value)) return null
  return children.value.find((child) => child.id === activeTab.value) ?? null
})

// Child equipment is read from the child-specific equipment cache, never from
// the parent's singleton equipment.
const activeChildEquipment = computed<GearEntry[]>(() => {
  const child = activeChild.value
  if (!child) return []
  const doc = equipmentStore.childEquipment.value[child.id]
  if (!doc) return []
  return [...doc.Weapons, ...doc.Armor]
})

const activeChildEffectiveMaxHp = computed(() => {
  const child = activeChild.value
  if (!child) return null
  const base = childState.value ?? EMPTY_CHILD_STATE
  return computeEffectiveStat(base.Health, activeChildEquipment.value, 'Health')
})

const EMPTY_ATTRIBUTES: CharacterAttributes = {
  primary: { force: 0, social: 0, mental: 0 },
  secondary: { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 },
}

// The calculator context follows the active tab. Parent and child contexts are
// kept together so attributes and injuries always switch in sync.
const activeContext = computed(() => {
  const child = activeChild.value
  if (child) {
    return {
      attributes: child.attributes,
      injuries: childState.value?.Injuries,
      contextKey: child.id,
    }
  }
  return {
    attributes: character.value?.attributes ?? EMPTY_ATTRIBUTES,
    injuries: characterState.value?.Injuries,
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

function openBackpackSlot(item?: BagItemDocument) {
  if (!canEditCharacter.value) return
  slotModalContext.value = { kind: 'bag', item }
  slotModalOpen.value = true
}

function openEquipmentSlot(payload: { kind: 'Armor' | 'Weapons'; item?: GearEntry }) {
  if (!canEditCharacter.value) return
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
    payload.kind === 'bag'
      ? await equipmentStore.saveBagItem(payload.item)
      : await equipmentStore.saveEquippedItem(payload.kind, payload.item)

  // On failure (e.g. slot-cap rejection), keep the modal open so the French
  // error surfaced by the store is visible via `errorMessage`.
  if (success) {
    closeSlotModal()
  }
}

async function handleUpdateCurrency(value: number) {
  await equipmentStore.setCurrency(value)
}

async function handleSlotDelete(payload: InventorySlotDeletePayload) {
  const success =
    payload.kind === 'bag'
      ? await equipmentStore.removeBagItem(payload.entryId)
      : await equipmentStore.removeEquippedItem(payload.kind, payload.entryId)

  if (success) {
    closeSlotModal()
  }
}

async function handleSlotMove(payload: InventorySlotMovePayload) {
  const success =
    payload.direction === 'equip'
      ? await equipmentStore.equip(payload.kind, payload.entryId)
      : await equipmentStore.unequip(payload.kind, payload.entryId)

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
    races.value.find((race) => race.DisplayName.trim().toLowerCase() === normalized) ??
    null
  )
})

const selectedClass = computed(() => {
  const classId = character.value?.classId
  if (!classId) return null
  const normalized = classId.trim().toLowerCase()
  return (
    classes.value.find((klass) => klass.id === classId) ??
    classes.value.find((klass) => klass.DisplayName.trim().toLowerCase() === normalized) ??
    null
  )
})

// The legacy sheet displayed the raw stored raceId/classId strings; keep that
// behavior when the id doesn't resolve against the campaign collections.
const raceDisplayName = computed(() => selectedRace.value?.DisplayName ?? character.value?.raceId)
const classDisplayName = computed(
  () => selectedClass.value?.DisplayName ?? character.value?.classId,
)

function clampSessionValue(resource: 'hp' | 'mana', value: number, max: number) {
  const boundedMax = Math.max(0, max)
  if (resource === 'hp') {
    return Math.max(-boundedMax, Math.min(Math.trunc(value), boundedMax))
  }
  return Math.max(0, Math.min(Math.trunc(value), boundedMax))
}

async function changeSessionResource(resource: 'hp' | 'mana', delta: number) {
  if (!characterState.value || !campaignId.value || !characterId.value) return
  if (sessionLoading.value) return

  const current = resource === 'hp' ? characterState.value.HealthCurrent : characterState.value.ManaCurrent
  const max = resource === 'hp' ? effectiveMaxHp.value : effectiveMaxMana.value
  const next = clampSessionValue(resource, current + delta, max)
  if (next === current) return

  const previous = characterState.value
  const field = resource === 'hp' ? 'HealthCurrent' : 'ManaCurrent'
  characterState.value = { ...previous, [field]: next }

  sessionLoading.value = resource
  sessionError.value = ''

  try {
    const updated = await playerStore.setSessionResource(
      campaignId.value,
      characterId.value,
      resource,
      next,
      max,
    )
    if (!updated) {
      throw new Error('Impossible de mettre a jour la session du personnage.')
    }
    characterState.value = updated
  } catch (err) {
    characterState.value = previous
    sessionError.value =
      err instanceof Error ? err.message : 'Erreur lors de la mise a jour de la session.'
  } finally {
    sessionLoading.value = null
  }
}

// Unequipping a stat-bonus item can drop the effective max below the current
// stored value (e.g. current mana 8 with a +4 ring, unequip it → max drops to
// 4). Only ever pulls current DOWN to the new ceiling — a max increase (e.g.
// re-equipping) never bumps current back up on its own; that still requires
// an explicit + click, same as before this watcher existed.
watch(effectiveMaxHp, (newMax, oldMax) => {
  if (newMax >= oldMax) return
  const state = characterState.value
  if (!state || state.HealthCurrent <= newMax) return
  void changeSessionResource('hp', newMax - state.HealthCurrent)
})
watch(effectiveMaxMana, (newMax, oldMax) => {
  if (newMax >= oldMax) return
  const state = characterState.value
  if (!state || state.ManaCurrent <= newMax) return
  void changeSessionResource('mana', newMax - state.ManaCurrent)
})

async function changePosture(posture: Posture) {
  if (!characterState.value || !campaignId.value || !characterId.value) return
  if (sessionLoading.value) return
  if (characterState.value.Posture === posture) return

  const previous = characterState.value
  characterState.value = { ...previous, Posture: posture }

  sessionLoading.value = 'posture'
  sessionError.value = ''

  try {
    const updated = await playerStore.setSessionPosture(
      campaignId.value,
      characterId.value,
      posture,
    )
    if (!updated) {
      throw new Error('Impossible de mettre a jour la posture du personnage.')
    }
    characterState.value = updated
  } catch (err) {
    characterState.value = previous
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
  if (!characterState.value || !campaignId.value || !characterId.value) return

  const previous = characterState.value
  const nextInjuries = { ...previous.Injuries }
  if (state === null) {
    delete nextInjuries[attr]
  } else {
    nextInjuries[attr] = state
  }
  characterState.value = { ...previous, Injuries: nextInjuries }
  caracError.value = ''

  await playerStore.setInjury(characterId.value, attr, state)
  if (playerStore.error.value) {
    characterState.value = previous
    caracError.value = playerStore.error.value ?? ''
  }
}

// A child with no States/Current doc yet has no vitals to read (see
// ChildSheetTab.vue's FALLBACK_STATE comment for why). This all-zero base is
// what the FIRST ± bootstraps from, so `base.HealthCurrent + delta` is always
// a real number, never NaN.
const EMPTY_CHILD_STATE: CharacterStateDocument = {
  Health: 0,
  HealthCurrent: 0,
  Mana: 0,
  ManaCurrent: 0,
  Posture: 'FOCUS',
  PlayerId: '',
  CampaignId: '',
}

// PV ± on a child tab (FR-015): same optimistic-update + revert-on-error shape
// as changeSessionResource, but writes to the CHILD'S OWN States/Current doc
// (Cluster 3b) via the same generic setSessionResource used for the main
// character — a child needs no dedicated write path, since it's just another
// Character with its own live state.
async function adjustChildHp(childId: string, delta: number) {
  if (!campaignId.value) return

  const previous = childState.value ?? EMPTY_CHILD_STATE
  const childDoc = equipmentStore.childEquipment.value[childId]
  const childEquipment = childDoc ? [...childDoc.Weapons, ...childDoc.Armor] : []
  const maxHp = computeEffectiveStat(previous.Health, childEquipment, 'Health')
  const next = clampSessionValue('hp', previous.HealthCurrent + delta, maxHp)
  if (next === previous.HealthCurrent && childState.value) return

  childState.value = { ...previous, HealthCurrent: next }
  childError.value = ''

  const updated = await playerStore.setSessionResource(campaignId.value, childId, 'hp', next, maxHp)
  if (!updated || playerStore.error.value) {
    childState.value = previous
    childError.value = playerStore.error.value ?? 'Erreur lors de la mise a jour du personnage.'
  }
}

// Same "only pull current down, never bump it up" rule as the parent's HP/Mana
// watchers above, for whichever child tab is currently active.
watch(activeChildEffectiveMaxHp, (newMax, oldMax) => {
  const child = activeChild.value
  if (!child || newMax === null || oldMax === null || newMax >= oldMax) return
  const base = childState.value
  if (!base || base.HealthCurrent <= newMax) return
  void adjustChildHp(child.id, newMax - base.HealthCurrent)
})

// Cycles a child's Caractéristiques injury square — same replace-map
// semantics (whole `Injuries` object rewritten) as handleSetInjury, but
// against the child's own States/Current doc via the same generic setInjury.
async function handleSetChildInjury(
  childId: string,
  attr: SecondaryAttributeName,
  state: InjuryState | null,
) {
  const previous = childState.value ?? EMPTY_CHILD_STATE
  const nextInjuries = { ...previous.Injuries }
  if (state === null) {
    delete nextInjuries[attr]
  } else {
    nextInjuries[attr] = state
  }

  childState.value = { ...previous, Injuries: nextInjuries }
  childError.value = ''

  await playerStore.setInjury(childId, attr, state)
  if (playerStore.error.value) {
    childState.value = previous
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
// CharacterStateDocument, so they're gated by canEditSession (the predicate
// already governing every other field of that state, e.g. the PV/Mana
// steppers) rather than a new predicate. Out-of-map edit, sanctioned by
// WP04: AdvantageToggles/JetCalculator mount from VitruveSheet's `widgets`
// slot, wired here since PlayerView already owns the session mutation flow.
async function handleSetAdvantage(value: boolean) {
  if (!characterState.value || !characterId.value) return

  const previous = characterState.value
  characterState.value = { ...previous, Advantage: value }
  advDisError.value = ''

  await playerStore.setAdvantage(characterId.value, value)
  if (playerStore.error.value) {
    characterState.value = previous
    advDisError.value = playerStore.error.value ?? ''
  }
}

async function handleSetDisadvantage(value: boolean) {
  if (!characterState.value || !characterId.value) return

  const previous = characterState.value
  characterState.value = { ...previous, Disadvantage: value }
  advDisError.value = ''

  await playerStore.setDisadvantage(characterId.value, value)
  if (playerStore.error.value) {
    characterState.value = previous
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
    characterState.value = null
    childState.value = null
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
    equipmentStore.unsubscribe()
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
  equipmentStore.subscribe(campaignId.value, characterId.value)

  try {
    const [char, stateRow, , raceList, classList, childList] = await Promise.all([
      getCharacterByCampaign(campaignId.value, characterId.value),
      getCharacterState(campaignId.value, characterId.value),
      campaignRulesStore.fetchCampaignRules(campaignId.value),
      listRacesByCampaign(campaignId.value),
      listClassesByCampaign(campaignId.value),
      listChildrenOf(campaignId.value, characterId.value),
    ])
    character.value = char
    // Prefer the live snapshot row if the party subscription already delivered
    // one — the one-shot fetch may resolve after a fresher snapshot.
    characterState.value = playerStore.partyCharacterStates.value[characterId.value] ?? stateRow
    races.value = raceList
    classes.value = classList
    children.value = childList
    await equipmentStore.loadChildEquipment(
      childList.map((c) => c.id),
      campaignId.value,
    )

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

// The displayed sheet (vitals pills, injuries, avantage/désavantage, child
// state) must stay live for remote viewers too, not just État du groupe: feed
// `characterState`/`childState` from the party-wide live listener that
// subscribeParty already attached (one per character in the campaign) — no
// extra listener involved.
watch(
  () => playerStore.partyCharacterStates.value,
  (map) => {
    if (forbidden.value) return
    const live = map[characterId.value]
    if (live) characterState.value = live
    const child = activeChild.value
    if (child) {
      const liveChild = map[child.id]
      if (liveChild) childState.value = liveChild
    }
  },
)

// Populate/refresh the active child's live state whenever the active tab
// switches to a different child — mirrors loadCharacter's own "prefer the
// live snapshot, fall back to a one-shot fetch" pattern exactly, rather than
// depending solely on subscribeParty's per-character listener already having
// delivered a snapshot for this specific child (its subscribe call is
// idempotent per campaignId, so a child added after the initial subscription
// wouldn't otherwise get a listener attached at all).
watch(
  activeChild,
  async (child) => {
    if (!child || !campaignId.value) {
      childState.value = null
      return
    }
    const live = playerStore.partyCharacterStates.value[child.id]
    childState.value = live ?? (await getCharacterState(campaignId.value, child.id))
  },
  { immediate: true },
)

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
  equipmentStore.unsubscribe()
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
        :state="characterState"
        :race-name="raceDisplayName"
        :class-name="classDisplayName"
        :can-edit-session="canEditSession"
        :session-loading="sessionLoading"
        :session-error="sessionError"
        :equipment="[...weapons, ...armor]"
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
            :state="characterState"
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
              :race-name="raceDisplayName"
              :can-edit="canEditCharacter"
              @save-histoire="handleSaveHistoire"
            />
          </section>

          <section v-else-if="activeTab === 'carac'" class="tab-pane">
            <p v-if="caracError" class="error">{{ caracError }}</p>
            <CaracTab
              :character="character"
              :state="characterState"
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
                kind="Weapons"
                :items="weapons"
                :max-slots="campaignRulesStore.maxWeaponSlots.value"
                :editable="canEditCharacter"
                @slot-click="openEquipmentSlot"
              />
              <WeaponArmorList
                title="Armures & Protections"
                kind="Armor"
                :items="armor"
                :max-slots="campaignRulesStore.maxArmorSlots.value"
                :editable="canEditCharacter"
                @slot-click="openEquipmentSlot"
              />
            </div>

            <h2>Sac à dos</h2>
            <BackpackGrid
              :items="backpackItems"
              :max-items="campaignRulesStore.maxItems.value"
              :currency="equipment.Currency"
              :editable="canEditCharacter"
              @slot-click="openBackpackSlot"
              @update-currency="handleUpdateCurrency"
            />
          </section>

          <section v-else-if="activeChild" class="tab-pane">
            <p v-if="childError" class="error">{{ childError }}</p>
            <ChildSheetTab
              :child="activeChild"
              :state="childState"
              :can-edit="canEditCharacter"
              :equipment="activeChildEquipment"
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
      :error-message="equipmentStore.error.value"
      @close="closeSlotModal"
      @save="handleSlotSave"
      @delete="handleSlotDelete"
      @move="handleSlotMove"
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
