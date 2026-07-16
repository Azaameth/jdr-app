import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  query: vi.fn<(...args: unknown[]) => unknown>(() => 'query-ref'),
  where: vi.fn<(...args: unknown[]) => unknown>(),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  updateDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  writeBatch: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('ParticipantRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('when Firebase is not configured (no db)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('no-ops every exported function without touching Firestore', async () => {
      const repo = await import('../ParticipantRepository')

      expect(await repo.listParticipantsByCampaign('camp-1')).toEqual([])
      expect(await repo.getParticipant('uid-1', 'camp-1')).toBeNull()
      expect(await repo.getParticipantByCharacterId('char-1', 'camp-1')).toBeNull()
      expect(await repo.setParticipantSessionByCharacterId('char-1', 'camp-1', { hp: 1 })).toBeNull()
      expect(await repo.resetTeamSessionToMax('camp-1')).toBe(0)

      expect(firestoreMocks.getDocs).not.toHaveBeenCalled()
      expect(firestoreMocks.updateDoc).not.toHaveBeenCalled()
      expect(firestoreMocks.writeBatch).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('maps a well-formed participant doc as-is', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'participant-1',
            data: () => ({
              uid: 'uid-1',
              campaignId: 'camp-1',
              characterId: 'char-1',
              status: 'approved',
              session: {
                hp: 12,
                maxHp: 50,
                mana: 3,
                maxMana: 20,
                posture: 'OFFENSIF',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              createdAt: '2023-12-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            }),
          },
        ],
      })

      const repo = await import('../ParticipantRepository')
      const result = await repo.listParticipantsByCampaign('camp-1')

      expect(result).toEqual([
        {
          id: 'participant-1',
          uid: 'uid-1',
          campaignId: 'camp-1',
          characterId: 'char-1',
          status: 'approved',
          session: {
            hp: 12,
            maxHp: 50,
            mana: 3,
            maxMana: 20,
            posture: 'OFFENSIF',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          createdAt: '2023-12-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ])
    })

    it('defaults missing session and top-level fields on a partial doc', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [{ id: 'participant-1', data: () => ({ uid: 'uid-1', campaignId: 'camp-1' }) }],
      })

      const repo = await import('../ParticipantRepository')
      const result = await repo.getParticipant('uid-1', 'camp-1')

      expect(result).toEqual({
        id: 'participant-1',
        uid: 'uid-1',
        campaignId: 'camp-1',
        characterId: '',
        status: 'pending',
        session: {
          hp: 0,
          maxHp: 0,
          mana: 0,
          maxMana: 0,
          posture: 'DEFENSIF',
          updatedAt: undefined,
        },
        createdAt: undefined,
        updatedAt: undefined,
      })
    })

    it('defaults individual missing session fields while keeping the ones present', async () => {
      firestoreMocks.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'participant-1',
            data: () => ({
              uid: 'uid-1',
              campaignId: 'camp-1',
              characterId: 'char-1',
              session: { hp: 7 },
            }),
          },
        ],
      })

      const repo = await import('../ParticipantRepository')
      const result = await repo.getParticipantByCharacterId('char-1', 'camp-1')

      expect(result?.session).toEqual({
        hp: 7,
        maxHp: 0,
        mana: 0,
        maxMana: 0,
        posture: 'DEFENSIF',
        updatedAt: undefined,
      })
      expect(result?.status).toBe('pending')
    })

    it('returns null from getParticipantByCharacterId when no doc matches', async () => {
      firestoreMocks.getDocs.mockResolvedValue({ docs: [] })

      const repo = await import('../ParticipantRepository')
      const result = await repo.getParticipantByCharacterId('missing', 'camp-1')

      expect(result).toBeNull()
    })
  })
})
