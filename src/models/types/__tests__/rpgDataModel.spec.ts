import { describe, expect, it } from 'vitest'

import { isCampaignRulesDocument, isCharacterSheetDocument } from '../RpgDataModel'

describe('RPG data model contract', () => {
  it('accepts a valid CampaignRules document', () => {
    const rules = {
      Statistics: {
        Primary: [
          { Key: 'Strength', Label: 'Force', Min: 0, Max: 20 },
          { Key: 'Agility', Label: 'Agilité', Min: 0, Max: 20 },
        ],
        Secondary: [{ Key: 'Power', Label: 'Puissance', LinkedPrimary: 'Strength', Formula: 'Strength * 0.5' }],
      },
      Dice: {
        DiceNotation: 'd20',
        RoundingMode: 'RoundNearest',
        SuccessDirection: 'AboveOrEqual',
        CriticalThreshold: 1,
      },
      CharacterCreation: {
        HealthMaxFormula: '20 + Strength * 2',
        ManaMaxFormula: '10 + Spirit * 3',
        PointBuyBudget: 20,
        FormulaRounding: 'RoundDown',
      },
      CurrencyName: 'Pièces de cuivre',
      AdvantageDiceCount: 1,
      DisadvantageDiceCount: 1,
      MaxItems: 20,
      MaxArmorSlots: 2,
      MaxWeaponSlots: 2,
      Inventory: {
        nbSlotWeapon: 3,
        nbSlotArmor: 3,
        nbSlotOther: 20,
        currencyName: 'Pièce d\'or',
        Other: [
          { id: 1, name: 'Matériel de camp', slots: 15 },
          { id: 2, name: 'Matériel de soin', slots: 15 },
        ],
      },
    }

    expect(isCampaignRulesDocument(rules)).toBe(true)
  })

  it('accepts a valid character sheet document with a form relationship', () => {
    const character = {
      ParentCharacterId: null,
      ActiveFormId: null,
      DisplayName: 'Aldric',
      Level: 3,
      Status: 'Alive',
      ClassId: 'class-warrior',
      RaceId: 'race-human',
      Statistics: {
        Strength: { Base: 12, Bonus: 2 },
      },
      Secondaries: {
        Power: 8,
      },
      PlayerId: 'user-1',
      CampaignId: 'campaign-1',
    }

    expect(isCharacterSheetDocument(character)).toBe(true)
  })
})
