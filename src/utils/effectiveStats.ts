import type { WeaponArmorItem } from '../models/types/Inventory'

// Pure aggregation module for equipment stat effects (research D1/D2, data
// model "Derived value: Effective max stat"). No Vue, no Firestore — this
// file must stay importable from a plain unit test with zero framework/
// runtime dependencies. Deliberately blind to damageBonus/armorRating/
// statNote (C-004, research D4) — those are unrelated fields that happen to
// live on the same item.

export type EffectiveStatTarget = 'maxHp' | 'maxMana'

/**
 * Sums statBonus.amount across every equipped item targeting `stat`, added
 * to `baseValue`. Ignores damageBonus/armorRating/statNote entirely. No Vue,
 * no Firestore — must stay importable from a plain unit test.
 */
export function computeEffectiveMaxStat(
  baseValue: number,
  items: WeaponArmorItem[],
  stat: EffectiveStatTarget,
): number {
  const bonus = items
    .filter((item) => item.equipped && item.statBonus?.stat === stat)
    .reduce((sum, item) => sum + (item.statBonus?.amount ?? 0), 0)
  return baseValue + bonus
}
