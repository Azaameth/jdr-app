export type CharacterGender = 'Homme' | 'Femme' | 'Autre'

export interface PrimaryAttributes {
  force: number
  social: number
  mental: number
}

// Secondary attributes are core derived axes, not skills.
export interface SecondaryAttributes {
  puissance: number
  finesse: number
  aura: number
  relation: number
  instinct: number
  savoir: number
}

export interface CharacterAttributes {
  primary: PrimaryAttributes
  secondary: SecondaryAttributes
}

export type SkillDomain = 'force' | 'social' | 'mental' | 'general'

export interface CharacterSkill {
  id: string
  name: string
  rank: number
  domain: SkillDomain
  source?: 'base' | 'race' | 'class' | 'equipment' | 'gift'
}

export interface CharacterGift {
  id: string
  name: string
  description: string
  manaCost?: number
  cooldown?: string
  source?: 'race' | 'class' | 'story' | 'item'
}

export type InventoryItemType = 'weapon' | 'armor' | 'consumable' | 'tool' | 'quest' | 'other'

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  type: InventoryItemType
  description?: string
  isEquipped?: boolean
}

export interface CharacterProfile {
  id: string
  campaignId: string
  ownerUid: string
  name: string
  raceId: string
  classId: string
  gender: CharacterGender
  elements: string[]
  level: number
  xp?: number
  attributes: CharacterAttributes
  skills: CharacterSkill[]
  gifts: CharacterGift[]
  languages: string[]
  img: string
  backstory: string
  createdAt?: string
  updatedAt?: string
}
