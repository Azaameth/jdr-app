import { computed, ref } from 'vue'

import {
  DEFAULT_CAMPAIGN_RULES,
  getCampaignRules,
  setCampaignRules,
} from '../models/repositories/CampaignRulesRepository'
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

  // Merges patch onto the currently-loaded rules (or a fully-shaped default
  // when the campaign has never had a rules doc) so every write is a
  // complete, valid CampaignRulesDocument — never a partial one missing
  // Statistics/CharacterCreation, which this cluster's UI doesn't edit.
  async function updateCampaignRules(
    campaignId: string,
    patch: Partial<CampaignRulesDocument>,
  ): Promise<boolean> {
    error.value = null
    const next: CampaignRulesDocument = { ...(rules.value ?? DEFAULT_CAMPAIGN_RULES), ...patch }

    try {
      await setCampaignRules(campaignId, next)
      rules.value = next
      return true
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour des règles de campagne.'
      return false
    }
  }

  return {
    rules: computed(() => rules.value),
    maxItems: computed(() => rules.value?.MaxItems ?? null),
    maxArmorSlots: computed(() => rules.value?.MaxArmorSlots ?? null),
    maxWeaponSlots: computed(() => rules.value?.MaxWeaponSlots ?? null),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchCampaignRules,
    updateCampaignRules,
  }
}
