import type { PrimaryAttributes } from '../../models/types/Character'
import type { SecondaryAttributeName } from '../../models/types/Participant'

// Pure formula module for the "Calculateur de jet" (research D-05, all
// values locked). No Vue, no Firestore — this file must stay importable
// from a plain unit test with zero framework/runtime dependencies.

export type JetCategory = 'physique' | 'social' | 'mental'

export interface JetCategoryMeta {
  label: string
  short: string
  primary: keyof PrimaryAttributes
  subs: [SecondaryAttributeName, SecondaryAttributeName]
  color: string
}

// Locked mapping (spec): Physique → force/(puissance,finesse); Social →
// social/(aura,relation); Mental → mental/(instinct,savoir). Colors match
// legacy's jet-cat-btn palette exactly (legacy-reference/index.html ~l.870-872).
export const JET_CATEGORY_META: Record<JetCategory, JetCategoryMeta> = {
  physique: {
    label: 'Physique',
    short: 'Phys.',
    primary: 'force',
    subs: ['puissance', 'finesse'],
    color: '#C07830',
  },
  social: {
    label: 'Social',
    short: 'Soc.',
    primary: 'social',
    subs: ['aura', 'relation'],
    color: '#30A070',
  },
  mental: {
    label: 'Mental',
    short: 'Men.',
    primary: 'mental',
    subs: ['instinct', 'savoir'],
    color: '#4080C0',
  },
}

/**
 * Final jet total: base (already adjusted for injuries — see
 * `adjustedCategoryPct` in `tickState.ts`, applied BEFORE this call) plus
 * the ticked compétences/race sum and the manual bonus/malus, clamped last
 * to [5, 95]. The base's own floor/pin (from `adjustedCategoryPct`) is a
 * separate, earlier clamp — do not conflate the two: base 5 (pinned) + a
 * +20 manual mod must total 25, not 5.
 */
export function jetTotal(input: { base: number; tickedSum: number; manualMod: number }): number {
  const raw = input.base + input.tickedSum + input.manualMod
  return Math.min(Math.max(raw, 5), 95)
}

/** Manual Bonus/Malus stepper bound: [-100, 100]. */
export function clampManualMod(value: number): number {
  return Math.min(Math.max(value, -100), 100)
}

export type JetTone = 'favorable' | 'medium' | 'risky'

/** Total color tone: >=60 favorable (green), 35-59 medium (gold), <35 risky (red). */
export function totalTone(total: number): JetTone {
  if (total >= 60) return 'favorable'
  if (total >= 35) return 'medium'
  return 'risky'
}
