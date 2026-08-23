import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  query: vi.fn<(...args: unknown[]) => unknown>(() => 'query-ref'),
  updateDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  where: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('InventoryRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) })
  })

  describe('when Firebase is not configured (no db)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('no-ops every exported function without touching Firestore', async () => {
      const repo = await import('../InventoryRepository')

      expect(await repo.getInventoryByCharacterId('char-1', 'camp-1')).toBeNull()
      expect(await repo.listInventoriesByCampaign('camp-1')).toEqual([])
      expect(await repo.updateInventoryItems('camp-1', 'char-1', [])).toBe(false)
      expect(await repo.updateInventoryEquipment('camp-1', 'char-1', 'armor', [])).toBe(false)
      expect(await repo.updateInventoryGold('camp-1', 'char-1', 10)).toBe(false)

      expect(firestoreMocks.getDocs).not.toHaveBeenCalled()
      expect(firestoreMocks.updateDoc).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('defaults missing weapons/armor/gold to []/0 when mapping a pre-migration doc', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'Main',
        data: () => ({
          uid: 'uid-1',
          campaignId: 'camp-1',
          characterId: 'char-1',
          items: [{ itemId: 'item-1', name: 'Rations', quantity: 1, category: 'nourriture' }],
        }),
      })

      const repo = await import('../InventoryRepository')
      const result = await repo.getInventoryByCharacterId('char-1', 'camp-1')

      expect(result).toEqual({
        id: 'Main',
        uid: 'uid-1',
        campaignId: 'camp-1',
        characterId: 'char-1',
        items: [{ itemId: 'item-1', name: 'Rations', quantity: 1, category: 'nourriture' }],
        weapons: [],
        armor: [],
        gold: 0,
        createdAt: undefined,
        updatedAt: undefined,
      })
    })

    it('reads inventory only from the nested character Equipment path', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'Main',
        data: () => ({
          uid: 'uid-1',
          campaignId: 'camp-1',
          characterId: 'char-1',
          items: [],
          gold: 250,
        }),
      })

      const repo = await import('../InventoryRepository')
      const result = await repo.getInventoryByCharacterId('char-1', 'camp-1')

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters', 'char-1', 'Equipment', 'Main')
      expect(result?.gold).toBe(250)
    })

    it('maps existing weapons/armor arrays through without defaulting', async () => {
      const weapons = [{ itemId: 'w-1', name: 'Épée', damageDie: 'D6' as const, damageBonus: 1 }]
      const armor = [{ itemId: 'a-1', name: 'Bouclier', armorRating: 2 }]
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'Main',
        data: () => ({
          uid: 'uid-1',
          campaignId: 'camp-1',
          characterId: 'char-1',
          items: [],
          weapons,
          armor,
        }),
      })

      const repo = await import('../InventoryRepository')
      const result = await repo.getInventoryByCharacterId('char-1', 'camp-1')

      expect(result?.weapons).toEqual(weapons)
      expect(result?.armor).toEqual(armor)
    })

    it('returns null from getInventoryByCharacterId when there is no matching doc', async () => {
      firestoreMocks.getDocs.mockResolvedValue({ docs: [] })

      const repo = await import('../InventoryRepository')
      const result = await repo.getInventoryByCharacterId('char-1', 'camp-1')

      expect(result).toBeNull()
    })

    it('listInventoriesByCampaign maps every nested character equipment doc for the campaign', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [{ id: 'char-1' }, { id: 'char-2' }],
      })
      firestoreMocks.getDoc
        .mockResolvedValueOnce({ exists: () => true, id: 'Main', data: () => ({ uid: 'uid-1', campaignId: 'camp-1', characterId: 'char-1', items: [], weapons: [], armor: [] }) })
        .mockResolvedValueOnce({ exists: () => true, id: 'Main', data: () => ({ uid: 'uid-2', campaignId: 'camp-1', characterId: 'char-2', items: [], weapons: [], armor: [] }) })

      const repo = await import('../InventoryRepository')
      const result = await repo.listInventoriesByCampaign('camp-1')

      expect(result).toHaveLength(2)
      expect(result.map((inv) => inv.characterId)).toEqual(['char-1', 'char-2'])
      expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters')
    })

    it('listInventoriesByCampaign returns an empty array when nothing matches', async () => {
      firestoreMocks.getDocs.mockResolvedValue({ docs: [] })

      const repo = await import('../InventoryRepository')
      const result = await repo.listInventoriesByCampaign('camp-empty')

      expect(result).toEqual([])
    })

    it('updateInventoryItems writes the items array and a refreshed updatedAt', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../InventoryRepository')
      const items = [{ itemId: 'item-1', name: 'Rations', quantity: 1, category: 'nourriture' as const }]
      const result = await repo.updateInventoryItems('camp-1', 'char-1', items)

      expect(result).toBe(true)
      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters', 'char-1', 'Equipment', 'Main')
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ items, updatedAt: expect.any(String) }),
      )
    })

    it('updateInventoryEquipment writes the "armor" field when kind is armor', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../InventoryRepository')
      const list = [{ itemId: 'a-1', name: 'Bouclier', armorRating: 2 }]
      const result = await repo.updateInventoryEquipment('camp-1', 'char-1', 'armor', list)

      expect(result).toBe(true)
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ armor: list, updatedAt: expect.any(String) }),
      )
    })

    it('updateInventoryEquipment writes the "weapons" field when kind is weapons', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../InventoryRepository')
      const list = [{ itemId: 'w-1', name: 'Épée', damageDie: 'D6' as const }]
      const result = await repo.updateInventoryEquipment('camp-1', 'char-1', 'weapons', list)

      expect(result).toBe(true)
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ weapons: list, updatedAt: expect.any(String) }),
      )
    })

    it('updateInventoryGold writes the gold field and a refreshed updatedAt', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../InventoryRepository')
      const result = await repo.updateInventoryGold('camp-1', 'char-1', 150)

      expect(result).toBe(true)
      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters', 'char-1', 'Equipment', 'Main')
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ gold: 150, updatedAt: expect.any(String) }),
      )
    })
  })
})
