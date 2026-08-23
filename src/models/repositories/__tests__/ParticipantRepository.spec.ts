import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(),
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

      expect(firestoreMocks.getDocs).not.toHaveBeenCalled()
      expect(firestoreMocks.getDoc).not.toHaveBeenCalled()
    })

    it('subscribeParticipantsByCampaign returns a callable noop and never calls back', async () => {
      const repo = await import('../ParticipantRepository')
      const onChange = vi.fn<(participants: unknown[]) => void>()

      const unsubscribe = repo.subscribeParticipantsByCampaign('camp-1', onChange)
      unsubscribe()

      expect(onChange).not.toHaveBeenCalled()
      expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled()
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
            id: 'uid-1',
            data: () => ({
              uid: 'uid-1',
              campaignId: 'camp-1',
              status: 'Approved',
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
          id: 'uid-1',
          uid: 'uid-1',
          campaignId: 'camp-1',
          status: 'Approved',
          createdAt: '2023-12-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ])
    })

    it('reads the participant directly by uid-keyed doc, not by query', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'uid-1',
        data: () => ({ uid: 'uid-1', campaignId: 'camp-1' }),
      })

      const repo = await import('../ParticipantRepository')
      const result = await repo.getParticipant('uid-1', 'camp-1')

      expect(firestoreMocks.doc).toHaveBeenCalledWith(
        {},
        'Campaigns',
        'camp-1',
        'Players',
        'uid-1',
      )
      expect(firestoreMocks.getDocs).not.toHaveBeenCalled()
      expect(result).toEqual({
        id: 'uid-1',
        uid: 'uid-1',
        campaignId: 'camp-1',
        status: 'Pending',
        createdAt: undefined,
        updatedAt: undefined,
      })
    })

    it('returns null from getParticipant when no doc exists at that uid', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

      const repo = await import('../ParticipantRepository')
      const result = await repo.getParticipant('missing-uid', 'camp-1')

      expect(result).toBeNull()
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
        docs: [{ id: 'uid-1', data: () => ({ uid: 'uid-1', campaignId: 'camp-1' }) }],
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'uid-1' })])
    })
  })
})
