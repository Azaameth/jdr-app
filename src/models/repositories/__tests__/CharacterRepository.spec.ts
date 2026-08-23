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
      expect(await repo.getCharacterByCampaign('camp-1', 'char-1')).toBeNull()
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

    const EMPTY_ATTRIBUTES = {
      primary: { force: 0, social: 0, mental: 0 },
      secondary: { puissance: 0, finesse: 0, aura: 0, relation: 0, instinct: 0, savoir: 0 },
    }

    it('reads characters from the nested campaign collection', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'char-1',
            data: () => ({ CampaignId: 'camp-1', DisplayName: 'Hero' }),
          },
        ],
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.listCharactersByCampaign('camp-1')

      expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters')
      expect(result).toEqual([
        {
          id: 'char-1',
          campaignId: 'camp-1',
          name: 'Hero',
          attributes: EMPTY_ATTRIBUTES,
          skills: [],
          gifts: [],
        },
      ])
    })

    it('returns null from getCharacterByCampaign when the doc does not exist', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterByCampaign('camp-1', 'missing')

      expect(result).toBeNull()
    })

    it('maps getCharacterByCampaign to the nested doc path and { id, ...data }', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'char-1',
        data: () => ({ CampaignId: 'camp-1', DisplayName: 'Hero', Level: 3 }),
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterByCampaign('camp-1', 'char-1')

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters', 'char-1')
      expect(result).toEqual({
        id: 'char-1',
        campaignId: 'camp-1',
        name: 'Hero',
        level: 3,
        attributes: EMPTY_ATTRIBUTES,
        skills: [],
        gifts: [],
      })
    })

    it('listChildrenOf maps docs to the app shape, passing through genuinely unmapped fields unmodified', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'furmiaou',
            data: () => ({
              CampaignId: 'camp-1',
              DisplayName: 'Furmiaou',
              ParentCharacterId: 'firm',
              Elements: ['Nature'],
              Actions: { charge: { Description: 'Fonce', Value: 1 } },
            }),
          },
        ],
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.listChildrenOf('camp-1', 'firm')

      expect(result).toEqual([
        {
          id: 'furmiaou',
          campaignId: 'camp-1',
          name: 'Furmiaou',
          parentCharacterId: 'firm',
          elements: ['Nature'],
          Actions: { charge: { Description: 'Fonce', Value: 1 } },
          attributes: EMPTY_ATTRIBUTES,
          skills: [],
          gifts: [],
        },
      ])
    })

    it('normalizes canonical PascalCase Firestore field names into the camelCase app shape', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'char-1',
        data: () => ({
          CampaignId: 'camp-1',
          PlayerId: 'uid-42',
          ParentCharacterId: 'firm',
          ActiveFormId: 'furmiaou',
          DisplayName: 'Kael',
          Elements: ['Feu'],
          Languages: ['Commun'],
          Statistics: {
            Force: { Base: 40, Bonus: 5 },
            Social: { Base: 10, Bonus: 0 },
            Mental: { Base: 20, Bonus: 0 },
          },
          Secondaries: { Puissance: 3, Finesse: 1, Aura: 0, Relation: 0, Instinct: 2, Savoir: 4 },
          Skills: { 'skill-1': { Description: 'Survie', Value: 2 } },
        }),
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterByCampaign('camp-1', 'char-1')

      expect(result).toEqual({
        id: 'char-1',
        campaignId: 'camp-1',
        ownerUid: 'uid-42',
        parentCharacterId: 'firm',
        activeFormId: 'furmiaou',
        name: 'Kael',
        elements: ['Feu'],
        languages: ['Commun'],
        attributes: {
          primary: { force: 45, social: 10, mental: 20 },
          secondary: { puissance: 3, finesse: 1, aura: 0, relation: 0, instinct: 2, savoir: 4 },
        },
        skills: [{ id: 'skill-1', name: 'Survie', rank: 2, domain: 'general' }],
        gifts: [],
        // Statistics/Secondaries/Skills also pass through verbatim under
        // their raw PascalCase keys (kept for genuinely unmapped consumers,
        // e.g. NEXTSTEPS.md Cluster 8's note) alongside the new derived
        // camelCase fields above — this isn't a duplicate bug, both coexist.
        Statistics: {
          Force: { Base: 40, Bonus: 5 },
          Social: { Base: 10, Bonus: 0 },
          Mental: { Base: 20, Bonus: 0 },
        },
        Secondaries: { Puissance: 3, Finesse: 1, Aura: 0, Relation: 0, Instinct: 2, Savoir: 4 },
        Skills: { 'skill-1': { Description: 'Survie', Value: 2 } },
      })
    })

    it('never throws when Elements/Statistics/Secondaries/Skills are absent (fresh or raw-edited character)', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'char-1',
        data: () => ({ CampaignId: 'camp-1', DisplayName: 'Nouveau' }),
      })

      const repo = await import('../CharacterRepository')
      const result = await repo.getCharacterByCampaign('camp-1', 'char-1')

      expect(result?.elements).toBeUndefined()
      expect(result?.attributes).toEqual(EMPTY_ATTRIBUTES)
      expect(result?.skills).toEqual([])
      expect(result?.gifts).toEqual([])
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
