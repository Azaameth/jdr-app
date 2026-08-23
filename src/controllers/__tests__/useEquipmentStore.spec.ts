import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useEquipmentStore as UseEquipmentStoreType } from '../useEquipmentStore'

const mocks = vi.hoisted(() => ({
  getEquipmentByCharacter: vi.fn<(
    campaignId: string,
    characterId: string,
  ) => Promise<
    | {
        Armor: Array<{ EntryId: string; DisplayName: string }>
        Weapons: Array<{ EntryId: string; DisplayName: string }>
        Currency: number
        PlayerId: string
        CampaignId: string
      }
    | null
  >>(),
  setEquipmentByCharacter: vi.fn<(
    campaignId: string,
    characterId: string,
    equipment: Record<string, unknown>,
  ) => Promise<void>>(),
  subscribeEquipmentByCharacter: vi.fn<(
    campaignId: string,
    characterId: string,
    onChange: (state: unknown) => void,
  ) => () => void>(),
  listBagItemsByCharacter: vi.fn<(campaignId: string, characterId: string) => Promise<unknown[]>>(),
  setBagItem: vi.fn<(
    campaignId: string,
    characterId: string,
    itemId: string,
    item: Record<string, unknown>,
  ) => Promise<void>>(),
  deleteBagItem: vi.fn<(campaignId: string, characterId: string, itemId: string) => Promise<void>>(),
  subscribeBagItemsByCharacter: vi.fn<(
    campaignId: string,
    characterId: string,
    onChange: (items: unknown[]) => void,
  ) => () => void>(),
}))

vi.mock('../../models/repositories/EquipmentRepository', () => ({
  getEquipmentByCharacter: mocks.getEquipmentByCharacter,
  setEquipmentByCharacter: mocks.setEquipmentByCharacter,
  subscribeEquipmentByCharacter: mocks.subscribeEquipmentByCharacter,
}))

vi.mock('../../models/repositories/ItemRepository', () => ({
  listBagItemsByCharacter: mocks.listBagItemsByCharacter,
  setBagItem: mocks.setBagItem,
  deleteBagItem: mocks.deleteBagItem,
  subscribeBagItemsByCharacter: mocks.subscribeBagItemsByCharacter,
}))

describe('useEquipmentStore', () => {
  let useEquipmentStore: typeof UseEquipmentStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.subscribeEquipmentByCharacter.mockReturnValue(() => {})
    mocks.subscribeBagItemsByCharacter.mockReturnValue(() => {})
    ;({ useEquipmentStore } = await import('../useEquipmentStore'))
  })

  it('subscribes once per character and detaches when switching target', () => {
    const firstEquipmentUnsubscribe = vi.fn<() => void>()
    const firstBagUnsubscribe = vi.fn<() => void>()
    mocks.subscribeEquipmentByCharacter.mockReturnValueOnce(firstEquipmentUnsubscribe)
    mocks.subscribeBagItemsByCharacter.mockReturnValueOnce(firstBagUnsubscribe)

    const store = useEquipmentStore()
    store.subscribe('camp-1', 'char-1')
    store.subscribe('camp-1', 'char-1')
    store.subscribe('camp-1', 'char-2')

    expect(mocks.subscribeEquipmentByCharacter).toHaveBeenCalledTimes(2)
    expect(mocks.subscribeBagItemsByCharacter).toHaveBeenCalledTimes(2)
    expect(firstEquipmentUnsubscribe).toHaveBeenCalledTimes(1)
    expect(firstBagUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('mirrors live equipment and bag updates into the store state', () => {
    mocks.subscribeEquipmentByCharacter.mockImplementation((_campaignId, _characterId, onChange) => {
      onChange({
        Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
        Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
        Currency: 42,
        PlayerId: 'uid-1',
        CampaignId: 'camp-1',
      })
      return () => {}
    })

    mocks.subscribeBagItemsByCharacter.mockImplementation((_campaignId, _characterId, onChange) => {
      onChange([
        { EntryId: 'i-1', DisplayName: 'Potion', Quantity: 2, PlayerId: 'uid-1', CampaignId: 'camp-1' },
      ])
      return () => {}
    })

    const store = useEquipmentStore()
    store.subscribe('camp-1', 'char-1')

    expect(store.equipment.value).toMatchObject({
      Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
      Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
      Currency: 42,
    })
    expect(store.items.value).toHaveLength(1)
    expect(store.items.value[0]).toMatchObject({ DisplayName: 'Potion', Quantity: 2 })
  })
})
