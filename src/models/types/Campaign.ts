import type { Timestamp } from 'firebase/firestore'

// Valeurs canoniques attendues en base pour campaign.Status.
// Garder ces clés stables et utiliser CAMPAIGN_STATUS_LABELS pour l'affichage UI.
export type CampaignStatus = 'Recruiting' | 'Active' | 'Closed'

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  Recruiting: 'Recrutement',
  Active: 'Active',
  Closed: 'Terminée',
}

// Shape of /Campaigns/{campaignId}, per docs/rpg-data-model.md §4.2.
// Description/Lore/GlobalNote are kept as three distinct fields (an
// extension beyond the doc's single `Description`) to preserve the
// existing product content — see NEXTSTEPS.md's migration ledger.
export interface Campaign {
  id: string
  DisplayName: string
  Description: string
  Lore: string // markdown
  GlobalNote: string
  GmId: string
  Status: CampaignStatus
  CreatedAt: Timestamp
  UpdatedAt: Timestamp
}
