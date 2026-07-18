import { computed, ref } from 'vue'
import {
  adjustAdventureDice,
  subscribeCampaignSession,
} from '../models/repositories/CampaignSessionRepository'
import type { CampaignSessionState } from '../models/types/CampaignSession'

const sessionCampaignId = ref<string | null>(null)
const sessionState = ref<CampaignSessionState | null>(null)
const error = ref<string | null>(null)
let unsubscribeFn: (() => void) | null = null

export function useCampaignSessionStore() {
  /**
   * Idempotent attach to a campaign's live adventure-dice state.
   * Re-calling with the same campaignId is a no-op; a different campaignId
   * detaches the previous listener first so subscriptions never stack.
   */
  function subscribe(campaignId: string): void {
    if (sessionCampaignId.value === campaignId && unsubscribeFn) {
      return
    }

    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }

    sessionCampaignId.value = campaignId
    error.value = null

    unsubscribeFn = subscribeCampaignSession(campaignId, (state) => {
      sessionState.value = state
    })
  }

  function unsubscribe(): void {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    sessionCampaignId.value = null
    sessionState.value = null
  }

  async function adjust(die: 'aventure' | 'mesaventure', delta: number): Promise<void> {
    error.value = null

    try {
      if (!sessionCampaignId.value) return
      await adjustAdventureDice(sessionCampaignId.value, die, delta)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Impossible de mettre à jour les dés d'aventure."
    }
  }

  return {
    // I-S1: missing doc ⇒ UI renders 0 / 0.
    adventureDice: computed(
      () => sessionState.value?.adventureDice ?? { aventure: 0, mesaventure: 0 },
    ),
    subscribe,
    unsubscribe,
    adjust,
    error: computed(() => error.value),
  }
}
