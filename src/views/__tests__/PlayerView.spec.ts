import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../models/types/Character'
import type { Participant } from '../../models/types/Participant'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'
import type { CharacterEquipmentDocument, GearEntry } from '../../models/repositories/EquipmentRepository'
import type { BagItemDocument } from '../../models/repositories/ItemRepository'
import type { User } from '../../models/types/User'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'campaign-1', characterId: 'char-1' } }),
  }
})

const mockAuthState = vi.fn<() => ReturnType<typeof makeAuthStore>>()
vi.mock('../../controllers/useAuthStore', () => ({
  useAuthStore: () => mockAuthState(),
}))

const mockEquipmentState = vi.fn<() => ReturnType<typeof makeEquipmentStore>>()
vi.mock('../../controllers/useEquipmentStore', () => ({
  useEquipmentStore: () => mockEquipmentState(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  getCharacterByCampaign: vi.fn<() => Promise<CharacterProfile | null>>(async () => currentCharacter),
  updateCharacter: vi.fn<() => Promise<void>>(async () => {}),
  // usePlayerStore().subscribeParty (needed for a live campaign context) calls
  // listCharactersByCampaign internally to attach one States/Current listener
  // per character — return the displayed character AND its children, mirroring
  // what the real nested Characters collection would contain.
  listCharactersByCampaign: vi.fn<() => Promise<CharacterProfile[]>>(async () =>
    [currentCharacter, ...currentChildren].filter((c): c is CharacterProfile => c !== null),
  ),
  // WP06: loadCharacter() now also fetches the displayed character's children
  // (Furmiaou-style transformations) alongside it — default to none so every
  // pre-existing test in this file (none of which are about children) keeps
  // seeing exactly the four base tabs.
  listChildrenOf: vi.fn<() => Promise<CharacterProfile[]>>(async () => currentChildren),
}))
// Hoisted (vi.mock factories run before top-level const declarations, per
// Vitest's hoisting rules) so tests can assert the exact characterId/fields
// updateCharacterState was called with, and push a live state update the way
// Firestore's onSnapshot would (captured per characterId, never auto-invoked
// except when a test explicitly does so — mirroring how the pre-3b file kept
// the participants-snapshot capture from leaking stale data across tests).
const { stateCallbacks, mockUpdateCharacterState } = vi.hoisted(() => ({
  stateCallbacks: {} as Record<string, ((state: CharacterStateDocument | null) => void) | undefined>,
  mockUpdateCharacterState: vi.fn<() => Promise<void>>(async () => {}),
}))
vi.mock('../../models/repositories/CharacterStateRepository', () => ({
  getCharacterState: vi.fn<
    (campaignId: string, characterId: string) => Promise<CharacterStateDocument | null>
  >(async (_campaignId, characterId) => currentStates[characterId] ?? null),
  subscribeCharacterState: vi.fn<
    (
      campaignId: string,
      characterId: string,
      onChange: (state: CharacterStateDocument | null) => void,
    ) => () => void
  >((_campaignId, characterId, onChange) => {
    stateCallbacks[characterId] = onChange
    return () => {
      stateCallbacks[characterId] = undefined
    }
  }),
  updateCharacterState: mockUpdateCharacterState,
}))
vi.mock('../../models/repositories/ParticipantRepository', () => ({
  // usePlayerStore().subscribeParty attaches this live listener too (it feeds
  // PartyStatus, mounted for real inside VitruveSheet's widgets slot) — no
  // test in this file needs it to deliver anything beyond an empty roster.
  subscribeParticipantsByCampaign: vi.fn<
    (campaignId: string, onChange: (list: Participant[]) => void) => () => void
  >((_campaignId, onChange) => {
    onChange([])
    return () => {}
  }),
}))
vi.mock('../../models/repositories/ClassRepository', () => ({
  listClassesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))
vi.mock('../../models/repositories/RaceRepository', () => ({
  listRacesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))
// loadCharacter() also fetches CampaignRules (for MaxItems/MaxArmorSlots/
// MaxWeaponSlots caps) — avoid a real Firestore network call.
vi.mock('../../models/repositories/CampaignRulesRepository', () => ({
  getCampaignRules: vi.fn<() => Promise<null>>(async () => null),
}))

import PlayerView from '../PlayerView.vue'
import { usePlayerStore } from '../../controllers/usePlayerStore'
import CaracTab from '../../components/vitruve/CaracTab.vue'
import ChildSheetTab from '../../components/vitruve/ChildSheetTab.vue'
import FicheTab from '../../components/vitruve/FicheTab.vue'
import JetCalculator from '../../components/vitruve/JetCalculator.vue'
import RawCharacterEditor from '../../components/vitruve/RawCharacterEditor.vue'
import VitruveSheet from '../../components/vitruve/VitruveSheet.vue'

function makeAuthStore(user: User | null) {
  return {
    user: computed(() => user),
    loading: computed(() => false),
    error: computed(() => null),
    authReady: computed(() => true),
    isAuthenticated: computed(() => Boolean(user)),
    isAdmin: computed(() => user?.role === 'admin'),
    isMj: computed(() => user?.role === 'mj'),
    isPlayer: computed(() => user?.role === 'joueur'),
    signInWithGoogle: vi.fn<() => void>(),
    signOut: vi.fn<() => void>(),
  }
}

function makeEquipmentStore(
  equipment: CharacterEquipmentDocument,
  items: BagItemDocument[] = [],
  childEquipmentMap?: Record<string, CharacterEquipmentDocument>,
) {
  // `errorRef` backs the `error` computed so tests covering the T016 save/delete
  // wiring (review cycle 1 feedback) can flip the store's error mid-test via
  // `setError`, mirroring how the real store sets `error.value` inside a
  // rejected save/remove call — the mocked methods below default to success
  // but individual tests may `.mockImplementation(...)` them to call `setError`
  // and return `false` to exercise the failure branch.
  const errorRef = ref<string | null>(null)
  // Reactive so tests can mutate equipment mid-test (e.g. simulate an
  // unequip) and observe PlayerView's effective-max watchers react, the same
  // way saveEquippedItem/removeEquippedItem mutate the real store's ref.
  const equipmentRef = ref<CharacterEquipmentDocument>(equipment)
  const itemsRef = ref<BagItemDocument[]>(items)
  return {
    equipment: computed(() => equipmentRef.value),
    items: computed(() => itemsRef.value),
    // WP02: mirrors the real store's childEquipment cache — defaults to `{}`
    // so every pre-existing single-argument call site keeps working unchanged.
    childEquipment: computed(() => childEquipmentMap ?? {}),
    error: computed(() => errorRef.value),
    subscribe: vi.fn<() => void>(),
    unsubscribe: vi.fn<() => void>(),
    loadChildEquipment: vi.fn<() => Promise<void>>(async () => {}),
    saveBagItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeBagItem: vi.fn<() => Promise<boolean>>(async () => true),
    saveEquippedItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeEquippedItem: vi.fn<() => Promise<boolean>>(async () => true),
    equip: vi.fn<() => Promise<boolean>>(async () => true),
    unequip: vi.fn<() => Promise<boolean>>(async () => true),
    setCurrency: vi.fn<() => Promise<boolean>>(async () => true),
    setError: (message: string | null) => {
      errorRef.value = message
    },
    setEquipment: (next: CharacterEquipmentDocument) => {
      equipmentRef.value = next
    },
  }
}

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-1',
    campaignId: 'campaign-1',
    ownerUid: 'owner-uid',
    name: 'Test Héros',
    raceId: 'r1',
    classId: 'c1',
    gender: 'Homme',
    elements: [],
    level: 1,
    attributes: {
      primary: { force: 1, social: 1, mental: 1 },
      secondary: { puissance: 1, finesse: 1, aura: 1, relation: 1, instinct: 1, savoir: 1 },
    },
    skills: [],
    gifts: [],
    languages: [],
    img: '',
    backstory: '',
    ...overrides,
  }
}

function makeEquipment(overrides: Partial<CharacterEquipmentDocument> = {}): CharacterEquipmentDocument {
  return {
    Armor: [],
    Weapons: [],
    Currency: 0,
    PlayerId: 'owner-uid',
    CampaignId: 'campaign-1',
    ...overrides,
  }
}

function makeState(overrides: Partial<CharacterStateDocument> = {}): CharacterStateDocument {
  return {
    Health: 10,
    HealthCurrent: 10,
    Mana: 5,
    ManaCurrent: 5,
    Posture: 'FOCUS',
    PlayerId: 'owner-uid',
    CampaignId: 'campaign-1',
    ...overrides,
  }
}

// The mocked CharacterRepository reads this module-level fixture.
let currentCharacter: CharacterProfile | null = null
// WP06: children of `currentCharacter`, read by the mocked listChildrenOf.
let currentChildren: CharacterProfile[] = []
// Live combat state per characterId (base character AND any children), read
// by the mocked getCharacterState/subscribeCharacterState — mirrors each
// character's own Campaigns/{id}/Characters/{id}/States/Current doc.
let currentStates: Record<string, CharacterStateDocument | undefined> = {}

// Dons/Inventaire now live behind the vitruve tab host (WP02) instead of
// always-rendered sections — tests that assert on their content must select
// the tab first, exactly as a real user would click it.
async function selectTab(wrapper: ReturnType<typeof mount>, label: string) {
  const tab = wrapper.findAll('.pchar-tab').find((candidate) => candidate.text() === label)
  if (!tab) throw new Error(`tab "${label}" not found`)
  await tab.trigger('click')
  await flushPromises()
}

// usePlayerStore's party subscription is a real singleton (module-scope
// state), idempotent per campaignId — every test in this file mounts
// PlayerView with the same 'campaign-1', so without an explicit reset the
// FIRST test to establish the subscription would "win" for every later test,
// and `partyCharacterStates` (preferred over the one-shot fetch in
// PlayerView's loadCharacter) would keep serving stale data. Mirrors what
// PlayerView's own onBeforeUnmount already does on a real unmount.
afterEach(() => {
  usePlayerStore().unsubscribeParty()
})

describe('PlayerView — inventory slot editing permissions (T015/T017)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentStates = {}
  })

  it('grants edit affordances to the inventory owner (joueur, own character)', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.find('.error').exists()).toBe(false)
    await selectTab(wrapper, 'Inventaire')
    // BackpackGrid/WeaponArmorList receive editable=true → slots render as real buttons.
    const slotButtons = wrapper.findAll('.backpack-grid .slot')
    expect(slotButtons.length).toBeGreaterThan(0)
    for (const slot of slotButtons) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('grants edit affordances to an mj viewing another player’s character', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'mj-uid', displayName: 'MJ', email: '', photoURL: '', role: 'mj' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const slotButtons = wrapper.findAll('.backpack-grid .slot')
    expect(slotButtons.length).toBeGreaterThan(0)
    for (const slot of slotButtons) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('denies edit affordances (and view access entirely) for a joueur viewing another character', async () => {
    currentCharacter = makeCharacter({ ownerUid: 'someone-else' })
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'someone-else' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Accès refusé')
    expect(wrapper.find('.backpack-grid').exists()).toBe(false)
  })
})

