import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useInventoryStore as UseInventoryStoreType } from '../useInventoryStore'
import type { CharacterInventory, InventoryItem, WeaponArmorItem } from '../../models/types/Inventory'

const mocks = vi.hoisted(() => ({
  getInventoryByCharacterId:
    vi.fn<(characterId: string, campaignId: string) => Promise<CharacterInventory | null>>(),
  updateInventoryItems: vi.fn<(inventoryId: string, items: InventoryItem[]) => Promise<boolean>>(),
  updateInventoryEquipment:
    vi.fn<
      (inventoryId: string, kind: 'weapons' | 'armor', list: WeaponArmorItem[]) => Promise<boolean>
    >(),
}))

vi.mock('../../models/repositories/InventoryRepository', () => ({
  getInventoryByCharacterId: mocks.getInventoryByCharacterId,
  updateInventoryItems: mocks.updateInventoryItems,
  updateInventoryEquipment: mocks.updateInventoryEquipment,
}))

function makeInventory(overrides: Partial<CharacterInventory> = {}): CharacterInventory {
  return {
    id: 'inv-1',
    uid: 'uid-1',
    campaignId: 'camp-1',
    characterId: 'char-1',
    items: [],
    weapons: [],
    armor: [],
    ...overrides,
  }
}

describe('useInventoryStore', () => {
  let useInventoryStore: typeof UseInventoryStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    ;({ useInventoryStore } = await import('../useInventoryStore'))
  })

  describe('loadInventory', () => {
    it('caches the loaded inventory on state', async () => {
      const inv = makeInventory()
      mocks.getInventoryByCharacterId.mockResolvedValue(inv)
      const store = useInventoryStore()

      const result = await store.loadInventory('char-1', 'camp-1')

      expect(result).toEqual(inv)
      expect(store.inventory.value).toEqual(inv)
      expect(mocks.getInventoryByCharacterId).toHaveBeenCalledWith('char-1', 'camp-1')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.getInventoryByCharacterId.mockRejectedValue('boom')
      const store = useInventoryStore()

      const result = await store.loadInventory('char-1', 'camp-1')

      expect(result).toBeNull()
      expect(store.error.value).toBe("Erreur lors du chargement de l'inventaire.")
    })
  })

  describe('saveBackpackItem', () => {
    it('rejects a new item with a French error and does not call the repository when the category is full', async () => {
      const items: InventoryItem[] = [
        { itemId: 'i-1', name: 'Rations', quantity: 1, category: 'nourriture' },
      ]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ items }))
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveBackpackItem({
        name: 'Pain',
        quantity: 1,
        category: 'nourriture',
      })

      expect(result).toBe(false)
      expect(store.error.value).toBe('Catégorie pleine : aucun emplacement libre.')
      expect(mocks.updateInventoryItems).not.toHaveBeenCalled()
      expect(store.inventory.value?.items).toEqual(items)
    })

    it('generates an itemId for a new item and persists it', async () => {
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory())
      mocks.updateInventoryItems.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveBackpackItem({
        name: 'Rations',
        quantity: 3,
        category: 'nourriture',
      })

      expect(result).toBe(true)
      expect(mocks.updateInventoryItems).toHaveBeenCalledWith(
        'inv-1',
        expect.arrayContaining([
          expect.objectContaining({ name: 'Rations', quantity: 3, category: 'nourriture' }),
        ]),
      )
      const [, persistedItems] = mocks.updateInventoryItems.mock.calls[0] as [string, InventoryItem[]]
      expect(persistedItems[0]?.itemId).toBeTruthy()
      expect(store.inventory.value?.items).toHaveLength(1)
    })

    it('replaces an existing item in place when itemId is provided', async () => {
      const items: InventoryItem[] = [
        { itemId: 'i-1', name: 'Kit médical', quantity: 1, category: 'soins' },
      ]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ items }))
      mocks.updateInventoryItems.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveBackpackItem({
        itemId: 'i-1',
        name: 'Kit médical',
        quantity: 5,
        category: 'soins',
      })

      expect(result).toBe(true)
      expect(mocks.updateInventoryItems).toHaveBeenCalledWith('inv-1', [
        { itemId: 'i-1', name: 'Kit médical', quantity: 5, category: 'soins' },
      ])
      expect(store.inventory.value?.items).toEqual([
        { itemId: 'i-1', name: 'Kit médical', quantity: 5, category: 'soins' },
      ])
    })

    it('sets a French error and leaves state unchanged when the repository returns false', async () => {
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory())
      mocks.updateInventoryItems.mockResolvedValue(false)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveBackpackItem({
        name: 'Rations',
        quantity: 1,
        category: 'nourriture',
      })

      expect(result).toBe(false)
      expect(store.error.value).toBeTruthy()
      expect(store.inventory.value?.items).toEqual([])
    })

    it('sets a French error and returns false when no inventory is loaded', async () => {
      const store = useInventoryStore()

      const result = await store.saveBackpackItem({
        name: 'Rations',
        quantity: 1,
        category: 'nourriture',
      })

      expect(result).toBe(false)
      expect(store.error.value).toBeTruthy()
      expect(mocks.updateInventoryItems).not.toHaveBeenCalled()
    })
  })

  describe('removeBackpackItem', () => {
    it('filters the item out and persists', async () => {
      const items: InventoryItem[] = [
        { itemId: 'i-1', name: 'Rations', quantity: 1, category: 'nourriture' },
        { itemId: 'i-2', name: 'Kit médical', quantity: 1, category: 'soins' },
      ]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ items }))
      mocks.updateInventoryItems.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.removeBackpackItem('i-1')

      expect(result).toBe(true)
      expect(mocks.updateInventoryItems).toHaveBeenCalledWith('inv-1', [items[1]])
      expect(store.inventory.value?.items).toEqual([items[1]])
    })
  })

  describe('saveEquipmentItem', () => {
    it('adds a new weapon via updateInventoryEquipment with kind "weapons"', async () => {
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory())
      mocks.updateInventoryEquipment.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('weapons', {
        name: 'Vieille épée',
        damageDie: 'D4',
        damageBonus: -1,
      })

      expect(result).toBe(true)
      expect(mocks.updateInventoryEquipment).toHaveBeenCalledWith(
        'inv-1',
        'weapons',
        expect.arrayContaining([
          expect.objectContaining({ name: 'Vieille épée', damageDie: 'D4', damageBonus: -1 }),
        ]),
      )
      expect(store.inventory.value?.weapons).toHaveLength(1)
    })

    it('replaces an existing armor item in place', async () => {
      const armor: WeaponArmorItem[] = [{ itemId: 'a-1', name: 'Bouclier', armorRating: 2 }]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ armor }))
      mocks.updateInventoryEquipment.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('armor', {
        itemId: 'a-1',
        name: 'Bouclier',
        armorRating: 4,
      })

      expect(result).toBe(true)
      expect(mocks.updateInventoryEquipment).toHaveBeenCalledWith('inv-1', 'armor', [
        { itemId: 'a-1', name: 'Bouclier', armorRating: 4 },
      ])
    })

    it('has no cap: it succeeds even past what would be a backpack limit', async () => {
      const armor: WeaponArmorItem[] = Array.from({ length: 20 }, (_, i) => ({
        itemId: `a-${i}`,
        name: `Armor ${i}`,
      }))
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ armor }))
      mocks.updateInventoryEquipment.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('armor', { name: 'One more' })

      expect(result).toBe(true)
      expect(store.inventory.value?.armor).toHaveLength(21)
    })
  })

  describe('removeEquipmentItem', () => {
    it('filters the item out and persists via updateInventoryEquipment', async () => {
      const weapons: WeaponArmorItem[] = [{ itemId: 'w-1', name: 'Épée', damageDie: 'D6' }]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ weapons }))
      mocks.updateInventoryEquipment.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.removeEquipmentItem('weapons', 'w-1')

      expect(result).toBe(true)
      expect(mocks.updateInventoryEquipment).toHaveBeenCalledWith('inv-1', 'weapons', [])
      expect(store.inventory.value?.weapons).toEqual([])
    })
  })

  describe('freeSlots', () => {
    it('computes max minus filled for a category', async () => {
      const items: InventoryItem[] = [
        { itemId: 'i-1', name: 'Rations', quantity: 1, category: 'nourriture' },
        { itemId: 'i-2', name: 'Balles', quantity: 1, category: 'munitions' },
      ]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ items }))
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      expect(store.freeSlots('nourriture')).toBe(0)
      expect(store.freeSlots('munitions')).toBe(1)
      expect(store.freeSlots('butin')).toBe(16)
    })

    it('returns the full max when no inventory is loaded', () => {
      const store = useInventoryStore()
      expect(store.freeSlots('nourriture')).toBe(1)
    })
  })
})
