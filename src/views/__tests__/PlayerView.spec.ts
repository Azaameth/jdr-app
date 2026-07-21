import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterInventory, WeaponArmorItem } from '../../models/types/Inventory'
import type { Participant } from '../../models/types/Participant'
import type { User } from '../../models/types/User'
import { setParticipantSessionByCharacterId } from '../../models/repositories/ParticipantRepository'

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

const mockInventoryState = vi.fn<() => ReturnType<typeof makeInventoryStore>>()
vi.mock('../../controllers/useInventoryStore', () => ({
  useInventoryStore: () => mockInventoryState(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  getCharacterById: vi.fn<() => Promise<CharacterProfile | null>>(async () => currentCharacter),
  updateCharacter: vi.fn<() => Promise<void>>(async () => {}),
  // WP03: usePlayerStore().subscribeParty (needed for setInjury to have a
  // campaign context) calls listCharactersByCampaign internally.
  listCharactersByCampaign: vi.fn<() => Promise<CharacterProfile[]>>(async () => []),
  // WP06: loadCharacter() now also fetches the displayed character's children
  // (Furmiaou-style transformations) alongside it — default to none so every
  // pre-existing test in this file (none of which are about children) keeps
  // seeing exactly the four base tabs.
  listChildrenOf: vi.fn<() => Promise<CharacterProfile[]>>(async () => currentChildren),
}))
// WP06: updateChildSession backs usePlayerStore().setChildVitals — hoisted
// (vi.mock factories run before top-level const declarations, per Vitest's
// hoisting rules — see usePlayerStore.spec.ts for the same pattern) so
// child-tab tests can assert the childId/fields it was called with.
const { mockUpdateChildSession, partySnapshot } = vi.hoisted(() => ({
  mockUpdateChildSession: vi.fn<() => Promise<void>>(async () => {}),
  // DRIFT-1 fix (mission review): capture the live-subscription callback so
  // tests can push participant snapshots the way Firestore would.
  partySnapshot: { deliver: undefined as ((list: Participant[]) => void) | undefined },
}))
vi.mock('../../models/repositories/ParticipantRepository', () => ({
  getParticipantByCharacterId: vi.fn<() => Promise<Participant | null>>(
    async () => currentParticipant,
  ),
  setParticipantSessionByCharacterId: vi.fn<() => Promise<null>>(async () => null),
  // WP03: usePlayerStore().subscribeParty attaches this live listener too.
  subscribeParticipantsByCampaign: vi.fn<
    (campaignId: string, onChange: (list: Participant[]) => void) => () => void
  >((_campaignId, onChange) => {
    partySnapshot.deliver = onChange
    return () => {}
  }),
  updateChildSession: mockUpdateChildSession,
}))
vi.mock('../../models/repositories/ClassRepository', () => ({
  listClassesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))
vi.mock('../../models/repositories/RaceRepository', () => ({
  listRacesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))

import PlayerView from '../PlayerView.vue'
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

function makeInventoryStore(
  inventory: CharacterInventory | null,
  childInventoriesMap?: Record<string, CharacterInventory>,
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
  // way saveEquipmentItem/removeEquipmentItem mutate the real store's ref.
  const inventoryRef = ref<CharacterInventory | null>(inventory)
  return {
    inventory: computed(() => inventoryRef.value),
    // WP02: mirrors the real store's childInventories cache — defaults to `{}`
    // so every pre-existing single-argument call site keeps working unchanged.
    childInventories: computed(() => childInventoriesMap ?? {}),
    loading: computed(() => false),
    error: computed(() => errorRef.value),
    loadInventory: vi.fn<() => Promise<CharacterInventory | null>>(async () => inventoryRef.value),
    saveBackpackItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeBackpackItem: vi.fn<() => Promise<boolean>>(async () => true),
    saveEquipmentItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeEquipmentItem: vi.fn<() => Promise<boolean>>(async () => true),
    setGold: vi.fn<() => Promise<boolean>>(async () => true),
    freeSlots: vi.fn<() => number>(() => 0),
    loadChildInventories: vi.fn<() => Promise<void>>(async () => {}),
    setError: (message: string | null) => {
      errorRef.value = message
    },
    setInventory: (next: CharacterInventory | null) => {
      inventoryRef.value = next
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

function makeInventory(overrides: Partial<CharacterInventory> = {}): CharacterInventory {
  return {
    id: 'inv-1',
    uid: 'owner-uid',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    items: [],
    weapons: [],
    armor: [],
    gold: 0,
    ...overrides,
  }
}

// The mocked CharacterRepository reads this module-level fixture.
let currentCharacter: CharacterProfile | null = null
// WP06: children of `currentCharacter`, read by the mocked listChildrenOf.
let currentChildren: CharacterProfile[] = []
// WP06: the parent participant doc, read by the mocked getParticipantByCharacterId
// — carries `childSessions` for the child-tab tests. Defaults to null, same as
// the hardcoded stub every pre-WP06 test in this file already relied on.
let currentParticipant: Participant | null = null

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'participant-1',
    uid: 'owner-uid',
    campaignId: 'campaign-1',
    characterId: 'char-1',
    status: 'approved',
    session: { hp: 10, maxHp: 10, mana: 5, maxMana: 5, posture: 'FOCUS' },
    ...overrides,
  }
}

// Dons/Inventaire now live behind the vitruve tab host (WP02) instead of
// always-rendered sections — tests that assert on their content must select
// the tab first, exactly as a real user would click it.
async function selectTab(wrapper: ReturnType<typeof mount>, label: string) {
  const tab = wrapper.findAll('.pchar-tab').find((candidate) => candidate.text() === label)
  if (!tab) throw new Error(`tab "${label}" not found`)
  await tab.trigger('click')
  await flushPromises()
}

describe('PlayerView — inventory slot editing permissions (T015/T017)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentParticipant = null
  })

  it('grants edit affordances to the inventory owner (joueur, own character)', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))

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
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const slotButtons = wrapper.findAll('.backpack-grid .slot')
    expect(slotButtons.length).toBeGreaterThan(0)
    for (const slot of slotButtons) {
      expect(slot.element.tagName).toBe('BUTTON')
    }
  })

  it('denies edit affordances when the viewer is not the inventory owner and not mj/admin', async () => {
    // Character ownership matches the joueur (passes the pre-existing view guard),
    // but the loaded inventory belongs to a different uid — canEditInventory must
    // key off the inventory's uid, not merely "is this my character page".
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'someone-else' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const slotElements = wrapper.findAll('.backpack-grid .slot')
    expect(slotElements.length).toBeGreaterThan(0)
    for (const slot of slotElements) {
      expect(slot.element.tagName).toBe('DIV')
    }
  })

  it('denies edit affordances (and view access entirely) for a joueur viewing another character', async () => {
    currentCharacter = makeCharacter({ ownerUid: 'someone-else' })
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'someone-else' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Accès refusé')
    expect(wrapper.find('.backpack-grid').exists()).toBe(false)
  })

  it('renders no edit affordance in degraded no-backend mode (no inventory loaded)', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(null))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const slotElements = wrapper.findAll('.backpack-grid .slot')
    expect(slotElements.length).toBeGreaterThan(0)
    for (const slot of slotElements) {
      expect(slot.element.tagName).toBe('DIV')
    }
  })
})

