export type MembershipStatus = 'pending' | 'approved' | 'rejected'
export type Posture = 'OFFENSIF' | 'DEFENSIF' | 'FOCUS'

export interface SessionInventoryItem {
  itemId: string
  name: string
  quantity: number
  equipped?: boolean
}

export interface CharacterSessionState {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  posture: Posture
  inventory: SessionInventoryItem[]
  updatedAt?: string
}

export interface Membership {
  uid: string
  campaignId: string
  characterId: string
  status: MembershipStatus
  personalNote: string
  session: CharacterSessionState
  createdAt?: string
  updatedAt?: string
}
