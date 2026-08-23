import type { GearEntry } from '../models/repositories/EquipmentRepository'

// Pure aggregation module for equipment stat effects (docs/rpg-data-model.md
// §5.4 step 3: equipped gear's BonusRaw is added flat on top of a base-stat
// max/static during materialization). No Vue, no Firestore — this file must
// stay importable from a plain unit test with zero framework/runtime
// dependencies. `items` is always the already-equipped list (Armor + Weapons
// from Equipment/Main) — presence in that list *is* the equipped state, no
// boolean flag to filter on (unlike the retired legacy WeaponArmorItem shape).

export type BaseStatKey =
  | 'Health'
  | 'Mana'
  | 'PhysicalArmor'
  | 'MagicalArmor'
  | 'PhysicalAttack'
  | 'MagicalAttack'
  | 'PhysicalDefense'
  | 'MagicalDefense'

/** Sums BonusRaw[stat] across every equipped entry, added to `baseValue`. */
export function computeEffectiveStat(baseValue: number, items: GearEntry[], stat: BaseStatKey): number {
  const bonus = items.reduce((sum, item) => sum + (item.BonusRaw?.[stat] ?? 0), 0)
  return baseValue + bonus
}

export interface ArmorTotal {
  magique: number
  physique: number
  total: number
}

/** Armor has no stored "raw" base (unlike HP/Mana) — both targets start from 0. */
export function computeArmorTotal(items: GearEntry[]): ArmorTotal {
  const magique = computeEffectiveStat(0, items, 'MagicalArmor')
  const physique = computeEffectiveStat(0, items, 'PhysicalArmor')
  return { magique, physique, total: magique + physique }
}