// Review cycle 1 finding: `handleSlotSave`/`handleSlotDelete` (T016) had no
// coverage of the actual store-integration path — only the errorMessage
// *display* was tested in isolation (InventorySlotModal.spec.ts) and only
// permission gating was tested here. These cases mount PlayerView, drive a
// real slot-click → modal → submit/delete round trip, and assert the correct
// useEquipmentStore method is invoked with the right payload and that the
// modal opens/closes/stays-open correctly on success/failure.
describe('PlayerView — equipment slot save/delete store integration (T016, review cycle 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentStates = {}
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
  }

  function findWeaponArmorList(wrapper: ReturnType<typeof mount>, title: string) {
    const list = wrapper
      .findAll('.weapon-armor-list')
      .find((candidate) => candidate.find('.list-title').text() === title)
    if (!list) throw new Error(`weapon/armor list "${title}" not found`)
    return list
  }

  function firstSlot(container: ReturnType<typeof findWeaponArmorList>) {
    const slot = container.findAll('.slot')[0]
    if (!slot) throw new Error('expected at least one .slot element')
    return slot
  }

  it('opens the modal via slot-click, calls saveBagItem with the right payload, and closes on success', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' }), [])
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const backpackSlot = wrapper.findAll('.backpack-grid .slot')[0]
    if (!backpackSlot) throw new Error('expected at least one backpack slot')
    await backpackSlot.trigger('click')
    await flushPromises()
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(true)

    await wrapper.find('#inv-slot-name').setValue('Silex')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveBagItem).toHaveBeenCalledWith({
      EntryId: undefined,
      DisplayName: 'Silex',
      Quantity: 1,
    })
    // Success → modal closes (both `open` and `context` reset in PlayerView).
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('commits a currency input edit by calling equipmentStore.setCurrency with the parsed value', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid', Currency: 10 }))
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const currencyInput = wrapper.find('.currency-input')
    await currencyInput.setValue('75')
    await currencyInput.trigger('blur')
    await flushPromises()

    expect(store.setCurrency).toHaveBeenCalledWith(75)
  })

  it('opens the modal for an equipment slot, calls saveEquippedItem with the parsed payload, and closes on success', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' }))
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const weaponSlot = firstSlot(findWeaponArmorList(wrapper, 'Armes'))
    await weaponSlot.trigger('click')
    await flushPromises()
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(true)

    await wrapper.find('#inv-slot-name').setValue('Épée courte')
    await wrapper.find('.bonus-add').trigger('click')
    await wrapper.find('.bonus-stat').setValue('PhysicalAttack')
    await wrapper.find('.bonus-amount').setValue('3')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveEquippedItem).toHaveBeenCalledWith('Weapons', {
      EntryId: undefined,
      DisplayName: 'Épée courte',
      BonusRaw: { PhysicalAttack: 3 },
    })
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('calls removeBagItem on delete and closes the modal on success', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' }), [
      {
        EntryId: 'item-1',
        DisplayName: 'Ration',
        Quantity: 1,
        PlayerId: 'owner-uid',
        CampaignId: 'campaign-1',
      },
    ])
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const filledSlot = wrapper.find('.backpack-grid .slot:not(.slot-empty)')
    await filledSlot.trigger('click')
    await flushPromises()

    expect(wrapper.find('.inventory-slot-delete').exists()).toBe(true)
    await wrapper.find('.inventory-slot-delete').trigger('click')
    await flushPromises()

    expect(store.removeBagItem).toHaveBeenCalledWith('item-1')
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('calls removeEquippedItem on delete and closes the modal on success', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(
      makeEquipment({
        PlayerId: 'owner-uid',
        Armor: [{ EntryId: 'armor-1', DisplayName: 'Cuirasse', BonusRaw: { PhysicalArmor: 4 } }],
      }),
    )
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const armorSlot = firstSlot(findWeaponArmorList(wrapper, 'Armures & Protections'))
    await armorSlot.trigger('click')
    await flushPromises()

    expect(wrapper.find('.inventory-slot-delete').exists()).toBe(true)
    await wrapper.find('.inventory-slot-delete').trigger('click')
    await flushPromises()

    expect(store.removeEquippedItem).toHaveBeenCalledWith('Armor', 'armor-1')
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('keeps the modal open and surfaces the store error when saveBagItem rejects (slot-cap case)', async () => {
    mountAsOwner()
    const store = makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' }), [])
    const capMessage = 'Capacité du sac atteinte : 30/30.'
    store.saveBagItem.mockImplementation(async () => {
      // Mirrors what the real store does on the cap-rejection path (see
      // useEquipmentStore.ts's saveBagItem): set the French error and resolve
      // `false` without persisting anything.
      store.setError(capMessage)
      return false
    })
    mockEquipmentState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const backpackSlot = wrapper.findAll('.backpack-grid .slot')[0]
    if (!backpackSlot) throw new Error('expected at least one backpack slot')
    await backpackSlot.trigger('click')
    await flushPromises()

    await wrapper.find('#inv-slot-name').setValue('Carreau')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveBagItem).toHaveBeenCalledTimes(1)
    // Failure → modal stays open (neither `open` nor `context` reset) and the
    // French store error is visible via the `errorMessage` prop.
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(true)
    expect(wrapper.find('.inventory-slot-error').text()).toBe(capMessage)
  })
})

