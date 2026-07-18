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

describe('CharacterRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('when Firebase is not configured (no db)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('no-ops every exported function without touching Firestore', async () => {
      const repo = await import('../CharacterRepository')

      expect(await repo.listCharactersByCampaign('camp-1')).toEqual([])
      expect(await repo.getCharacterById('char-1')).toBeNull()
      expect(await repo.listChildrenOf('camp-1', 'firm')).toEqual([])
      expect(await repo.updateCharacter('char-1', { backstory: 'x' })).toBeUndefined()

      expect(firestoreMocks.getDocs).not.toHaveBeenCalled()
      expect(firestoreMocks.getDoc).not.toHaveBeenCalled()
      expect(firestoreMocks.updateDoc).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('maps listCharactersByCampaign docs to { id, ...data } with no field defaulting', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'char-1',
            data: () => ({ campaignId: 'camp-1', name: 'Hero' }),
          },
        ],
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.listCharactersByCampaign('camp-1')

      expect(result).toEqual([{ id: 'char-1', campaignId: 'camp-1', name: 'Hero' }])
    })

    it('returns null from getCharacterById when the doc does not exist', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterById('missing')

      expect(result).toBeNull()
    })

    it('maps getCharacterById to { id, ...data } when the doc exists', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'char-1',
        data: () => ({ campaignId: 'camp-1', name: 'Hero', level: 3 }),
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterById('char-1')

      expect(result).toEqual({ id: 'char-1', campaignId: 'camp-1', name: 'Hero', level: 3 })
    })

    it('listChildrenOf maps docs to { id, ...data } with no field defaulting', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'furmiaou',
            data: () => ({ campaignId: 'camp-1', name: 'Furmiaou', parentCharacterId: 'firm' }),
          },
        ],
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.listChildrenOf('camp-1', 'firm')

      expect(result).toEqual([
        { id: 'furmiaou', campaignId: 'camp-1', name: 'Furmiaou', parentCharacterId: 'firm' },
      ])
    })

    it('updateCharacter strips id and merge-writes the remaining fields plus updatedAt', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../CharacterRepository')
      await repo.updateCharacter('char-1', { id: 'char-1', backstory: 'Nouvelle histoire' })

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1)
      const [, payload] = firestoreMocks.updateDoc.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(payload.id).toBeUndefined()
      expect(payload.backstory).toBe('Nouvelle histoire')
      expect(typeof payload.updatedAt).toBe('string')
    })
  })
})
