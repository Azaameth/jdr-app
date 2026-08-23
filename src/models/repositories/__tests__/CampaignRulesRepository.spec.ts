import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  collection: vi.fn<(...args: unknown[]) => unknown>(() => 'collection-ref'),
  getDocs: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  query: vi.fn<(...args: unknown[]) => unknown>(() => 'query-ref'),
  where: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('CampaignRulesRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('when Firebase is not configured', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('returns null and does not query Firestore', async () => {
      const repo = await import('../CampaignRulesRepository')

      await expect(repo.getCampaignRules('camp-1')).resolves.toBeNull()
      expect(firestoreMocks.getDoc).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('reads CampaignRules/Main from the nested campaign path', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          Statistics: { Primary: [], Secondary: [] },
          Dice: { DiceNotation: 'd20', RoundingMode: 'RoundNearest', SuccessDirection: 'AboveOrEqual', CriticalThreshold: 1 },
          CharacterCreation: { HealthMaxFormula: '20 + Strength * 2', ManaMaxFormula: '10 + Spirit * 3', PointBuyBudget: 20, FormulaRounding: 'RoundDown' },
          CurrencyName: 'Pièces',
          AdvantageDiceCount: 1,
          DisadvantageDiceCount: 1,
          MaxItems: 20,
          MaxArmorSlots: 2,
          MaxWeaponSlots: 2,
        }),
      })

      const repo = await import('../CampaignRulesRepository')
      const result = await repo.getCampaignRules('camp-1')

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'Campaigns', 'camp-1', 'CampaignRules', 'Main')
      expect(result).toMatchObject({ CurrencyName: 'Pièces' })
    })
  })
})
