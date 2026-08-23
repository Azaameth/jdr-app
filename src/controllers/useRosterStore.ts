import { computed, ref } from 'vue'
import {
  getRosterSummary,
  subscribeRosterSummary,
  type RosterSummaryDocument,
} from '../models/repositories/RosterRepository'

const emptySummary: RosterSummaryDocument = {
  Characters: {},
  UpdatedAt: undefined,
}

const summary = ref<RosterSummaryDocument>(emptySummary)
const loading = ref(false)
const error = ref<string | null>(null)
const currentCampaignId = ref<string | null>(null)
let unsubscribeFn: (() => void) | null = null

export function useRosterStore() {
  function subscribe(campaignId: string): void {
    if (currentCampaignId.value === campaignId && unsubscribeFn) {
      return
    }

    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }

    currentCampaignId.value = campaignId
    error.value = null

    unsubscribeFn = subscribeRosterSummary(campaignId, (nextSummary) => {
      summary.value = nextSummary ?? { ...emptySummary, Characters: {} }
    })
  }

  function unsubscribe(): void {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    currentCampaignId.value = null
    summary.value = { ...emptySummary, Characters: {} }
  }

  async function fetch(campaignId: string): Promise<RosterSummaryDocument | null> {
    loading.value = true
    error.value = null

    try {
      const nextSummary = await getRosterSummary(campaignId)
      if (nextSummary) {
        summary.value = nextSummary
      }
      return nextSummary
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors du chargement du roster.'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    summary: computed(() => summary.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    subscribe,
    unsubscribe,
    fetch,
  }
}
