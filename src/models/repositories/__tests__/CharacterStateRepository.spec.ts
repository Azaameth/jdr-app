import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  updateDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(),
  writeBatch: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('CharacterStateRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads the live state from the nested character path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ Health: 50, HealthCurrent: 40, Mana: 20, ManaCurrent: 18 }),
    })

    const { getCharacterState } = await import('../CharacterStateRepository')
    const result = await getCharacterState('camp-1', 'char-1')

    expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Characters', 'char-1', 'States', 'Current')
    expect(result).toMatchObject({ Health: 50, HealthCurrent: 40, Mana: 20, ManaCurrent: 18 })
  })

  it('writes the live state in the nested character path', async () => {
    vi.doMock('../../../firebase/config', () => ({ db: {} }))
    firestoreMocks.setDoc.mockResolvedValue(undefined)

    const { setCharacterState } = await import('../CharacterStateRepository')
    await setCharacterState('camp-1', 'char-1', {
      Health: 50,
      HealthCurrent: 45,
      Mana: 20,
      ManaCurrent: 18,
      PlayerId: 'player-1',
      CampaignId: 'camp-1',
    })

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ Health: 50, HealthCurrent: 45, Mana: 20, ManaCurrent: 18 }),
      { merge: true },
    )
  })

  describe('resetTeamStatesToMax', () => {
    it('resets HealthCurrent/ManaCurrent to Health/Mana for every given character, skipping missing docs', async () => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
      const batchUpdate = vi.fn<(ref: unknown, data: Record<string, unknown>) => void>()
      const batchCommit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
      firestoreMocks.writeBatch.mockReturnValue({ update: batchUpdate, commit: batchCommit })
      firestoreMocks.getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ Health: 50, HealthCurrent: 10, Mana: 20, ManaCurrent: 3 }),
        })
        .mockResolvedValueOnce({ exists: () => false })

      const { resetTeamStatesToMax } = await import('../CharacterStateRepository')
      const count = await resetTeamStatesToMax('camp-1', ['char-1', 'char-2'])

      expect(count).toBe(1)
      expect(batchUpdate).toHaveBeenCalledTimes(1)
      expect(batchUpdate).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ HealthCurrent: 50, ManaCurrent: 20 }),
      )
      expect(batchCommit).toHaveBeenCalledTimes(1)
    })

    it('returns 0 and skips the batch entirely for an empty character list', async () => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))

      const { resetTeamStatesToMax } = await import('../CharacterStateRepository')
      const count = await resetTeamStatesToMax('camp-1', [])

      expect(count).toBe(0)
      expect(firestoreMocks.writeBatch).not.toHaveBeenCalled()
    })

    it('no-ops when Firebase is not configured', async () => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))

      const { resetTeamStatesToMax } = await import('../CharacterStateRepository')
      const count = await resetTeamStatesToMax('camp-1', ['char-1'])

      expect(count).toBe(0)
      expect(firestoreMocks.writeBatch).not.toHaveBeenCalled()
    })
  })
})
