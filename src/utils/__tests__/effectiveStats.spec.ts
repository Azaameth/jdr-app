import { describe, expect, it } from 'vitest'
import { computeArmorTotal, computeEffectiveStat } from '../effectiveStats'
import type { GearEntry } from '../../models/repositories/EquipmentRepository'

function entry(overrides: Partial<GearEntry> = {}): GearEntry {
  return { EntryId: 'test-entry', DisplayName: 'Test Item', ...overrides }
}

describe('computeEffectiveStat', () => {
  it('adds a single equipped bonus to the base value', () => {
    const items = [entry({ BonusRaw: { Mana: 4 } })]
    expect(computeEffectiveStat(20, items, 'Mana')).toBe(24)
  })

  it('stacks two equipped bonuses on the same stat instead of overwriting', () => {
    const items = [entry({ BonusRaw: { Mana: 4 } }), entry({ BonusRaw: { Mana: 2 } })]
    expect(computeEffectiveStat(20, items, 'Mana')).toBe(26)
  })

  it('contributes 0 for an item with no matching BonusRaw entry', () => {
    const items = [entry({ Description: 'Une babiole sans effet' }), entry({ BonusRaw: {} })]
    expect(computeEffectiveStat(20, items, 'Health')).toBe(20)
  })

  it('contributes 0 when the bonus targets a different stat', () => {
    const hpItems = [entry({ BonusRaw: { Health: 5 } })]
    expect(computeEffectiveStat(20, hpItems, 'Mana')).toBe(20)

    const manaItems = [entry({ BonusRaw: { Mana: 5 } })]
    expect(computeEffectiveStat(20, manaItems, 'Health')).toBe(20)
  })

  it('returns the base value unchanged for an empty items array, without throwing', () => {
    expect(() => computeEffectiveStat(20, [], 'Health')).not.toThrow()
    expect(computeEffectiveStat(20, [], 'Health')).toBe(20)
  })

  it('sums only the matching-stat items in a mixed array', () => {
    const items = [
      entry({ BonusRaw: { Mana: 4 } }),
      entry({}),
      entry({ BonusRaw: { Mana: 3 } }),
      entry({ BonusRaw: { Health: 100 } }),
    ]
    expect(computeEffectiveStat(20, items, 'Mana')).toBe(27)
  })
})

describe('computeArmorTotal', () => {
  it('sums magique and physique bonuses separately and combines them into total', () => {
    const items = [entry({ BonusRaw: { MagicalArmor: 2 } }), entry({ BonusRaw: { PhysicalArmor: 3 } })]
    expect(computeArmorTotal(items)).toEqual({ magique: 2, physique: 3, total: 5 })
  })

  it('stacks multiple items on the same armor category', () => {
    const items = [entry({ BonusRaw: { MagicalArmor: 2 } }), entry({ BonusRaw: { MagicalArmor: 1 } })]
    expect(computeArmorTotal(items)).toEqual({ magique: 3, physique: 0, total: 3 })
  })

  it('ignores non-armor BonusRaw targets', () => {
    const items = [entry({ BonusRaw: { Health: 5 } })]
    expect(computeArmorTotal(items)).toEqual({ magique: 0, physique: 0, total: 0 })
  })

  it('returns all zeros for an empty items array', () => {
    expect(computeArmorTotal([])).toEqual({ magique: 0, physique: 0, total: 0 })
  })
})
