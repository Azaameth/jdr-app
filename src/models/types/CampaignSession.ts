// Firestore collection: `campaignSessions`, doc id == campaignId.
// Repository: src/models/repositories/CampaignSessionRepository.ts
// Store: src/controllers/useCampaignSessionStore.ts
export interface CampaignSessionState {
  id: string // == campaignId
  campaignId: string
  adventureDice: { aventure: number; mesaventure: number }
  updatedAt?: string
}
