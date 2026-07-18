import { describe, it, expect } from 'vitest'
import { clampManualMod, jetTotal, totalTone, JET_CATEGORY_META } from '../jetFormula'
import { adjustedCategoryPct } from '../tickState'
import type { InjuryState } from '../../../models/types/Participant'

// NFR-005: the formula's unit-test coverage is an explicit acceptance
// criterion. This suite exhaustively covers the injury state space (all 9
// combinations), the floor/pin case, both ends of the final 5-95 clamp,
// the tone boundaries, the manual-mod bound, and negative tick sums.

describe('jetTotal — 9 injury combinations composed with adjustedCategoryPct (base 60)', () => {
  const SAINE: InjuryState | null = null
  const cases: Array<{ name: string; states: [InjuryState | null, InjuryState | null]; expected: number }> = [
    { name: 'saine/saine', states: [SAINE, SAINE], expected: 60 },
    { name: 'jaune/saine', states: ['jaune', SAINE], expected: 50 },
    { name: 'saine/jaune', states: [SAINE, 'jaune'], expected: 50 },
    { name: 'jaune/jaune', states: ['jaune', 'jaune'], expected: 40 },
    { name: 'rouge/saine', states: ['rouge', SAINE], expected: 40 },
    { name: 'saine/rouge', states: [SAINE, 'rouge'], expected: 40 },
    { name: 'rouge/jaune', states: ['rouge', 'jaune'], expected: 30 },
    { name: 'jaune/rouge', states: ['jaune', 'rouge'], expected: 30 },
    { name: 'rouge/rouge', states: ['rouge', 'rouge'], expected: 5 },
  ]

  for (const { name, states, expected } of cases) {
    it(`${name} → ${expected}`, () => {
      const base = adjustedCategoryPct(60, states)
      const total = jetTotal({ base, tickedSum: 0, manualMod: 0 })
      expect(total).toBe(expected)
    })
  }
})

describe('jetTotal — floor case', () => {
  it('base 20 with 2× jaune floors the adjusted base at 5, total stays 5', () => {
    const base = adjustedCategoryPct(20, ['jaune', 'jaune'])
    expect(base).toBe(5)
    expect(jetTotal({ base, tickedSum: 0, manualMod: 0 })).toBe(5)
  })
})

describe('jetTotal — final 5-95 clamp', () => {
  it('raw 4 clamps up to 5', () => {
    expect(jetTotal({ base: 5, tickedSum: 0, manualMod: -1 })).toBe(5)
  })

  it('raw 96 clamps down to 95', () => {
    expect(jetTotal({ base: 95, tickedSum: 0, manualMod: 1 })).toBe(95)
  })

  it('exactly 5 passes through unchanged', () => {
    expect(jetTotal({ base: 5, tickedSum: 0, manualMod: 0 })).toBe(5)
  })

  it('exactly 95 passes through unchanged', () => {
    expect(jetTotal({ base: 95, tickedSum: 0, manualMod: 0 })).toBe(95)
  })

  it('clamp order: a pinned base of 5 plus a +20 manual mod gives 25, not 5', () => {
    // adjustedCategoryPct's own floor/pin (giving base=5) happens BEFORE
    // jetTotal's sum+clamp — a single combined clamp would wrongly re-pin
    // this to 5 instead of summing to 25.
    const base = adjustedCategoryPct(60, ['rouge', 'rouge'])
    expect(base).toBe(5)
    expect(jetTotal({ base, tickedSum: 0, manualMod: 20 })).toBe(25)
  })
})

describe('totalTone', () => {
  it('60 → favorable', () => {
    expect(totalTone(60)).toBe('favorable')
  })

  it('59 → medium', () => {
    expect(totalTone(59)).toBe('medium')
  })

  it('35 → medium', () => {
    expect(totalTone(35)).toBe('medium')
  })

  it('34 → risky', () => {
    expect(totalTone(34)).toBe('risky')
  })
})

describe('clampManualMod', () => {
  it('105 clamps to 100', () => {
    expect(clampManualMod(105)).toBe(100)
  })

  it('-105 clamps to -100', () => {
    expect(clampManualMod(-105)).toBe(-100)
  })

  it('step arithmetic from 0 stays a multiple of 5', () => {
    let mod = 0
    mod = clampManualMod(mod + 5)
    mod = clampManualMod(mod + 5)
    mod = clampManualMod(mod - 5)
    expect(mod).toBe(5)
    expect(mod % 5).toBe(0)
  })

  it('value already in range passes through unchanged', () => {
    expect(clampManualMod(40)).toBe(40)
  })
})

describe('jetTotal — negative tick sums (malus)', () => {
  it('a negative tickedSum reduces the total below base', () => {
    expect(jetTotal({ base: 60, tickedSum: -20, manualMod: 0 })).toBe(40)
  })

  it('negative tickedSum combined with negative manualMod still clamps at the floor', () => {
    expect(jetTotal({ base: 20, tickedSum: -10, manualMod: -10 })).toBe(5)
  })
})

describe('JET_CATEGORY_META', () => {
  it('encodes the locked category → primary/subs mapping', () => {
    expect(JET_CATEGORY_META.physique.primary).toBe('force')
    expect(JET_CATEGORY_META.physique.subs).toEqual(['puissance', 'finesse'])
    expect(JET_CATEGORY_META.social.primary).toBe('social')
    expect(JET_CATEGORY_META.social.subs).toEqual(['aura', 'relation'])
    expect(JET_CATEGORY_META.mental.primary).toBe('mental')
    expect(JET_CATEGORY_META.mental.subs).toEqual(['instinct', 'savoir'])
  })

  it('encodes the legacy category colors and short labels', () => {
    expect(JET_CATEGORY_META.physique.color).toBe('#C07830')
    expect(JET_CATEGORY_META.social.color).toBe('#30A070')
    expect(JET_CATEGORY_META.mental.color).toBe('#4080C0')
    expect(JET_CATEGORY_META.physique.short).toBe('Phys.')
    expect(JET_CATEGORY_META.social.short).toBe('Soc.')
    expect(JET_CATEGORY_META.mental.short).toBe('Men.')
  })
})
