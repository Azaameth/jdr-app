import { computed, ref } from 'vue'
import type { Campaign } from '../models/types/Campaign'

const campaigns = ref<Campaign[]>([
  {
    id: '1',
    title: 'La Cité des Ombres',
    lore: 'Une campagne sombre où chaque décision a un prix.',
    summary: 'Intrigues politiques et secrets anciens.',
    globalNote: 'Le groupe est à l’aube d’un grand conflit.',
    gmId: 'mj-1',
    status: 'active',
    createdAt: new Date() as unknown as Campaign['createdAt'],
  },
  {
    id: '2',
    title: 'Les Ruines d’Alésia',
    lore: 'Des vestiges préhistoriques réapparaissent.',
    summary: 'Exploration et survie dans un monde hostile.',
    globalNote: 'Des ombres hantent les ruines.',
    gmId: '',
    status: 'recrutement',
    createdAt: new Date() as unknown as Campaign['createdAt'],
  },
])

const currentCampaignId = ref<string | null>(null)

export function useCampaignStore() {
  return {
    campaigns: computed(() => campaigns.value),
    currentCampaignId: computed(() => currentCampaignId.value),
    selectCampaign(id: string) {
      currentCampaignId.value = id
    },
    addCampaign(campaign: Campaign) {
      campaigns.value = [campaign, ...campaigns.value]
    },
    enrollMj(campaignId: string, gmId: string) {
      campaigns.value = campaigns.value.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, gmId } : campaign,
      )
    },
    withdrawMj(campaignId: string) {
      campaigns.value = campaigns.value.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, gmId: '' } : campaign,
      )
    },
  }
}
