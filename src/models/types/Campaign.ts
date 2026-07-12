import type { Timestamp } from 'firebase/firestore'

export type CampaignStatus = 'recrutement' | 'active' | 'terminee'

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  recrutement: 'Recrutement',
  active: 'Active',
  terminee: 'Terminée',
}

export interface Campaign {
  id: string
  slug: string
  title: string
  lore: string // markdown
  summary: string
  globalNote: string
  gmId: string
  status: CampaignStatus
  createdAt: Timestamp
}
