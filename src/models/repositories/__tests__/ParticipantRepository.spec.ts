import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  query: vi.fn<(...args: unknown[]) => unknown>(() => 'query-ref'),
  where: vi.fn<(...args: unknown[]) => unknown>(),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(),
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

    it('subscribeParticipantsByCampaign returns a callable noop and never calls back', async () => {
      const repo = await import('../ParticipantRepository')
      const onChange = vi.fn<(participants: unknown[]) => void>()

      const unsubscribe = repo.subscribeParticipantsByCampaign('camp-1', onChange)
      unsubscribe()

      expect(onChange).not.toHaveBeenCalled()
      expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled()
    })

    it('updateSessionFields and updateChildSession resolve without throwing and without touching Firestore', async () => {
      const repo = await import('../ParticipantRepository')

      await expect(
        repo.updateSessionFields('participant-1', { hp: 5 }),
      ).resolves.toBeUndefined()
      await expect(
        repo.updateChildSession('participant-1', 'child-1', { hp: 5 }),
      ).resolves.toBeUndefined()

      expect(firestoreMocks.updateDoc).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('reads participants only from the nested campaign Players collection', async () => {
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

      expect(firestoreMocks.collection).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'Players')
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

    it('maps injuries, advantage, disadvantage and childSessions when present', async () => {
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
                hp: 10,
                maxHp: 50,
                mana: 5,
                maxMana: 20,
                posture: 'FOCUS',
                injuries: { puissance: 'jaune' },
                advantage: true,
                disadvantage: false,
              },
              childSessions: {
                'child-1': { hp: 48, maxHp: 48, mana: 0, maxMana: 0, posture: 'FOCUS' },
              },
            }),
          },
        ],
      })

      const repo = await import('../ParticipantRepository')
      const result = await repo.listParticipantsByCampaign('camp-1')

      expect(result[0]?.session.injuries).toEqual({ puissance: 'jaune' })
      expect(result[0]?.session.advantage).toBe(true)
      expect(result[0]?.session.disadvantage).toBe(false)
      expect(result[0]?.childSessions).toEqual({
        'child-1': {
          hp: 48,
          maxHp: 48,
          mana: 0,
          maxMana: 0,
          posture: 'FOCUS',
          updatedAt: undefined,
          injuries: undefined,
          advantage: undefined,
          disadvantage: undefined,
        },
      })
    })

    it('subscribeParticipantsByCampaign maps snapshot docs through onChange', async () => {
      let capturedCallback: ((snapshot: unknown) => void) | undefined
      firestoreMocks.onSnapshot.mockImplementation((...args: unknown[]) => {
        capturedCallback = args[1] as (snapshot: unknown) => void
        return 'unsubscribe-fn'
      })

      const repo = await import('../ParticipantRepository')
      const onChange = vi.fn<(participants: unknown[]) => void>()
      const result = repo.subscribeParticipantsByCampaign('camp-1', onChange)

      expect(result).toBe('unsubscribe-fn')
      capturedCallback?.({
        docs: [{ id: 'participant-1', data: () => ({ uid: 'uid-1', campaignId: 'camp-1' }) }],
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'participant-1' })])
    })

    it('updateSessionFields merge-writes only the provided keys under session.*', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../ParticipantRepository')
      await repo.updateSessionFields('participant-1', {
        hp: 12,
        injuries: { puissance: 'rouge' },
        advantage: true,
      })

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1)
      const [, updates] = firestoreMocks.updateDoc.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(updates['session.hp']).toBe(12)
      expect(updates['session.injuries']).toEqual({ puissance: 'rouge' })
      expect(updates['session.advantage']).toBe(true)
      expect(updates).not.toHaveProperty('session.mana')
    })

    it('updateChildSession merge-writes only the provided keys under childSessions.<id>.*', async () => {
      firestoreMocks.updateDoc.mockResolvedValue(undefined)

      const repo = await import('../ParticipantRepository')
      await repo.updateChildSession('participant-1', 'child-1', { hp: 40 })

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1)
      const [, updates] = firestoreMocks.updateDoc.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(updates['childSessions.child-1.hp']).toBe(40)
      expect(updates).not.toHaveProperty('childSessions.child-1.mana')
    })
  })
})
