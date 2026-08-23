import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'items-collection'),
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'item-doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  updateDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  deleteDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('ItemRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads a bag item from the nested character path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'item-1',
      data: () => ({
        EntryId: 'item-1',
        DisplayName: 'Potion de soin',
        Quantity: 2,
        PlayerId: 'uid-1',
        CampaignId: 'camp-1',
      }),
    })

    const { getBagItemById } = await import('../ItemRepository')
    const result = await getBagItemById('camp-1', 'char-1', 'item-1')

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Characters',
      'char-1',
      'Items',
      'item-1',
    )
    expect(result).toMatchObject({
      EntryId: 'item-1',
      DisplayName: 'Potion de soin',
      Quantity: 2,
    })
  })

  it('lists and writes bag items under the character item collection', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'item-1',
          data: () => ({
            EntryId: 'item-1',
            DisplayName: 'Potion de soin',
            Quantity: 2,
            PlayerId: 'uid-1',
            CampaignId: 'camp-1',
          }),
        },
      ],
    })

    const { listBagItemsByCharacter, setBagItem } = await import('../ItemRepository')
    const list = await listBagItemsByCharacter('camp-1', 'char-1')
    await setBagItem('camp-1', 'char-1', 'item-1', {
      EntryId: 'item-1',
      DisplayName: 'Potion de soin',
      Quantity: 3,
      PlayerId: 'uid-1',
      CampaignId: 'camp-1',
    })

    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Characters',
      'char-1',
      'Items',
    )
    expect(list).toHaveLength(1)
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      'item-doc-ref',
      expect.objectContaining({
        EntryId: 'item-1',
        DisplayName: 'Potion de soin',
        Quantity: 3,
      }),
      { merge: true },
    )
  })
})
