import { beforeEach, describe, expect, it, vi } from 'vitest'

const rulesMocks = vi.hoisted(() => ({
  getCampaignRules: vi.fn<() => Promise<unknown>>(),
  setCampaignRules: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  DEFAULT_CAMPAIGN_RULES: {
    Statistics: { Primary: [], Secondary: [] },
    Dice: {
      DiceNotation: 'd20',
      RoundingMode: 'RoundNearest',
      SuccessDirection: 'AboveOrEqual',
      CriticalThreshold: 1,
    },
    CharacterCreation: {
      HealthMaxFormula: '0',
      ManaMaxFormula: '0',
      PointBuyBudget: 0,
      FormulaRounding: 'RoundNearest',
    },
    CurrencyName: 'Pièces',
    AdvantageDiceCount: 0,
    DisadvantageDiceCount: 0,
    MaxItems: 0,
    MaxArmorSlots: 0,
    MaxWeaponSlots: 0,
  },
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
    }

    rulesMocks.getCampaignRules.mockResolvedValue(rules)
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    await store.fetchCampaignRules('campaign-1')

    expect(store.rules.value).toEqual(rules)
    expect(store.maxItems.value).toBe(20)
    expect(store.maxArmorSlots.value).toBe(2)
    expect(store.maxWeaponSlots.value).toBe(2)
    expect(rulesMocks.getCampaignRules).toHaveBeenCalledWith('campaign-1')
  })

  it('surfaces the French fallback error when the repository throws a non-Error', async () => {
    rulesMocks.getCampaignRules.mockRejectedValue('boom')
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    await store.fetchCampaignRules('campaign-1')

    expect(store.error.value).toBe('Erreur lors du chargement des règles de campagne.')
  })

  it('updateCampaignRules merges the patch onto the loaded rules and persists it', async () => {
    rulesMocks.getCampaignRules.mockResolvedValue({
      ...rulesMocks.DEFAULT_CAMPAIGN_RULES,
      CurrencyName: 'Pièces',
      MaxItems: 20,
    })
    rulesMocks.setCampaignRules.mockResolvedValue(undefined)
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()
    await store.fetchCampaignRules('campaign-1')

    const ok = await store.updateCampaignRules('campaign-1', { CurrencyName: 'Écus' })

    expect(ok).toBe(true)
    expect(rulesMocks.setCampaignRules).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({ CurrencyName: 'Écus', MaxItems: 20 }),
    )
    expect(store.rules.value?.CurrencyName).toBe('Écus')
    expect(store.maxItems.value).toBe(20)
  })

  it('updateCampaignRules fills in DEFAULT_CAMPAIGN_RULES when the campaign has no rules doc yet', async () => {
    rulesMocks.setCampaignRules.mockResolvedValue(undefined)
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    const ok = await store.updateCampaignRules('campaign-1', { CurrencyName: 'Écus' })

    expect(ok).toBe(true)
    expect(rulesMocks.setCampaignRules).toHaveBeenCalledWith(
      'campaign-1',
      expect.objectContaining({
        CurrencyName: 'Écus',
        Dice: rulesMocks.DEFAULT_CAMPAIGN_RULES.Dice,
      }),
    )
  })

  it('surfaces the French fallback error when the write fails', async () => {
    rulesMocks.setCampaignRules.mockRejectedValue('boom')
    const { useCampaignRulesStore } = await import('../useCampaignRulesStore')
    const store = useCampaignRulesStore()

    const ok = await store.updateCampaignRules('campaign-1', { CurrencyName: 'Écus' })

    expect(ok).toBe(false)
    expect(store.error.value).toBe('Erreur lors de la mise à jour des règles de campagne.')
  })
})
