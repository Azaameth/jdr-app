// Matches /Campaigns/{campaignId}/Players/{uid}.Status per docs/rpg-data-model.md §4.6
// ('Denied' replaces legacy's 'rejected' to match the documented enum).
export type ParticipantStatus = 'Pending' | 'Approved' | 'Denied'
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

export interface CharacterSessionState {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture
  updatedAt?: string
  // Key present ⇔ that sub-caractéristique is jaune/rouge; absent = saine.
  injuries?: Partial<Record<SecondaryAttributeName, InjuryState>>
  // Both may be true simultaneously (spec FR-008). Absent = false.
  advantage?: boolean
  disadvantage?: boolean
}

export interface Participant {
  id: string
  uid: string
  campaignId: string
  characterId: string
  status: ParticipantStatus
  session: CharacterSessionState
  createdAt?: string
  updatedAt?: string
  // Session state for the owner's child characters (transformations),
  // keyed by child characterId. Children get no participant doc of their own.
  childSessions?: Record<string, CharacterSessionState>
}
