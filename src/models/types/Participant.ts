// Matches /Campaigns/{campaignId}/Players/{uid} per docs/rpg-data-model.md §4.6
// ('Denied' replaces legacy's 'rejected' to match the documented enum). Live
// combat state (hp/mana/posture/injuries/advantage/disadvantage) has moved to
// Campaigns/{id}/Characters/{id}/States/Current — see CharacterStateRepository.ts
// (NEXTSTEPS.md migration ledger, Cluster 3b) — Players/{uid} carries no
// characterId either (per §4.6): the reverse link is Character.PlayerId.
export type ParticipantStatus = 'Pending' | 'Approved' | 'Denied'

// Posture/injury vocabulary stays French-valued by design (no functional
// benefit to recasing, just churn) even though the rest of the target model
// is English/PascalCase — see NEXTSTEPS.md Cluster 3b.
export type Posture = 'OFFENSIF' | 'DEFENSIF' | 'FOCUS'

// Absence of an entry in `injuries` means the sub-caractéristique is saine
// ("healthy") — never store a 'none' state.
export type InjuryState = 'jaune' | 'rouge'
export type SecondaryAttributeName =
  | 'puissance'
  | 'finesse'
  | 'aura'
  | 'relation'
  | 'instinct'
  | 'savoir'

export interface Participant {
  id: string
  uid: string
  campaignId: string
  status: ParticipantStatus
  createdAt?: string
  updatedAt?: string
}