// WP02: PlayerView now hosts the vitruve two-column layout (left VitruveSheet
// + right tabbed panel) instead of always-rendered sections. These cases
// cover the integration (VitruveSheet is actually mounted), the tab host
// itself (default tab, switching, reset-on-character-change), and confirm
// Dons/Inventaire remain reachable — just behind a tab click now.
describe('PlayerView — vitruve tab host (T010/T013)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentStates = {}
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' })))
  }

  it('met à jour la fiche affichée quand la souscription de son état de personnage livre un nouvel état (DRIFT-1)', async () => {
    currentStates['char-1'] = makeState({ HealthCurrent: 10 })
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.findComponent(VitruveSheet).props('state')?.HealthCurrent).toBe(10)

    // A remote viewer's change arrives through the live States/Current
    // listener: the displayed sheet (pills, injuries) must follow without a
    // reload.
    stateCallbacks['char-1']?.(
      makeState({ HealthCurrent: 3, Injuries: { puissance: 'rouge' } }),
    )
    await flushPromises()

    expect(wrapper.findComponent(VitruveSheet).props('state')?.HealthCurrent).toBe(3)
    await selectTab(wrapper, 'Caractéristiques')
    expect(wrapper.findComponent(CaracTab).props('state')?.Injuries).toEqual({
      puissance: 'rouge',
    })
  })

  it('renders VitruveSheet in the left column and defaults to the Fiche tab', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.findComponent(VitruveSheet).exists()).toBe(true)

    const tabs = wrapper.findAll('.pchar-tab')
    expect(tabs.map((tab) => tab.text())).toEqual(['Fiche', 'Caractéristiques', 'Dons', 'Inventaire'])
    expect(tabs[0]?.classes()).toContain('active')
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    // WP03 replaced the Fiche placeholder with FicheTab's real content.
    expect(wrapper.findComponent(FicheTab).exists()).toBe(true)
    expect(wrapper.find('.vcard-lbl').exists()).toBe(true)
    // Dons/Inventaire content isn't rendered until their tab is active.
    expect(wrapper.find('.backpack-grid').exists()).toBe(false)
    expect(wrapper.find('.gift-card, .dons-empty').exists()).toBe(false)
  })

  it('falls back to the raw raceId/classId when they resolve to no campaign doc', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // listRacesByCampaign/listClassesByCampaign are mocked empty, so nothing
    // resolves — the legacy behavior is to show the stored ids as-is.
    expect(wrapper.findComponent(VitruveSheet).props('raceName')).toBe('r1')
    expect(wrapper.findComponent(FicheTab).props('raceName')).toBe('r1')
  })

  it('switching to the Dons tab shows the relocated DonList unchanged', async () => {
    mountAsOwner()
    currentCharacter = makeCharacter({
      gifts: [{ id: 'g-1', name: 'Lame de Foudre', description: 'Une lame crépitante.' }],
    })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Dons')

    expect(wrapper.find('.gift-card').exists()).toBe(true)
    expect(wrapper.findComponent(FicheTab).exists()).toBe(false)
  })

  it('switching to the Caractéristiques tab shows CaracTab', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Caractéristiques')

    expect(wrapper.findComponent(CaracTab).exists()).toBe(true)
    expect(wrapper.findComponent(FicheTab).exists()).toBe(false)
  })

  it('switching to the Inventaire tab shows the relocated inventory grids unchanged', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    expect(wrapper.find('.backpack-grid').exists()).toBe(true)
    expect(wrapper.findAll('.weapon-armor-list')).toHaveLength(2)
    expect(wrapper.findComponent(FicheTab).exists()).toBe(false)
  })

  it('resets the active tab to Fiche when characterId changes', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')
    expect(wrapper.find('.backpack-grid').exists()).toBe(true)

    await wrapper.setProps({ characterId: 'char-2' })
    await flushPromises()

    const tabs = wrapper.findAll('.pchar-tab')
    expect(tabs[0]?.classes()).toContain('active')
    expect(wrapper.findComponent(FicheTab).exists()).toBe(true)
    expect(wrapper.find('.backpack-grid').exists()).toBe(false)
  })
})

