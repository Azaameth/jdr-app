import { computed, ref } from 'vue'
import type { Campaign } from '../models/types/Campaign'
import {
  assignCampaignMj,
  clearCampaignMj,
  createCampaign,
  listCampaigns,
  type NewCampaignInput,
} from '../models/repositories/CampaignRepository'

const campaigns = ref<Campaign[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const initialized = ref(false)

const currentCampaignId = ref<string | null>(null)

function upsertCampaign(updated: Campaign) {
  const index = campaigns.value.findIndex((campaign) => campaign.id === updated.id)

  if (index === -1) {
    campaigns.value = [updated, ...campaigns.value]
    return
  }

  campaigns.value = campaigns.value.map((campaign) =>
    campaign.id === updated.id ? updated : campaign,
  )
}

export function useCampaignStore() {
  return {
    campaigns: computed(() => campaigns.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    async fetchCampaigns(force = false) {
      if (initialized.value && !force) {
        return
      }

      loading.value = true
      error.value = null

      try {
        campaigns.value = await listCampaigns()
        initialized.value = true
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Erreur de chargement des campagnes.'
      } finally {
        loading.value = false
      }
    },
    selectCampaign(id: string) {
      currentCampaignId.value = id
    },
    async addCampaign(campaign: NewCampaignInput) {
      error.value = null

      try {
        const createdCampaign = await createCampaign(campaign)
        upsertCampaign(createdCampaign)
        return createdCampaign
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Erreur lors de la création de campagne.'
        return null
      }
    },
    async enrollMj(campaignId: string, gmId: string) {
      error.value = null

      try {
        await assignCampaignMj(campaignId, gmId)
        campaigns.value = campaigns.value.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, gmId } : campaign,
        )
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Impossible d’inscrire le MJ.'
      }
    },
    async withdrawMj(campaignId: string) {
      error.value = null

      try {
        await clearCampaignMj(campaignId)
        campaigns.value = campaigns.value.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, gmId: '' } : campaign,
        )
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Impossible de retirer le MJ.'
      }
    },
  }
}
