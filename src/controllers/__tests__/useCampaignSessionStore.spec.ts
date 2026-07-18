import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useCampaignSessionStore as UseCampaignSessionStoreType } from '../useCampaignSessionStore'
import type { CampaignSessionState } from '../../models/types/CampaignSession'

const mocks = vi.hoisted(() => ({
  subscribeCampaignSession:
    vi.fn<
      (campaignId: string, onChange: (state: CampaignSessionState | null) => void) => () => void
    >(),
  adjustAdventureDice:
    vi.fn<(campaignId: string, die: 'aventure' | 'mesaventure', delta: number) => Promise<void>>(),
}))

vi.mock('../../models/repositories/CampaignSessionRepository', () => mocks)

describe('useCampaignSessionStore', () => {
  let useCampaignSessionStore: typeof UseCampaignSessionStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.subscribeCampaignSession.mockReturnValue(() => {})
    ;({ useCampaignSessionStore } = await import('../useCampaignSessionStore'))
  })

  describe('adventureDice', () => {
    it('defaults to { aventure: 0, mesaventure: 0 } when no state has been received (I-S1)', () => {
      const store = useCampaignSessionStore()

      expect(store.adventureDice.value).toEqual({ aventure: 0, mesaventure: 0 })
    })

    it('reflects the state pushed through subscribe', () => {
      mocks.subscribeCampaignSession.mockImplementation((_campaignId, onChange) => {
        onChange({
          id: 'camp-1',
          campaignId: 'camp-1',
          adventureDice: { aventure: 3, mesaventure: 1 },
        })
        return () => {}
      })
      const store = useCampaignSessionStore()

      store.subscribe('camp-1')

      expect(store.adventureDice.value).toEqual({ aventure: 3, mesaventure: 1 })
    })
  })

  describe('subscribe / unsubscribe', () => {
    it('is idempotent: calling subscribe twice with the same campaignId attaches once', () => {
      const store = useCampaignSessionStore()

      store.subscribe('camp-1')
      store.subscribe('camp-1')

      expect(mocks.subscribeCampaignSession).toHaveBeenCalledTimes(1)
    })

    it('detaches the previous listener when subscribing to a different campaign', () => {
      const firstUnsubscribe = vi.fn<() => void>()
      mocks.subscribeCampaignSession.mockReturnValueOnce(firstUnsubscribe)
      const store = useCampaignSessionStore()

      store.subscribe('camp-1')
      store.subscribe('camp-2')

      expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
      expect(mocks.subscribeCampaignSession).toHaveBeenCalledTimes(2)
    })

    it('unsubscribe detaches the listener and resets adventureDice to defaults', () => {
      const unsubscribe = vi.fn<() => void>()
      mocks.subscribeCampaignSession.mockImplementation((_campaignId, onChange) => {
        onChange({
          id: 'camp-1',
          campaignId: 'camp-1',
          adventureDice: { aventure: 5, mesaventure: 2 },
        })
        return unsubscribe
      })
      const store = useCampaignSessionStore()

      store.subscribe('camp-1')
      expect(store.adventureDice.value).toEqual({ aventure: 5, mesaventure: 2 })

      store.unsubscribe()

      expect(unsubscribe).toHaveBeenCalledTimes(1)
      expect(store.adventureDice.value).toEqual({ aventure: 0, mesaventure: 0 })
    })
  })

  describe('adjust', () => {
    it('does nothing when subscribe has not been called (no campaign context)', async () => {
      const store = useCampaignSessionStore()

      await store.adjust('aventure', 1)

      expect(mocks.adjustAdventureDice).not.toHaveBeenCalled()
    })

    it('delegates to adjustAdventureDice with the subscribed campaignId', async () => {
      const store = useCampaignSessionStore()
      store.subscribe('camp-1')

      await store.adjust('mesaventure', -1)

      expect(mocks.adjustAdventureDice).toHaveBeenCalledWith('camp-1', 'mesaventure', -1)
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.adjustAdventureDice.mockRejectedValue('boom')
      const store = useCampaignSessionStore()
      store.subscribe('camp-1')

      await store.adjust('aventure', 1)

      expect(store.error.value).toBe("Impossible de mettre à jour les dés d'aventure.")
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.adjustAdventureDice.mockRejectedValue(new Error('offline'))
      const store = useCampaignSessionStore()
      store.subscribe('camp-1')

      await store.adjust('aventure', 1)

      expect(store.error.value).toBe('offline')
    })
  })
})
