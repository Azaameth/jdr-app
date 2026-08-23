export type CampaignStatKey = string
export type CharacterStatus = 'Alive' | 'Dead' | 'Gone' | 'Deleted'
export type DiceSuccessDirection = 'AboveOrEqual' | 'BelowOrEqual'
export type DiceRoundingMode = 'RoundNearest' | 'RoundDown' | 'RoundUp'
export type FormulaRoundingMode = 'RoundNearest' | 'RoundDown' | 'RoundUp'

export interface PrimaryStatDefinition {
  Key: string
  Label: string
  Min: number
  Max: number
}

export interface SecondaryStatDefinition {
  Key: string
  Label: string
  LinkedPrimary: string
  Formula: string
}

export interface CampaignRulesDocument {
  Statistics: {
    Primary: PrimaryStatDefinition[]
    Secondary: SecondaryStatDefinition[]
  }
  Dice: {
    DiceNotation: string
    RoundingMode: DiceRoundingMode
    SuccessDirection: DiceSuccessDirection
    CriticalThreshold: number
  }
  CharacterCreation: {
    HealthMaxFormula: string
    ManaMaxFormula: string
    PointBuyBudget: number
    FormulaRounding: FormulaRoundingMode
  }
  CurrencyName: string
  AdvantageDiceCount: number
  DisadvantageDiceCount: number
  MaxItems: number
  MaxArmorSlots: number
  MaxWeaponSlots: number
}

export interface CharacterStatBlock {
  Base: number
  Bonus: number
}

export interface CharacterSheetDocument {
  ParentCharacterId: string | null
  ActiveFormId: string | null
  DisplayName: string
  Description?: string
  PictureUrl?: string
  Gender?: string
  Level: number
  Status: CharacterStatus
  ClassId?: string
  RaceId?: string
  Statistics: Record<string, CharacterStatBlock>
  Secondaries?: Record<string, number>
  Actions?: Record<string, { Description: string; Value: unknown }>
  Skills?: Record<string, { Description: string; Value: unknown }>
  AdvantageDiceCount?: number
  DisadvantageDiceCount?: number
  Elements?: string[]
  Languages?: string[]
  PlayerId: string
  CampaignId: string
  CreatedAt?: Date | string
  UpdatedAt?: Date | string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPrimaryStatDefinition(value: unknown): value is PrimaryStatDefinition {
  if (!isRecord(value)) return false
  return (
    typeof value.Key === 'string' &&
    typeof value.Label === 'string' &&
    hasNumber(value.Min) &&
    hasNumber(value.Max)
  )
}

function isSecondaryStatDefinition(value: unknown): value is SecondaryStatDefinition {
  if (!isRecord(value)) return false
  return (
    typeof value.Key === 'string' &&
    typeof value.Label === 'string' &&
    typeof value.LinkedPrimary === 'string' &&
    typeof value.Formula === 'string'
  )
}

export function isCampaignRulesDocument(value: unknown): value is CampaignRulesDocument {
  if (!isRecord(value)) return false

  const statistics = value.Statistics
  const dice = value.Dice
  const characterCreation = value.CharacterCreation

  return (
    isRecord(statistics) &&
    Array.isArray(statistics.Primary) &&
    statistics.Primary.every(isPrimaryStatDefinition) &&
    Array.isArray(statistics.Secondary) &&
    statistics.Secondary.every(isSecondaryStatDefinition) &&
    isRecord(dice) &&
    typeof dice.DiceNotation === 'string' &&
    /^d\d+$/.test(dice.DiceNotation) &&
    typeof dice.RoundingMode === 'string' &&
    ['RoundNearest', 'RoundDown', 'RoundUp'].includes(dice.RoundingMode) &&
    typeof dice.SuccessDirection === 'string' &&
    ['AboveOrEqual', 'BelowOrEqual'].includes(dice.SuccessDirection) &&
    hasNumber(dice.CriticalThreshold) &&
    isRecord(characterCreation) &&
    typeof characterCreation.HealthMaxFormula === 'string' &&
    typeof characterCreation.ManaMaxFormula === 'string' &&
    hasNumber(characterCreation.PointBuyBudget) &&
    typeof characterCreation.FormulaRounding === 'string' &&
    ['RoundNearest', 'RoundDown', 'RoundUp'].includes(characterCreation.FormulaRounding) &&
    typeof value.CurrencyName === 'string' &&
    hasNumber(value.AdvantageDiceCount) &&
    hasNumber(value.DisadvantageDiceCount) &&
    hasNumber(value.MaxItems) &&
    hasNumber(value.MaxArmorSlots) &&
    hasNumber(value.MaxWeaponSlots)
  )
}

function isCharacterStatBlock(value: unknown): value is CharacterStatBlock {
  if (!isRecord(value)) return false
  return hasNumber(value.Base) && hasNumber(value.Bonus)
}

export function isCharacterSheetDocument(value: unknown): value is CharacterSheetDocument {
  if (!isRecord(value)) return false

  const statistics = value.Statistics
  return (
    (value.ParentCharacterId === null || typeof value.ParentCharacterId === 'string') &&
    (value.ActiveFormId === null || typeof value.ActiveFormId === 'string') &&
    typeof value.DisplayName === 'string' &&
    typeof value.Level === 'number' &&
    typeof value.Status === 'string' &&
    ['Alive', 'Dead', 'Gone', 'Deleted'].includes(value.Status) &&
    isRecord(statistics) &&
    Object.values(statistics).every(isCharacterStatBlock) &&
    (value.Secondaries === undefined || (isRecord(value.Secondaries) && Object.values(value.Secondaries).every((entry) => typeof entry === 'number'))) &&
    typeof value.PlayerId === 'string' &&
    typeof value.CampaignId === 'string'
  )
}
