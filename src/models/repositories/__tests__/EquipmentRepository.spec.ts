import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  updateDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('EquipmentRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads equipment from the nested character path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
        Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
        Currency: 42,
        PlayerId: 'uid-1',
        CampaignId: 'camp-1',
      }),
    })

    const { getEquipmentByCharacter } = await import('../EquipmentRepository')
    const result = await getEquipmentByCharacter('camp-1', 'char-1')

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      'Campaigns',
      'camp-1',
      'Characters',
      'char-1',
      'Equipment',
      'Main',
    )
    expect(result).toMatchObject({
      Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
      Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
      Currency: 42,
    })
  })

  it('writes equipment to the nested character path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.setDoc.mockResolvedValue(undefined)

    const { setEquipmentByCharacter } = await import('../EquipmentRepository')
    await setEquipmentByCharacter('camp-1', 'char-1', {
      Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
      Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
      Currency: 42,
      PlayerId: 'uid-1',
      CampaignId: 'camp-1',
    })

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        Armor: [{ EntryId: 'a-1', DisplayName: 'Cuir léger' }],
        Weapons: [{ EntryId: 'w-1', DisplayName: 'Épée courte' }],
        Currency: 42,
      }),
      { merge: true },
    )
  })
})