// WP06: child-character tabs (FR-011/FR-015) and the MJ-only raw-data editor
// (FR-004) are wired into PlayerView here — these cases confirm both are
// actually reachable through the real component tree (not just unit-tested
// in isolation), per the WP06 task's "Integration check".
describe('PlayerView — child character tabs & raw editor (WP06)', () => {
  // Review cycle 1 (FR-016): this fixture previously shared the exact same
  // all-1s attributes as `makeCharacter()`'s default, so a test asserting
  // prop equality against it would pass even if PlayerView silently fed the
  // parent's attributes to the child tab. `attributes` (primary AND
  // secondary) are now genuinely distinct from the parent's, so the new
  // "calculator context follows the active tab" test below is a real
  // regression guard, not a tautology.
  const furmiaou = makeCharacter({
    id: 'furmiaou',
    name: 'Furmiaou',
    parentCharacterId: 'char-1',
    elements: ['Nature', 'Transmutation'],
    attributes: {
      primary: { force: 3, social: 4, mental: 5 },
      secondary: { puissance: 6, finesse: 7, aura: 8, relation: 2, instinct: 9, savoir: 3 },
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentStates = {}
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' })))
  }

  function mountAsMj() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'mj-uid', displayName: 'MJ', email: '', photoURL: '', role: 'mj' }),
    )
    mockEquipmentState.mockReturnValue(makeEquipmentStore(makeEquipment({ PlayerId: 'owner-uid' })))
  }

  it('adds one tab per child, labeled with the child name', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    const tabs = wrapper.findAll('.pchar-tab')
    expect(tabs.map((tab) => tab.text())).toEqual([
      'Fiche',
      'Caractéristiques',
      'Dons',
      'Inventaire',
      'Furmiaou',
    ])
  })

  it('switching to a child tab renders ChildSheetTab with the child and its own live state', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    currentStates['furmiaou'] = makeState({ HealthCurrent: 40, Health: 48 })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    const childTab = wrapper.findComponent(ChildSheetTab)
    expect(childTab.exists()).toBe(true)
    expect(childTab.props('child').id).toBe('furmiaou')
    expect(childTab.props('state')).toEqual(
      expect.objectContaining({ HealthCurrent: 40, Health: 48 }),
    )
    expect(wrapper.findComponent(FicheTab).exists()).toBe(false)
  })

  it('falls back to a zeroed state when the child has no States/Current doc yet, and PV + persists via setSessionResource', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    // no currentStates['furmiaou'] entry

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    expect(wrapper.findComponent(ChildSheetTab).props('state')).toBeNull()
    // Fallback state is all-zero (PV / 0), never NaN.
    expect(wrapper.text()).toContain('PV / 0')

    // PlayerView.vue's clampSessionValue clamps hp to [-Health, Health]; with
    // Health 0 the '+' stepper is disabled by ChildSheetTab's hpPlusDisabled
    // (state.HealthCurrent >= state.Health, 0 >= 0) — this documents that a
    // child with no bootstrapped state has no usable PV stepper until an MJ
    // raw-edits a real States/Current doc (or seed data provides one).
    // Scoped to ChildSheetTab: VitruveSheet's own PV+ button carries the
    // exact same aria-label for the PARENT's vitals, so an unscoped query
    // would silently match the wrong button.
    const plusButton = wrapper.findComponent(ChildSheetTab).find('[aria-label="Augmenter les PV"]')
    expect(plusButton.attributes('disabled')).toBeDefined()
  })

  it('adjusting a bootstrapped child PV calls setSessionResource against the child’s own characterId', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    currentStates['furmiaou'] = makeState({ HealthCurrent: 40, Health: 48 })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    // Scoped to ChildSheetTab — see the aria-label collision note above.
    await wrapper
      .findComponent(ChildSheetTab)
      .find('[aria-label="Augmenter les PV"]')
      .trigger('click')
    await flushPromises()

    expect(mockUpdateCharacterState).toHaveBeenCalledWith('campaign-1', 'furmiaou', {
      HealthCurrent: 41,
    })
  })

  it('falls back to the Fiche tab when the active child tab disappears on the SAME character (spec edge case)', async () => {
    // mj (not just the owner) so the raw-editor trigger/save round trip used
    // below to drive a same-character reload is actually reachable.
    mountAsMj()
    currentChildren = [furmiaou]

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')
    expect(wrapper.findComponent(ChildSheetTab).exists()).toBe(true)

    // Simulate the MJ raw-editing Furmiaou's parentCharacterId away (or
    // deleting the relationship): the next fetch of the SAME character's
    // children comes back empty. Drive this through the real refresh path
    // (RawCharacterEditor's `saved` emit → handleRawEditorSaved →
    // loadCharacter()) rather than changing `characterId`, which would
    // trigger the OTHER reset path (the characterId watcher) and not
    // exercise this one.
    currentChildren = []
    await wrapper.findComponent(RawCharacterEditor).vm.$emit('saved')
    await flushPromises()

    const tabs = wrapper.findAll('.pchar-tab')
    expect(tabs.map((tab) => tab.text())).toEqual(['Fiche', 'Caractéristiques', 'Dons', 'Inventaire'])
    expect(tabs[0]?.classes()).toContain('active')
    expect(wrapper.findComponent(FicheTab).exists()).toBe(true)
  })

  it('shows the raw-editor trigger for an mj and opens RawCharacterEditor on click', async () => {
    mountAsMj()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    const trigger = wrapper.find('.raw-editor-trigger')
    expect(trigger.exists()).toBe(true)
    expect(wrapper.find('.raw-editor-textarea').exists()).toBe(false)

    await trigger.trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(RawCharacterEditor).props('open')).toBe(true)
    expect(wrapper.find('.raw-editor-textarea').exists()).toBe(true)
  })

  it('hides the raw-editor trigger for a joueur, even the character owner', async () => {
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.find('.raw-editor-trigger').exists()).toBe(false)
  })

  // Review cycle 1 (FR-016, blocking finding): the active-context computed
  // feeding JetCalculator was implemented correctly but had zero test
  // assertions anywhere in the diff. This kills the "half-switched context"
  // regression class the WP06 reviewer guidance calls out by name — child
  // attributes paired with parent injuries (or vice versa) would compute a
  // plausible-looking but wrong total, and only a props-level assertion on
  // JetCalculator itself (not just ChildSheetTab) can catch that.
  it('feeds the jet calculator the active tab context — parent on a base tab, child on the child tab, parent again after switching back (FR-016)', async () => {
    mountAsOwner()
    const parentInjuries = { puissance: 'jaune' as const }
    const childInjuries = { finesse: 'rouge' as const }
    currentChildren = [furmiaou]
    currentStates['char-1'] = makeState({ Injuries: parentInjuries })
    currentStates['furmiaou'] = makeState({ HealthCurrent: 40, Health: 48, Injuries: childInjuries })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Default tab (Fiche) is a base tab: calculator must carry the parent's
    // attributes/injuries/contextKey.
    const calculator = () => wrapper.findComponent(JetCalculator)
    expect(calculator().props('attributes')).toEqual(currentCharacter?.attributes)
    expect(calculator().props('injuries')).toEqual(parentInjuries)
    expect(calculator().props('contextKey')).toBe('char-1')

    // Switch to the child tab: attributes AND injuries must switch together,
    // to the CHILD's values, with a changed contextKey.
    await selectTab(wrapper, 'Furmiaou')
    expect(calculator().props('attributes')).toEqual(furmiaou.attributes)
    expect(calculator().props('injuries')).toEqual(childInjuries)
    expect(calculator().props('contextKey')).toBe('furmiaou')
    // Guard against the exact half-switched bug: child attributes must never
    // be paired with the parent's injuries, or vice versa.
    expect(calculator().props('injuries')).not.toEqual(parentInjuries)
    expect(calculator().props('attributes')).not.toEqual(currentCharacter?.attributes)

    // Switch back to a base tab: parent context is restored in full.
    await selectTab(wrapper, 'Caractéristiques')
    expect(calculator().props('attributes')).toEqual(currentCharacter?.attributes)
    expect(calculator().props('injuries')).toEqual(parentInjuries)
    expect(calculator().props('contextKey')).toBe('char-1')
  })

  // WP02 T011 (closes analyze finding A3): SC-004/FR-005's parent/child
  // equipment isolation invariant is the single highest-risk line in this
  // WP (see WP02's Risks section — activeChildEquipment reading the wrong
  // ref would compile fine and only misbehave at runtime). T006 only proves
  // the store cache is populated correctly; this test proves PlayerView
  // actually reads from the right key when wiring props to the child sheet.
  it('never lets ChildSheetTab receive the parent equipment, or VitruveSheet receive the child equipment (SC-004 isolation)', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    const parentEquipmentDoc = makeEquipment({
      PlayerId: 'owner-uid',
      Armor: [{ EntryId: 'parent-ring', DisplayName: 'Anneau du Parent', BonusRaw: { Mana: 4 } }],
    })
    const childEquipmentDoc = makeEquipment({
      PlayerId: 'owner-uid',
      Armor: [{ EntryId: 'child-ring', DisplayName: 'Griffe Enchantée', BonusRaw: { Health: 10 } }],
    })
    mockEquipmentState.mockReturnValue(
      makeEquipmentStore(parentEquipmentDoc, [], { furmiaou: childEquipmentDoc }),
    )
    currentChildren = [furmiaou]

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Parent side (still on a base tab): VitruveSheet must carry only the
    // parent's own armor — never the child's.
    const parentEquipment = wrapper.findComponent(VitruveSheet).props('equipment') as GearEntry[]
    expect(parentEquipment).toEqual(parentEquipmentDoc.Armor)
    expect(parentEquipment.some((item) => item.EntryId === 'child-ring')).toBe(false)

    // Switch to the child tab: ChildSheetTab must carry only the child's own
    // armor — never the parent's. This is the assertion that fails if
    // activeChildEquipment is ever changed to read `equipmentStore.equipment`
    // instead of `equipmentStore.childEquipment.value[child.id]`.
    await selectTab(wrapper, 'Furmiaou')
    const childTab = wrapper.findComponent(ChildSheetTab)
    const childEquipment = childTab.props('equipment') as GearEntry[]
    expect(childEquipment).toEqual(childEquipmentDoc.Armor)
    expect(childEquipment.some((item) => item.EntryId === 'parent-ring')).toBe(false)
  })
})

