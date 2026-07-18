import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterInventory } from '../../models/types/Inventory'
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

const mockInventoryState = vi.fn<() => ReturnType<typeof makeInventoryStore>>()
vi.mock('../../controllers/useInventoryStore', () => ({
  useInventoryStore: () => mockInventoryState(),
}))

vi.mock('../../models/repositories/CharacterRepository', () => ({
  getCharacterById: vi.fn<() => Promise<CharacterProfile | null>>(async () => currentCharacter),
}))
vi.mock('../../models/repositories/ParticipantRepository', () => ({
  getParticipantByCharacterId: vi.fn<() => Promise<null>>(async () => null),
  setParticipantSessionByCharacterId: vi.fn<() => Promise<null>>(async () => null),
}))
vi.mock('../../models/repositories/ClassRepository', () => ({
  listClassesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))
vi.mock('../../models/repositories/RaceRepository', () => ({
  listRacesByCampaign: vi.fn<() => Promise<unknown[]>>(async () => []),
}))

import PlayerView from '../PlayerView.vue'

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

function makeInventoryStore(inventory: CharacterInventory | null) {
  // `errorRef` backs the `error` computed so tests covering the T016 save/delete
  // wiring (review cycle 1 feedback) can flip the store's error mid-test via
  // `setError`, mirroring how the real store sets `error.value` inside a
  // rejected save/remove call — the mocked methods below default to success
  // but individual tests may `.mockImplementation(...)` them to call `setError`
  // and return `false` to exercise the failure branch.
  const errorRef = ref<string | null>(null)
  return {
    inventory: computed(() => inventory),
    loading: computed(() => false),
    error: computed(() => errorRef.value),
    loadInventory: vi.fn<() => Promise<CharacterInventory | null>>(async () => inventory),
    saveBackpackItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeBackpackItem: vi.fn<() => Promise<boolean>>(async () => true),
    saveEquipmentItem: vi.fn<() => Promise<boolean>>(async () => true),
    removeEquipmentItem: vi.fn<() => Promise<boolean>>(async () => true),
    freeSlots: vi.fn<() => number>(() => 0),
    setError: (message: string | null) => {
      errorRef.value = message
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
    ...overrides,
  }
}

// The mocked CharacterRepository reads this module-level fixture.
let currentCharacter: CharacterProfile | null = null

describe('PlayerView — inventory slot editing permissions (T015/T017)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentCharacter = makeCharacter()
  })

  it('grants edit affordances to the inventory owner (joueur, own character)', async () => {
    mockAuthState.mockReturnValue(
      makeAuthStore({ uid: 'owner-uid', displayName: 'J', email: '', photoURL: '', role: 'joueur' }),
    )
    mockInventoryState.mockReturnValue(makeInventoryStore(makeInventory({ uid: 'owner-uid' })))

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

    expect(wrapper.find('.error').exists()).toBe(false)
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

  it('opens the modal for an equipment slot, calls saveEquipmentItem with the parsed payload, and closes on success', async () => {
    mountAsOwner()
    const store = makeInventoryStore(makeInventory({ uid: 'owner-uid' }))
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

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
      makeInventory({ uid: 'owner-uid', armor: [{ itemId: 'armor-1', name: 'Cuirasse', armorRating: 4 }] }),
    )
    mockInventoryState.mockReturnValue(store)

    const wrapper = mount(PlayerView, { props: { campaignId: 'campaign-1', characterId: 'char-1' } })
    await flushPromises()

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
