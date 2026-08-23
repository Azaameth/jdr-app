// Shape of /Campaigns/{campaignId}/Races/{raceId}, per docs/rpg-data-model.md §4.5.
// Strengths/Weaknesses are an extension beyond the documented contract:
// the target's `Traits` map has no strength/weakness polarity, but the
// legacy racial "points forts"/"points faibles" content is real, actively
// rendered product content — see NEXTSTEPS.md's migration ledger (Cluster 2).
export interface Race {
  id: string
  DisplayName: string
  Description: string
  PictureUrl: string
  Bonuses: Record<string, number>
  Traits: Record<string, { Description: string; Value: string }>
  StatConstraints: Record<string, { Min: number; Max: number }>
  Strengths: string[]
  Weaknesses: string[]
}
