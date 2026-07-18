import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  onSnapshot: vi.fn<(...args: unknown[]) => unknown>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('CampaignSessionRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('when Firebase is not configured (no db)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('no-ops every exported function without touching Firestore', async () => {
      const repo = await import('../CampaignSessionRepository')

      expect(await repo.getCampaignSession('camp-1')).toBeNull()
      expect(await repo.adjustAdventureDice('camp-1', 'aventure', 1)).toBeUndefined()

      const onChange = vi.fn<(state: unknown) => void>()
      const unsubscribe = repo.subscribeCampaignSession('camp-1', onChange)
      unsubscribe()

      expect(onChange).not.toHaveBeenCalled()
      expect(firestoreMocks.getDoc).not.toHaveBeenCalled()
      expect(firestoreMocks.setDoc).not.toHaveBeenCalled()
      expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('getCampaignSession returns null when the doc does not exist', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

      const repo = await import('../CampaignSessionRepository')
      const result = await repo.getCampaignSession('camp-1')

      expect(result).toBeNull()
    })

    it('getCampaignSession defaults adventureDice to 0/0 when absent (I-S1)', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'camp-1',
        data: () => ({ campaignId: 'camp-1' }),
      })

      const repo = await import('../CampaignSessionRepository')
      const result = await repo.getCampaignSession('camp-1')

      expect(result).toEqual({
        id: 'camp-1',
        campaignId: 'camp-1',
        adventureDice: { aventure: 0, mesaventure: 0 },
        updatedAt: undefined,
      })
    })

    it('adjustAdventureDice creates the doc from 0 when missing and increments the target die', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })
      firestoreMocks.setDoc.mockResolvedValue(undefined)

      const repo = await import('../CampaignSessionRepository')
      await repo.adjustAdventureDice('camp-1', 'aventure', 1)

      expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1)
      const [, payload, options] = firestoreMocks.setDoc.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
        unknown,
      ]
      expect(payload.adventureDice).toEqual({ aventure: 1, mesaventure: 0 })
      expect(options).toEqual({ merge: true })
    })

    it('adjustAdventureDice clamps the result at 0 (never negative, I-S3)', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'camp-1',
        data: () => ({ campaignId: 'camp-1', adventureDice: { aventure: 0, mesaventure: 2 } }),
      })
      firestoreMocks.setDoc.mockResolvedValue(undefined)

      const repo = await import('../CampaignSessionRepository')
      await repo.adjustAdventureDice('camp-1', 'aventure', -5)

      const [, payload] = firestoreMocks.setDoc.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(payload.adventureDice).toEqual({ aventure: 0, mesaventure: 2 })
    })

    it('adjustAdventureDice leaves the other die untouched', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'camp-1',
        data: () => ({ campaignId: 'camp-1', adventureDice: { aventure: 3, mesaventure: 1 } }),
      })
      firestoreMocks.setDoc.mockResolvedValue(undefined)

      const repo = await import('../CampaignSessionRepository')
      await repo.adjustAdventureDice('camp-1', 'mesaventure', 2)

      const [, payload] = firestoreMocks.setDoc.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(payload.adventureDice).toEqual({ aventure: 3, mesaventure: 3 })
    })

    it('subscribeCampaignSession maps the snapshot through onChange, and null when absent', async () => {
      let capturedCallback: ((snapshot: unknown) => void) | undefined
      firestoreMocks.onSnapshot.mockImplementation((...args: unknown[]) => {
        capturedCallback = args[1] as (snapshot: unknown) => void
        return 'unsubscribe-fn'
      })

      const repo = await import('../CampaignSessionRepository')
      const onChange = vi.fn<(state: unknown) => void>()
      const result = repo.subscribeCampaignSession('camp-1', onChange)

      expect(result).toBe('unsubscribe-fn')

      capturedCallback?.({ exists: () => false })
      expect(onChange).toHaveBeenLastCalledWith(null)

      capturedCallback?.({
        exists: () => true,
        id: 'camp-1',
        data: () => ({ campaignId: 'camp-1', adventureDice: { aventure: 2, mesaventure: 0 } }),
      })
      expect(onChange).toHaveBeenLastCalledWith({
        id: 'camp-1',
        campaignId: 'camp-1',
        adventureDice: { aventure: 2, mesaventure: 0 },
        updatedAt: undefined,
      })
    })
  })
})
