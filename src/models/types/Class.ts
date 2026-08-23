// Shape of /Campaigns/{campaignId}/Classes/{classId}, per docs/rpg-data-model.md §4.5.
// HealthNote/ManaNote/ArmorNote are an extension beyond the documented
// contract: legacy free-text combat-stat badges (e.g. "+2", "Impossible")
// that don't reduce to clean numeric `Bonuses` without inventing values —
// see NEXTSTEPS.md's migration ledger (Cluster 2).
export interface ClassTrait {
  Description: string
  Value: string
}

export interface Class {
  id: string
  DisplayName: string
  Description: string
  PictureUrl: string
  Bonuses: Record<string, number>
  Traits: Record<string, ClassTrait>
  StatConstraints: Record<string, { Min: number; Max: number }>
  HealthNote: string
  ManaNote: string
  ArmorNote: string
}
