import { computed, reactive } from 'vue'
import type { InjuryState } from '../../models/types/Participant'

/**
 * A single checkable modifier row (compétence bonus or race bonus/malus)
 * that the WP04 jet calculator can sum. `value` is a signed percentage.
 */
export interface TickEntry {
  key: string
  label: string
  value: number
}

// Ephemeral, per-viewer, module-scope singleton state (research D-04): the
// set of currently-ticked modifier entries. Never persisted to Firestore —
// `reset()` clears it on character switch and on child-tab context switch
// (WP06), so ticks never leak between characters or viewers.
const ticked = reactive<Record<string, TickEntry>>({})

export function useTickState() {
  function toggle(entry: TickEntry) {
    if (ticked[entry.key]) {
      delete ticked[entry.key]
    } else {
      ticked[entry.key] = entry
    }
  }

  function isTicked(key: string): boolean {
    return Boolean(ticked[key])
  }

  const sum = computed(() =>
    Object.values(ticked).reduce((total, entry) => total + entry.value, 0),
  )

  function reset() {
    for (const key of Object.keys(ticked)) {
      delete ticked[key]
    }
  }

  return {
    ticked: computed(() => ticked),
    toggle,
    isTicked,
    sum,
    reset,
  }
}

/**
 * Adjusted category percentage (research D-05).
 *
 * `states` holds one entry per sous-caractéristique of the category, in
 * `InjuryState | null` form (`null`/`undefined` = saine, matching the
 * `session.injuries` "absent key ⇒ saine" convention).
 *
 * - Both subs rouge ⇒ pinned at 5 flat (alert state, not a formula result).
 * - Otherwise: base − 10 × nb_jaune − 20 × nb_rouge, floored at 5.
 */
export function adjustedCategoryPct(
  base: number,
  states: Array<InjuryState | null | undefined>,
): number {
  if (states.length > 0 && states.every((state) => state === 'rouge')) {
    return 5
  }

  const nbJaune = states.filter((state) => state === 'jaune').length
  const nbRouge = states.filter((state) => state === 'rouge').length
  return Math.max(5, base - 10 * nbJaune - 20 * nbRouge)
}