// Regression coverage for the bug the user hit live: the mana/PV +/- steppers
// looked enabled once equipment raised the effective max, but the persisted
// write was silently clamped back down to the raw stored max — both in
// PlayerView.vue's own clampSessionValue call and (a second, previously
// undiscovered layer) in usePlayerStore.setSessionResource's server-side
// re-clamp. Asserts on the actual write payload, not just the optimistic UI.
describe('PlayerView — max-stat clamp uses the equipment-adjusted effective max', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentStates = {}
  })

  function mountAsOwner(equipment: CharacterEquipmentDocument) {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    const store = makeEquipmentStore(equipment)
    mockEquipmentState.mockReturnValue(store)
    return store
  }

  it('lets mana rise above the raw stored Mana once an equipped item grants a bonus', async () => {
    currentStates['char-1'] = makeState({ Health: 10, HealthCurrent: 10, Mana: 4, ManaCurrent: 4 })
    mountAsOwner(
      makeEquipment({
        PlayerId: 'owner-uid',
        Armor: [{ EntryId: 'ring', DisplayName: 'Anneau de Mana', BonusRaw: { Mana: 4 } }],
      }),
    )

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Already at the raw Mana (4/4) — before the fix this button click was a
    // silent no-op (next === current inside clampSessionValue) because the
    // clamp ceiling was the raw Mana, not the effective one (4 + 4 = 8).
    const manaPlusButton = wrapper.find('.mana-pill .vbtn:last-child')
    await manaPlusButton.trigger('click')
    await flushPromises()

    expect(mockUpdateCharacterState).toHaveBeenCalledWith('campaign-1', 'char-1', {
      ManaCurrent: 5,
    })
  })

  it('pulls current mana DOWN to the new effective max when a bonus item is unequipped', async () => {
    currentStates['char-1'] = makeState({ Health: 10, HealthCurrent: 10, Mana: 4, ManaCurrent: 8 })
    const store = mountAsOwner(
      makeEquipment({
        PlayerId: 'owner-uid',
        Armor: [{ EntryId: 'ring', DisplayName: 'Anneau de Mana', BonusRaw: { Mana: 4 } }],
      }),
    )

    mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Effective max was 8 (4 base + 4 ring), current mana sits right at it.
    // Unequip the ring: effective max drops back to 4 — current mana (8) is
    // now above the new ceiling and must be pulled down automatically.
    store.setEquipment(makeEquipment({ PlayerId: 'owner-uid', Armor: [] }))
    await flushPromises()

    expect(mockUpdateCharacterState).toHaveBeenCalledWith('campaign-1', 'char-1', {
      ManaCurrent: 4,
    })
  })

  it('does NOT bump current mana up on its own when the effective max increases (re-equip)', async () => {
    currentStates['char-1'] = makeState({ Health: 10, HealthCurrent: 10, Mana: 4, ManaCurrent: 2 })
    const store = mountAsOwner(makeEquipment({ PlayerId: 'owner-uid', Armor: [] }))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Equip a +4 mana ring: effective max rises from 4 to 8. Current mana (2)
    // is well under both ceilings — no automatic write should happen.
    store.setEquipment(
      makeEquipment({
        PlayerId: 'owner-uid',
        Armor: [{ EntryId: 'ring', DisplayName: 'Anneau de Mana', BonusRaw: { Mana: 4 } }],
      }),
    )
    await flushPromises()

    expect(mockUpdateCharacterState).not.toHaveBeenCalled()
    expect(wrapper.find('.mana-pill .vbig').text()).toBe('2')
  })
})
