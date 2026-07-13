import { beforeEach, describe, expect, it, vi } from 'vitest'

const batchSetMock = vi.fn<(ref: unknown, data: Record<string, unknown>) => void>()
const batchCommitMock = vi.fn<() => Promise<void>>()
const updateDocMock = vi.fn<(ref: unknown, patch: Record<string, unknown>) => Promise<void>>()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn<(db: unknown, name: string) => { __collection: string }>(
    (_db, name) => ({ __collection: name }),
  ),
  doc: vi.fn<(collectionRef: { __collection?: string }) => { id: string }>((collectionRef) => ({
    id: `generated-${collectionRef?.__collection ?? 'id'}`,
  })),
  writeBatch: vi.fn<() => { set: typeof batchSetMock; commit: typeof batchCommitMock }>(() => ({
    set: batchSetMock,
    commit: batchCommitMock,
  })),
  updateDoc: updateDocMock,
  getDoc: vi.fn<() => Promise<unknown>>(),
  getDocs: vi.fn<() => Promise<unknown>>(),
  query: vi.fn<() => unknown>(),
  where: vi.fn<() => unknown>(),
}))

const validInput = {
  campaignId: 'campaign-1',
  ownerUid: 'user-1',
  name: 'Azarius',
  raceId: 'kitsune',
  classId: 'cogneur',
  gender: 'Homme' as const,
  elements: ['🔥 Feu'],
}

describe('CharacterRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('when Firebase is not configured', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('createCharacterWithMembership throws instead of silently no-oping', async () => {
      const { createCharacterWithMembership } = await import('../CharacterRepository')
      await expect(createCharacterWithMembership(validInput)).rejects.toThrow(
        'Firebase non configuré.',
      )
    })

    it('updateCharacter throws instead of silently no-oping', async () => {
      const { updateCharacter } = await import('../CharacterRepository')
      await expect(updateCharacter('char-1', { name: 'New name' })).rejects.toThrow(
        'Firebase non configuré.',
      )
    })
  })

  describe('when Firebase is configured', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('createCharacterWithMembership writes character and membership atomically', async () => {
      const { createCharacterWithMembership } = await import('../CharacterRepository')
      const result = await createCharacterWithMembership(validInput)

      expect(batchSetMock).toHaveBeenCalledTimes(2)
      expect(batchCommitMock).toHaveBeenCalledTimes(1)
      // Both set() calls must happen before the single commit() call.
      const [setOrder] = batchSetMock.mock.invocationCallOrder
      const [commitOrder] = batchCommitMock.mock.invocationCallOrder
      expect(setOrder).toBeDefined()
      expect(commitOrder).toBeDefined()
      expect(setOrder as number).toBeLessThan(commitOrder as number)
      expect(result.characterId).toBeTruthy()
    })

    it('createCharacterWithMembership defaults a fresh character to level 1 and empty session stats', async () => {
      const { createCharacterWithMembership } = await import('../CharacterRepository')
      await createCharacterWithMembership(validInput)

      const [, characterDoc] = batchSetMock.mock.calls[0] as [unknown, Record<string, unknown>]
      const [, membershipDoc] = batchSetMock.mock.calls[1] as [unknown, Record<string, unknown>]

      expect(characterDoc).toMatchObject({ name: 'Azarius', level: 1 })
      expect(membershipDoc).toMatchObject({
        status: 'approved',
        session: { hp: 0, maxHp: 0, mana: 0, maxMana: 0, posture: 'DEFENSIF', inventory: [] },
      })
    })

    it('updateCharacter patches only the given fields plus updatedAt', async () => {
      const { updateCharacter } = await import('../CharacterRepository')
      await updateCharacter('char-1', { name: 'New name', level: 2 })

      expect(updateDocMock).toHaveBeenCalledTimes(1)
      const [, patch] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(patch).toMatchObject({ name: 'New name', level: 2 })
      expect(Object.keys(patch).sort()).toEqual(['level', 'name', 'updatedAt'])
    })
  })
})
