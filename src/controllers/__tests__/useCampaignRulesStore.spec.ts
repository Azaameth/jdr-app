import { beforeEach, describe, expect, it, vi } from 'vitest'

const rulesMocks = vi.hoisted(() => ({
  getCampaignRules: vi.fn<() => Promise<unknown>>(),
}))

vi.mock('../../models/repositories/CampaignRulesRepository', () => rulesMocks)

describe('useCampaignRulesStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('loads campaign rules and exposes them through the store', async () => {
    const rules = {
      Statistics: {
        Primary: [{ Key: 'Strength', Label: 'Force', Min: 0, Max: 20 }],
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
      CurrencyName: 'Pièces',
      AdvantageDiceCount: 1,
      DisadvantageDiceCount: 1,
      MaxItems: 20,
      MaxArmorSlots: 2,
      MaxWeaponSlots: 2,
      Inventory: {
        nbSlotWeapon: 3,
        nbSlotArmor: 3,
        nbSlotOther: 20,
        currencyName: "Pièce d'or",
        Other: [
          { id: 1, name: 'Matériel de camp', slots: 15 },
          { id: 2, name: 'Matériel de soin', slots: 15 },
        ],
      },
    }

    rulesMocks.getCampaignRules.mockResolvedValue(rules)
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    await store.fetchCampaignRules('campaign-1')

    expect(store.rules.value).toEqual(rules)
    expect(store.inventory.value).toEqual(rules.Inventory)
    expect(rulesMocks.getCampaignRules).toHaveBeenCalledWith('campaign-1')
  })

  it('surfaces the French fallback error when the repository throws a non-Error', async () => {
    rulesMocks.getCampaignRules.mockRejectedValue('boom')
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    await store.fetchCampaignRules('campaign-1')

    expect(store.error.value).toBe('Erreur lors du chargement des règles de campagne.')
  })
})
