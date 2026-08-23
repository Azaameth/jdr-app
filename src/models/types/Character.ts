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
  manaNote?: string
  damageDice?: string
  damageBonus?: number
  cooldown?: string
  source?: 'race' | 'class' | 'story' | 'item'
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
  /**
   * Canonical Firestore pointer for the active alternate form / active child.
   * Kept in the normalized app object so the UI can resolve the currently
   * active transformation without depending on the legacy camelCase field set.
   */
  activeFormId?: string
  /**
   * Present iff this character is a child (transformation, e.g. Furmiaou).
   * Children are full profiles in the same `characters` collection;
   * depth is 1 (children have no children of their own — enforced by
   * seed tooling and raw-editor validation, not by types).
   */
  parentCharacterId?: string
}
