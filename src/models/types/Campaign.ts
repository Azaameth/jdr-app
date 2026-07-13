import type { Timestamp } from 'firebase/firestore'

// Valeurs canoniques attendues en base pour campaign.status.
// Garder ces clés stables et utiliser CAMPAIGN_STATUS_LABELS pour l'affichage UI.
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
  // Firestore: 'recrutement' | 'active' | 'terminee'
  status: CampaignStatus
  createdAt: Timestamp
}