// Review cycle 1 finding: `handleSlotSave`/`handleSlotDelete` (T016) had no
// coverage of the actual store-integration path — only the errorMessage
// *display* was tested in isolation (InventorySlotModal.spec.ts) and only
// permission gating was tested here. These cases mount PlayerView, drive a
// real slot-click → modal → submit/delete round trip, and assert the correct
// useInventoryStore method is invoked with the right payload and that the
// modal opens/closes/stays-open correctly on success/failure.
describe('PlayerView — inventory slot save/delete store integration (T016, review cycle 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
    currentChildren = []
    currentParticipant = null
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
  }

  function findCategorySection(wrapper: ReturnType<typeof mount>, headerPrefix: string) {
    const section = wrapper
      .findAll('.category')
      .find((candidate) => candidate.find('.category-header').text().startsWith(headerPrefix))
    if (!section) throw new Error(`category section "${headerPrefix}" not found`)
    return section
  }

  function findWeaponArmorList(wrapper: ReturnType<typeof mount>, title: string) {
    const list = wrapper
      .findAll('.weapon-armor-list')
      .find((candidate) => candidate.find('.list-title').text() === title)
    if (!list) throw new Error(`weapon/armor list "${title}" not found`)
    return list
  }

  function firstSlot(container: ReturnType<typeof findCategorySection>) {
    const slot = container.findAll('.slot')[0]
    if (!slot) throw new Error('expected at least one .slot element')
    return slot
  }

  it('opens the modal via slot-click, calls saveBackpackItem with the right payload, and closes on success', async () => {
    mountAsOwner()
    const store = makeInventoryStore(makeInventory({ uid: 'owner-uid', items: [] }))
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    // Munitions (max 2 slots) has an empty slot to click for "add" while items is [].
    const munitionsSlot = firstSlot(findCategorySection(wrapper, 'Munitions'))
    await munitionsSlot.trigger('click')
    await flushPromises()
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(true)

    await wrapper.find('#inv-slot-name').setValue('Silex')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveBackpackItem).toHaveBeenCalledWith({
      itemId: undefined,
      name: 'Silex',
      category: 'munitions',
      quantity: 1,
    })
    // Success → modal closes (both `open` and `context` reset in PlayerView).
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('commits a gold input edit by calling inventoryStore.setGold with the parsed value', async () => {
    mountAsOwner()
    const store = makeInventoryStore(makeInventory({ uid: 'owner-uid', gold: 10 }))
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const goldInput = wrapper.find('.gold-input')
    await goldInput.setValue('75')
    await goldInput.trigger('blur')
    await flushPromises()

    expect(store.setGold).toHaveBeenCalledWith(75)
  })

  it('opens the modal for an equipment slot, calls saveEquipmentItem with the parsed payload, and closes on success', async () => {
    mountAsOwner()
    const store = makeInventoryStore(makeInventory({ uid: 'owner-uid' }))
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const weaponSlot = firstSlot(findWeaponArmorList(wrapper, 'Armes'))
    await weaponSlot.trigger('click')
    await flushPromises()
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(true)

    await wrapper.find('#inv-slot-name').setValue('Épée courte')
    await wrapper.find('#inv-slot-stat').setValue('D6')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveEquipmentItem).toHaveBeenCalledWith('weapons', {
      itemId: undefined,
      name: 'Épée courte',
      damageDie: 'D6',
    })
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('calls removeBackpackItem on delete and closes the modal on success', async () => {
    mountAsOwner()
    const store = makeInventoryStore(
      makeInventory({
        uid: 'owner-uid',
        items: [{ itemId: 'item-1', name: 'Ration', category: 'nourriture', quantity: 1 }],
      }),
    )
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const nourritureSlot = firstSlot(findCategorySection(wrapper, 'Nourriture'))
    await nourritureSlot.trigger('click')
    await flushPromises()

    expect(wrapper.find('.inventory-slot-delete').exists()).toBe(true)
    await wrapper.find('.inventory-slot-delete').trigger('click')
    await flushPromises()

    expect(store.removeBackpackItem).toHaveBeenCalledWith('item-1')
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('calls removeEquipmentItem on delete and closes the modal on success', async () => {
    mountAsOwner()
    const store = makeInventoryStore(
      makeInventory({
        uid: 'owner-uid',
        armor: [
          {
            itemId: 'armor-1',
            name: 'Cuirasse',
            equipped: true,
            statBonus: { stat: 'armorPhysique', amount: 4 },
          },
        ],
      }),
    )
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const armorSlot = firstSlot(findWeaponArmorList(wrapper, 'Armures & Protections'))
    await armorSlot.trigger('click')
    await flushPromises()

    expect(wrapper.find('.inventory-slot-delete').exists()).toBe(true)
    await wrapper.find('.inventory-slot-delete').trigger('click')
    await flushPromises()

    expect(store.removeEquipmentItem).toHaveBeenCalledWith('armor', 'armor-1')
    expect(wrapper.find('.inventory-slot-form').exists()).toBe(false)
  })

  it('keeps the modal open and surfaces the store error when saveBackpackItem rejects (category-full case)', async () => {
    mountAsOwner()
    const store = makeInventoryStore(makeInventory({ uid: 'owner-uid', items: [] }))
    const capMessage = 'Catégorie pleine : aucun emplacement libre.'
    store.saveBackpackItem.mockImplementation(async () => {
      // Mirrors what the real store does on the cap-rejection path (see
      // useInventoryStore.ts's CATEGORY_FULL_ERROR): set the French error and
      // resolve `false` without persisting anything.
      store.setError(capMessage)
      return false
    })
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Inventaire')

    const munitionsSlot = firstSlot(findCategorySection(wrapper, 'Munitions'))
    await munitionsSlot.trigger('click')
    await flushPromises()

    await wrapper.find('#inv-slot-name').setValue('Carreau')
    await wrapper.find('form.inventory-slot-form').trigger('submit')
    await flushPromises()

    expect(store.saveBackpackItem).toHaveBeenCalledTimes(1)
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
    currentParticipant = null
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))
  }

  it('met à jour la fiche affichée quand la souscription du groupe livre une nouvelle session (DRIFT-1)', async () => {
    currentParticipant = makeParticipant()
    mountAsOwner()

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.findComponent(VitruveSheet).props('participant')?.session.hp).toBe(10)

    // A remote viewer's change arrives through the snapshot listener: the
    // displayed sheet (pills, injuries) must follow without a reload.
    partySnapshot.deliver?.([
      makeParticipant({
        session: {
          hp: 3,
          maxHp: 10,
          mana: 5,
          maxMana: 5,
          posture: 'FOCUS',
          injuries: { puissance: 'rouge' },
        },
      }),
    ])
    await flushPromises()

    expect(wrapper.findComponent(VitruveSheet).props('participant')?.session.hp).toBe(3)
    await selectTab(wrapper, 'Caractéristiques')
    expect(wrapper.findComponent(CaracTab).props('session')?.injuries).toEqual({
      puissance: 'rouge',
    })

    // Reset the singleton store's snapshot so later tests fall back to their
    // own one-shot fixtures.
    partySnapshot.deliver?.([])
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
    currentParticipant = null
  })

  function mountAsOwner() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))
  }

  function mountAsMj() {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'mj-uid', displayName: 'MJ', email: '', photoURL: '', role: 'mj' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))
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

  it('switching to a child tab renders ChildSheetTab with the child and its childSessions entry', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    currentParticipant = makeParticipant({
      childSessions: {
        furmiaou: { hp: 40, maxHp: 48, mana: 0, maxMana: 0, posture: 'FOCUS' },
      },
    })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    const childTab = wrapper.findComponent(ChildSheetTab)
    expect(childTab.exists()).toBe(true)
    expect(childTab.props('child').id).toBe('furmiaou')
    expect(childTab.props('childSession')).toEqual({
      hp: 40,
      maxHp: 48,
      mana: 0,
      maxMana: 0,
      posture: 'FOCUS',
    })
    expect(wrapper.findComponent(FicheTab).exists()).toBe(false)
  })

  it('falls back to a zeroed session when the child has no childSessions entry yet, and PV + persists via setChildVitals', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    currentParticipant = makeParticipant() // no childSessions.furmiaou entry yet

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    expect(wrapper.findComponent(ChildSheetTab).props('childSession')).toBeNull()
    // Fallback session is all-zero (PV / 0), never NaN.
    expect(wrapper.text()).toContain('PV / 0')

    // PlayerView.vue's clampSessionValue clamps hp to [-maxHp, maxHp]; with
    // maxHp 0 the '+' stepper is disabled by ChildSheetTab's hpPlusDisabled
    // (session.hp >= session.maxHp, 0 >= 0) — this documents that a child
    // with no bootstrapped session has no usable PV stepper until an MJ
    // raw-edits a real childSessions entry (or seed data provides one, as
    // it does for the real Furmiaou fixture).
    // Scoped to ChildSheetTab: VitruveSheet's own PV+ button carries the
    // exact same aria-label for the PARENT's vitals, so an unscoped query
    // would silently match the wrong button.
    const plusButton = wrapper.findComponent(ChildSheetTab).find('[aria-label="Augmenter les PV"]')
    expect(plusButton.attributes('disabled')).toBeDefined()
  })

  it('adjusting a bootstrapped child PV calls setChildVitals (updateChildSession) with the parent participant id', async () => {
    mountAsOwner()
    currentChildren = [furmiaou]
    currentParticipant = makeParticipant({
      childSessions: {
        furmiaou: { hp: 40, maxHp: 48, mana: 0, maxMana: 0, posture: 'FOCUS' },
      },
    })

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()
    await selectTab(wrapper, 'Furmiaou')

    // Scoped to ChildSheetTab — see the aria-label collision note above.
    await wrapper
      .findComponent(ChildSheetTab)
      .find('[aria-label="Augmenter les PV"]')
      .trigger('click')
    await flushPromises()

    expect(mockUpdateChildSession).toHaveBeenCalledWith('participant-1', 'furmiaou', { hp: 41 })
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
    currentParticipant = makeParticipant({
      session: { hp: 10, maxHp: 10, mana: 5, maxMana: 5, posture: 'FOCUS', injuries: parentInjuries },
      childSessions: {
        furmiaou: { hp: 40, maxHp: 48, mana: 0, maxMana: 0, posture: 'FOCUS', injuries: childInjuries },
      },
    })

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
    const parentInventory = makeInventory({
      uid: 'owner-uid',
      armor: [
        {
          itemId: 'parent-ring',
          name: 'Anneau du Parent',
          equipped: true,
          statBonus: { stat: 'maxMana', amount: 4 },
        },
      ],
    })
    const childInventory = makeInventory({
      id: 'inv-furmiaou',
      characterId: 'furmiaou',
      armor: [
        {
          itemId: 'child-ring',
          name: 'Griffe Enchantée',
          equipped: true,
          statBonus: { stat: 'maxHp', amount: 10 },
        },
      ],
    })
    mockInventoryState.mockReturnValue(
      makeInventoryStore(parentInventory, { furmiaou: childInventory }),
    )
    currentChildren = [furmiaou]

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Parent side (still on a base tab): VitruveSheet must carry only the
    // parent's own armor — never the child's.
    const parentEquipment = wrapper.findComponent(VitruveSheet).props('equipment') as WeaponArmorItem[]
    expect(parentEquipment).toEqual(parentInventory.armor)
    expect(parentEquipment.some((item) => item.itemId === 'child-ring')).toBe(false)

    // Switch to the child tab: ChildSheetTab must carry only the child's own
    // armor — never the parent's. This is the assertion that fails if
    // activeChildEquipment is ever changed to read `inventoryStore.inventory`
    // instead of `inventoryStore.childInventories.value[child.id]`.
    await selectTab(wrapper, 'Furmiaou')
    const childTab = wrapper.findComponent(ChildSheetTab)
    const childEquipment = childTab.props('equipment') as WeaponArmorItem[]
    expect(childEquipment).toEqual(childInventory.armor)
    expect(childEquipment.some((item) => item.itemId === 'parent-ring')).toBe(false)
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
    currentParticipant = null
  })

  function mountAsOwner(inventory: CharacterInventory) {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    const store = makeInventoryStore(inventory)
    mockInventoryState.mockReturnValue(store)
    return store
  }

  it('lets mana rise above the raw stored maxMana once an equipped item grants a bonus', async () => {
    currentParticipant = makeParticipant({
      session: { hp: 10, maxHp: 10, mana: 4, maxMana: 4, posture: 'FOCUS' },
    })
    mountAsOwner(
      makeInventory({
        uid: 'owner-uid',
        armor: [
          {
            itemId: 'ring',
            name: 'Anneau de Mana',
            equipped: true,
            statBonus: { stat: 'maxMana', amount: 4 },
          },
        ],
      }),
    )
    vi.mocked(setParticipantSessionByCharacterId).mockResolvedValue(
      makeParticipant({ session: { hp: 10, maxHp: 10, mana: 5, maxMana: 4, posture: 'FOCUS' } }),
    )

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Already at the raw maxMana (4/4) — before the fix this button click was
    // a silent no-op (next === current inside clampSessionValue) because the
    // clamp ceiling was the raw maxMana, not the effective one (4 + 4 = 8).
    const manaPlusButton = wrapper.find('.mana-pill .vbtn:last-child')
    await manaPlusButton.trigger('click')
    await flushPromises()

    expect(setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'campaign-1', {
      mana: 5,
    })
  })

  it('pulls current mana DOWN to the new effective max when a bonus item is unequipped', async () => {
    currentParticipant = makeParticipant({
      session: { hp: 10, maxHp: 10, mana: 8, maxMana: 4, posture: 'FOCUS' },
    })
    const store = mountAsOwner(
      makeInventory({
        uid: 'owner-uid',
        armor: [
          {
            itemId: 'ring',
            name: 'Anneau de Mana',
            equipped: true,
            statBonus: { stat: 'maxMana', amount: 4 },
          },
        ],
      }),
    )
    vi.mocked(setParticipantSessionByCharacterId).mockResolvedValue(
      makeParticipant({ session: { hp: 10, maxHp: 10, mana: 4, maxMana: 4, posture: 'FOCUS' } }),
    )

    mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Effective max was 8 (4 base + 4 ring), current mana sits right at it.
    // Unequip the ring: effective max drops back to 4 — current mana (8) is
    // now above the new ceiling and must be pulled down automatically.
    store.setInventory(makeInventory({ uid: 'owner-uid', armor: [] }))
    await flushPromises()

    expect(setParticipantSessionByCharacterId).toHaveBeenCalledWith('char-1', 'campaign-1', {
      mana: 4,
    })
  })

  it('does NOT bump current mana up on its own when the effective max increases (re-equip)', async () => {
    currentParticipant = makeParticipant({
      session: { hp: 10, maxHp: 10, mana: 2, maxMana: 4, posture: 'FOCUS' },
    })
    const store = mountAsOwner(makeInventory({ uid: 'owner-uid', armor: [] }))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    // Equip a +4 mana ring: effective max rises from 4 to 8. Current mana (2)
    // is well under both ceilings — no automatic write should happen.
    store.setInventory(
      makeInventory({
        uid: 'owner-uid',
        armor: [
          {
            itemId: 'ring',
            name: 'Anneau de Mana',
            equipped: true,
            statBonus: { stat: 'maxMana', amount: 4 },
          },
        ],
      }),
    )
    await flushPromises()

    expect(setParticipantSessionByCharacterId).not.toHaveBeenCalled()
    expect(wrapper.find('.mana-pill .vbig').text()).toBe('2')
  })
})
