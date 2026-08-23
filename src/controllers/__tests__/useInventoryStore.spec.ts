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
  updateInventoryGold: vi.fn<(inventoryId: string, gold: number) => Promise<boolean>>(),
  campaignRulesInventory: vi.fn(),
}))

vi.mock('../../models/repositories/InventoryRepository', () => ({
  getInventoryByCharacterId: mocks.getInventoryByCharacterId,
  updateInventoryItems: mocks.updateInventoryItems,
  updateInventoryEquipment: mocks.updateInventoryEquipment,
  updateInventoryGold: mocks.updateInventoryGold,
}))

vi.mock('../../controllers/useCampaignRulesStore', () => ({
  useCampaignRulesStore: () => ({
    inventory: { value: mocks.campaignRulesInventory() },
  }),
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
    gold: 0,
    ...overrides,
  }
}

describe('useInventoryStore', () => {
  let useInventoryStore: typeof UseInventoryStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.campaignRulesInventory.mockReturnValue(null)
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

    it('uses a campaign Other slot group to enforce the backpack capacity', async () => {
      mocks.campaignRulesInventory.mockReturnValue({
        nbSlotWeapon: 3,
        nbSlotArmor: 3,
        nbSlotOther: 2,
        currencyName: "Pièce d'or",
        Other: [{ id: 1, name: 'Matériel de soin', slots: 1 }],
      })
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({
        items: [{ itemId: 'i-1', name: 'Bandage', quantity: 1, category: 'soins' }],
      }))
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveBackpackItem({
        name: 'Potion',
        quantity: 1,
        category: 'soins',
      })

      expect(result).toBe(false)
      expect(store.error.value).toBe('Capacité de Matériel de soin atteinte : 1/1.')
      expect(mocks.updateInventoryItems).not.toHaveBeenCalled()
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

    it('rejects a new weapon when the campaign rule limit is reached', async () => {
      mocks.campaignRulesInventory.mockReturnValue({
        nbSlotWeapon: 1,
        nbSlotArmor: 3,
        nbSlotOther: 0,
        currencyName: "Pièce d'or",
        Other: [],
      })
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ weapons: [{ itemId: 'w-1', name: 'Épée' }] }))
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('weapons', { name: 'Nouvelle arme' })

      expect(result).toBe(false)
      expect(store.error.value).toBe('Capacité d\'armes atteinte : 1/1.')
      expect(mocks.updateInventoryEquipment).not.toHaveBeenCalled()
    })

    it('rejects a new armor when the campaign rule limit is reached', async () => {
      mocks.campaignRulesInventory.mockReturnValue({
        nbSlotWeapon: 3,
        nbSlotArmor: 1,
        nbSlotOther: 0,
        currencyName: "Pièce d'or",
        Other: [],
      })
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ armor: [{ itemId: 'a-1', name: 'Armure légère' }] }))
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('armor', { name: 'Nouvelle armure' })

      expect(result).toBe(false)
      expect(store.error.value).toBe('Capacité d\'armures atteinte : 1/1.')
      expect(mocks.updateInventoryEquipment).not.toHaveBeenCalled()
    })

    it('replaces an existing armor item in place', async () => {
      const armor: WeaponArmorItem[] = [
        {
          itemId: 'a-1',
          name: 'Bouclier',
          equipped: true,
          statBonus: { stat: 'armorPhysique', amount: 2 },
        },
      ]
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ armor }))
      mocks.updateInventoryEquipment.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.saveEquipmentItem('armor', {
        itemId: 'a-1',
        name: 'Bouclier',
        equipped: true,
        statBonus: { stat: 'armorPhysique', amount: 4 },
      })

      expect(result).toBe(true)
      expect(mocks.updateInventoryEquipment).toHaveBeenCalledWith('inv-1', 'armor', [
        {
          itemId: 'a-1',
          name: 'Bouclier',
          equipped: true,
          statBonus: { stat: 'armorPhysique', amount: 4 },
        },
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

  describe('setGold', () => {
    it('persists the new gold amount and updates local state', async () => {
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ gold: 10 }))
      mocks.updateInventoryGold.mockResolvedValue(true)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.setGold(50)

      expect(result).toBe(true)
      expect(mocks.updateInventoryGold).toHaveBeenCalledWith('inv-1', 50)
      expect(store.inventory.value?.gold).toBe(50)
    })

    it('sets a French error and returns false when no inventory is loaded', async () => {
      const store = useInventoryStore()

      const result = await store.setGold(50)

      expect(result).toBe(false)
      expect(store.error.value).toBeTruthy()
      expect(mocks.updateInventoryGold).not.toHaveBeenCalled()
    })

    it('sets a French error and leaves state unchanged when the repository returns false', async () => {
      mocks.getInventoryByCharacterId.mockResolvedValue(makeInventory({ gold: 10 }))
      mocks.updateInventoryGold.mockResolvedValue(false)
      const store = useInventoryStore()
      await store.loadInventory('char-1', 'camp-1')

      const result = await store.setGold(50)

      expect(result).toBe(false)
      expect(store.error.value).toBeTruthy()
      expect(store.inventory.value?.gold).toBe(10)
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

  describe('loadChildInventories', () => {
    it('resolves to an empty cache for an empty childIds array', async () => {
      const store = useInventoryStore()

      await store.loadChildInventories([], 'camp-1')

      expect(store.childInventories.value).toEqual({})
      expect(mocks.getInventoryByCharacterId).not.toHaveBeenCalled()
    })

    it('populates the cache with one entry per child, keyed by characterId', async () => {
      const childA = makeInventory({ id: 'inv-a', characterId: 'child-a' })
      const childB = makeInventory({ id: 'inv-b', characterId: 'child-b' })
      mocks.getInventoryByCharacterId.mockImplementation(async (characterId: string) => {
        if (characterId === 'child-a') return childA
        if (characterId === 'child-b') return childB
        return null
      })
      const store = useInventoryStore()

      await store.loadChildInventories(['child-a', 'child-b'], 'camp-1')

      expect(store.childInventories.value).toEqual({ 'child-a': childA, 'child-b': childB })
    })

    it('omits entries for children with no inventory doc', async () => {
      const childA = makeInventory({ id: 'inv-a', characterId: 'child-a' })
      mocks.getInventoryByCharacterId.mockImplementation(async (characterId: string) => {
        if (characterId === 'child-a') return childA
        return null
      })
      const store = useInventoryStore()

      await store.loadChildInventories(['child-a', 'child-b'], 'camp-1')

      expect(store.childInventories.value).toEqual({ 'child-a': childA })
      expect(store.childInventories.value['child-b']).toBeUndefined()
    })

    it('does not touch the existing inventory ref', async () => {
      const parentInv = makeInventory({ id: 'inv-parent', characterId: 'parent-1' })
      const childInv = makeInventory({ id: 'inv-child', characterId: 'child-a' })
      mocks.getInventoryByCharacterId.mockResolvedValueOnce(parentInv)
      const store = useInventoryStore()
      await store.loadInventory('parent-1', 'camp-1')

      mocks.getInventoryByCharacterId.mockResolvedValue(childInv)
      await store.loadChildInventories(['child-a'], 'camp-1')

      expect(store.inventory.value).toEqual(parentInv)
    })

    it('replaces the cache rather than merging on a second call', async () => {
      const childA = makeInventory({ id: 'inv-a', characterId: 'child-a' })
      const childB = makeInventory({ id: 'inv-b', characterId: 'child-b' })
      const store = useInventoryStore()

      mocks.getInventoryByCharacterId.mockResolvedValue(childA)
      await store.loadChildInventories(['child-a'], 'camp-1')
      expect(store.childInventories.value).toEqual({ 'child-a': childA })

      mocks.getInventoryByCharacterId.mockResolvedValue(childB)
      await store.loadChildInventories(['child-b'], 'camp-1')

      expect(store.childInventories.value).toEqual({ 'child-b': childB })
      expect(store.childInventories.value['child-a']).toBeUndefined()
    })
  })
})
