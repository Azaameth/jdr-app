import { describe, expect, it } from 'vitest'
import { computeArmorTotal, computeEffectiveMaxStat } from '../effectiveStats'
import type { WeaponArmorItem } from '../../models/types/Inventory'

function item(overrides: Partial<WeaponArmorItem>): WeaponArmorItem {
  return { itemId: 'test-item', name: 'Test Item', ...overrides }
}

describe('computeEffectiveMaxStat', () => {
  it('adds a single equipped bonus to the base value', () => {
    const items = [item({ equipped: true, statBonus: { stat: 'maxMana', amount: 4 } })]
    expect(computeEffectiveMaxStat(20, items, 'maxMana')).toBe(24)
  })

  it('stacks two equipped bonuses on the same stat instead of overwriting', () => {
    const items = [
      item({ equipped: true, statBonus: { stat: 'maxMana', amount: 4 } }),
      item({ equipped: true, statBonus: { stat: 'maxMana', amount: 2 } }),
    ]
    expect(computeEffectiveMaxStat(20, items, 'maxMana')).toBe(26)
  })

  it('ignores an unequipped item even if it carries a statBonus', () => {
    const items = [item({ equipped: false, statBonus: { stat: 'maxHp', amount: 10 } })]
    expect(computeEffectiveMaxStat(20, items, 'maxHp')).toBe(20)
  })

  it('contributes 0 for an item with no statBonus at all', () => {
    const items = [
      item({ equipped: true, statNote: 'vs proj. magiques' }),
      item({ equipped: false, damageBonus: 2 }),
    ]
    expect(computeEffectiveMaxStat(20, items, 'maxHp')).toBe(20)
  })

  it('contributes 0 when the bonus targets the other stat', () => {
    const hpItems = [item({ equipped: true, statBonus: { stat: 'maxHp', amount: 5 } })]
    expect(computeEffectiveMaxStat(20, hpItems, 'maxMana')).toBe(20)

    const manaItems = [item({ equipped: true, statBonus: { stat: 'maxMana', amount: 5 } })]
    expect(computeEffectiveMaxStat(20, manaItems, 'maxHp')).toBe(20)
  })

  it('returns the base value unchanged for an empty items array, without throwing', () => {
    expect(() => computeEffectiveMaxStat(20, [], 'maxHp')).not.toThrow()
    expect(computeEffectiveMaxStat(20, [], 'maxHp')).toBe(20)
  })

  it('sums only the equipped-with-matching-stat items in a mixed array', () => {
    const items = [
      item({ equipped: true, statBonus: { stat: 'maxMana', amount: 4 } }),
      item({ equipped: true }),
      item({ equipped: false, statBonus: { stat: 'maxMana', amount: 10 } }),
      item({ equipped: true, statBonus: { stat: 'maxMana', amount: 3 } }),
      item({ equipped: true, statBonus: { stat: 'maxHp', amount: 100 } }),
    ]
    expect(computeEffectiveMaxStat(20, items, 'maxMana')).toBe(27)
  })
})

describe('computeArmorTotal', () => {
  it('sums magique and physique bonuses separately and combines them into total', () => {
    const items = [
      item({ equipped: true, statBonus: { stat: 'armorMagique', amount: 2 } }),
      item({ equipped: true, statBonus: { stat: 'armorPhysique', amount: 3 } }),
    ]
    expect(computeArmorTotal(items)).toEqual({ magique: 2, physique: 3, total: 5 })
  })

  it('stacks multiple items on the same armor category', () => {
    const items = [
      item({ equipped: true, statBonus: { stat: 'armorMagique', amount: 2 } }),
      item({ equipped: true, statBonus: { stat: 'armorMagique', amount: 1 } }),
    ]
    expect(computeArmorTotal(items)).toEqual({ magique: 3, physique: 0, total: 3 })
  })

  it('ignores unequipped items and non-armor statBonus targets', () => {
    const items = [
      item({ equipped: false, statBonus: { stat: 'armorPhysique', amount: 10 } }),
      item({ equipped: true, statBonus: { stat: 'maxHp', amount: 5 } }),
    ]
    expect(computeArmorTotal(items)).toEqual({ magique: 0, physique: 0, total: 0 })
  })

  it('returns all zeros for an empty items array', () => {
    expect(computeArmorTotal([])).toEqual({ magique: 0, physique: 0, total: 0 })
  })
})
