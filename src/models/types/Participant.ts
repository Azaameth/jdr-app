export type ParticipantStatus = 'pending' | 'approved' | 'rejected'
export type Posture = 'OFFENSIF' | 'DEFENSIF' | 'FOCUS'

export interface CharacterSessionState {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture
  updatedAt?: string
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
}
