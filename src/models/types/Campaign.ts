import type { Timestamp } from 'firebase/firestore'

export type CampaignStatus = 'recrutement' | 'active' | 'terminee'

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
