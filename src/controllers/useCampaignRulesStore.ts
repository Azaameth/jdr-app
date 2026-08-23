import { computed, ref } from 'vue'

import { getCampaignRules } from '../models/repositories/CampaignRulesRepository'
import type { CampaignRulesDocument } from '../models/types/RpgDataModel'

const rules = ref<CampaignRulesDocument | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useCampaignRulesStore() {
  async function fetchCampaignRules(campaignId: string): Promise<CampaignRulesDocument | null> {
    loading.value = true
    error.value = null

    try {
      const nextRules = await getCampaignRules(campaignId)
      rules.value = nextRules
      return nextRules
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors du chargement des règles de campagne.'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    rules: computed(() => rules.value),
    inventory: computed(() => rules.value?.Inventory ?? null),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchCampaignRules,
  }
}
