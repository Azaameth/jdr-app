// Kept in sync by hand with src/utils/effectiveStats.ts (the client-side
// copy) — this Functions codebase is its own npm package with its own build,
// so it can't import across the functions/src boundary without a shared
// package. Both copies are tiny, pure, and framework-free by design; if this
// ever drifts beyond these two stats, promote it to a shared workspace
// package instead of a third copy.

export interface GearEntry {
  EntryId: string
  DisplayName: string
  Description?: string
  BonusRaw?: Record<string, number>
  BonusConditional?: Array<{ Name: string; Effects: Record<string, number> }>
}

export type BaseStatKey = 'Health' | 'Mana'

export function computeEffectiveStat(baseValue: number, items: GearEntry[], stat: BaseStatKey): number {
  const bonus = items.reduce((sum, item) => sum + (item.BonusRaw?.[stat] ?? 0), 0)
  return baseValue + bonus
}
