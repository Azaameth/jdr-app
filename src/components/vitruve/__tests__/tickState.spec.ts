import { describe, it, expect, beforeEach } from 'vitest'
import { adjustedCategoryPct, useTickState } from '../tickState'
import type { InjuryState } from '../../../models/types/Participant'

describe('useTickState', () => {
  beforeEach(() => {
    // The tick map is a module-scope singleton — reset it between tests so
    // suites don't leak state into each other.
    useTickState().reset()
  })

  it('toggle adds an entry, sum reflects its value', () => {
    const state = useTickState()

    state.toggle({ key: 'a', label: 'Compétence A', value: 20 })

    expect(state.isTicked('a')).toBe(true)
    expect(state.sum.value).toBe(20)
  })

  it('toggle again removes the entry', () => {
    const state = useTickState()

    state.toggle({ key: 'a', label: 'Compétence A', value: 20 })
    state.toggle({ key: 'a', label: 'Compétence A', value: 20 })

    expect(state.isTicked('a')).toBe(false)
    expect(state.sum.value).toBe(0)
  })

  it('sum accumulates multiple ticked entries, including negative (malus) values', () => {
    const state = useTickState()

    state.toggle({ key: 'a', label: 'Bonus', value: 20 })
    state.toggle({ key: 'b', label: 'Malus', value: -10 })

    expect(state.sum.value).toBe(10)
  })

  it('is a singleton: a second useTickState() call sees the same ticks', () => {
    const first = useTickState()
    first.toggle({ key: 'a', label: 'Compétence A', value: 20 })

    const second = useTickState()

    expect(second.isTicked('a')).toBe(true)
    expect(second.sum.value).toBe(20)
  })

  it('reset clears all ticked entries', () => {
    const state = useTickState()
    state.toggle({ key: 'a', label: 'A', value: 20 })
    state.toggle({ key: 'b', label: 'B', value: -10 })

    state.reset()

    expect(state.isTicked('a')).toBe(false)
    expect(state.isTicked('b')).toBe(false)
    expect(state.sum.value).toBe(0)
  })
})

describe('adjustedCategoryPct', () => {
  const SAINE: InjuryState | null = null

  // Base 50, all 9 combinations of two subs × {saine, jaune, rouge}.
  it('both saine → base', () => {
    expect(adjustedCategoryPct(50, [SAINE, SAINE])).toBe(50)
  })

  it('saine + jaune → base − 10 (order 1)', () => {
    expect(adjustedCategoryPct(50, [SAINE, 'jaune'])).toBe(40)
  })

  it('jaune + saine → base − 10 (order 2)', () => {
    expect(adjustedCategoryPct(50, ['jaune', SAINE])).toBe(40)
  })

  it('saine + rouge → base − 20 (order 1)', () => {
    expect(adjustedCategoryPct(50, [SAINE, 'rouge'])).toBe(30)
  })

  it('rouge + saine → base − 20 (order 2)', () => {
    expect(adjustedCategoryPct(50, ['rouge', SAINE])).toBe(30)
  })

  it('jaune + jaune → base − 20 (2× jaune)', () => {
    expect(adjustedCategoryPct(50, ['jaune', 'jaune'])).toBe(30)
  })

  it('jaune + rouge → base − 30 (order 1)', () => {
    expect(adjustedCategoryPct(50, ['jaune', 'rouge'])).toBe(20)
  })

  it('rouge + jaune → base − 30 (order 2)', () => {
    expect(adjustedCategoryPct(50, ['rouge', 'jaune'])).toBe(20)
  })

  it('rouge + rouge → pinned at 5 flat, not the formula result', () => {
    // Formula would give 50 - 40 = 10; the pin overrides it to 5.
    expect(adjustedCategoryPct(50, ['rouge', 'rouge'])).toBe(5)
  })

  it('floors at 5: base 20 with 2× jaune (20 − 20 = 0) → 5', () => {
    expect(adjustedCategoryPct(20, ['jaune', 'jaune'])).toBe(5)
  })

  it('floors at 5: a single rouge below the floor still clamps to 5, not negative', () => {
    expect(adjustedCategoryPct(10, [SAINE, 'rouge'])).toBe(5)
  })

  it('treats undefined the same as null (saine)', () => {
    expect(adjustedCategoryPct(50, [undefined, undefined])).toBe(50)
  })

  it('empty states array leaves base untouched (no pin, no reduction)', () => {
    expect(adjustedCategoryPct(50, [])).toBe(50)
  })
})
