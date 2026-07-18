---
work_package_id: WP04
title: Jet calculator & avantage/désavantage
dependencies:
- WP03
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T019
- T020
- T021
- T022
agent: claude
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/vitruve/
create_intent:
- src/components/vitruve/jetFormula.ts
- src/components/vitruve/JetCalculator.vue
- src/components/vitruve/AdvantageToggles.vue
- src/components/vitruve/__tests__/jetFormula.spec.ts
- src/components/vitruve/__tests__/JetCalculator.spec.ts
- src/components/vitruve/__tests__/AdvantageToggles.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/vitruve/jetFormula.ts
- src/components/vitruve/JetCalculator.vue
- src/components/vitruve/AdvantageToggles.vue
- src/components/vitruve/__tests__/jetFormula.spec.ts
- src/components/vitruve/__tests__/JetCalculator.spec.ts
- src/components/vitruve/__tests__/AdvantageToggles.spec.ts
role: implementer
tags: []
---

# WP04 — Jet calculator & avantage/désavantage

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Build the **display-only** "Calculateur de jet" (pure formula module + UI component mounted in the left sheet's `widgets` slot) and the persisted **Avantages & Désavantages** toggles. The calculator computes a threshold; it never rolls dice, never writes to Firestore. NFR-005 makes the formula's unit-test coverage an explicit acceptance criterion.

## Context

- Formula (research D-05, all locked):
  - `base` = adjusted category % — reuse `adjustedCategoryPct` from `src/components/vitruve/tickState.ts` (WP03); do not duplicate it.
  - `total = clamp(base + tickedSum + manualMod, 5, 95)`.
  - `manualMod` moves in ±5 steps, bounded [−100, +100], with a reset (↺) control.
  - Total color: `>= 60` green/favorable, `35–59` gold/medium, `< 35` red/risky. Base label, "Compétences : ±X%" line (hidden when sum is 0, red-tinted when negative), and "Min. : 5% / Max. : 95%" hints per legacy layout (`#jet-calc`, legacy ~l.866–890).
- Category selection: three buttons `Phys.` / `Soc.` / `Men.`; the active one gets its category color (legacy: `#C07830` / `#30A070` / `#4080C0`).
- Inputs come from: active character (or child — WP06 will pass child context; design the props now), that character's injuries (live from session), tick sum from `useTickState()`, local manual mod.
- Avantage/Désavantage (FR-008): two labeled toggle rows in their own card "Avantages & Désavantages"; both can be on; state persists via `usePlayerStore().setAdvantage/setDisadvantage` and reflects live session values (other viewers see changes). Gated by the owner/MJ predicate (view supplies `canEdit`).

## Subtasks

### T019 — `jetFormula.ts` + exhaustive tests

**File**: `src/components/vitruve/jetFormula.ts` (new)

```ts
export type JetCategory = 'physique' | 'social' | 'mental'
export const JET_CATEGORY_META: Record<JetCategory, { label: string; short: string; primary: keyof PrimaryAttributes; subs: [SecondaryAttributeName, SecondaryAttributeName]; color: string }>
export function jetTotal(input: { base: number; tickedSum: number; manualMod: number }): number // clamp(…, 5, 95)
export function clampManualMod(value: number): number // [-100, 100]
export function totalTone(total: number): 'favorable' | 'medium' | 'risky'
```

`JET_CATEGORY_META` encodes the locked mapping: physique→force/(puissance,finesse), social→social/(aura,relation), mental→mental/(instinct,savoir).

**Tests** (`jetFormula.spec.ts`) — NFR-005 explicitly requires the full state space:
1. All 9 injury combinations for one category via `adjustedCategoryPct` composed with `jetTotal` (base 60 fixture): saine/saine→60, j/s→50, s/j→50, j/j→40, r/s→40, s/r→40, r/j→30, j/r→30, r/r→**5** (pin).
2. Floor: base 20 with 2 jaune → `max(5, 0)` = 5.
3. Clamps: total inputs driving raw values 4→5, 96→95, exactly 5/95 pass through.
4. Boundary tones: 60→favorable, 59→medium, 35→medium, 34→risky.
5. `clampManualMod(±105)` → ±100; step arithmetic stays multiple of 5 from 0.
6. Negative tick sums (malus) reduce the total below base.

### T020 — `JetCalculator.vue`

**File**: `src/components/vitruve/JetCalculator.vue` (new)

Props: `attributes: CharacterAttributes`, `injuries: Partial<Record<SecondaryAttributeName, InjuryState>> | undefined`. Local state: `category` (default `'physique'`), `manualMod` (default 0). Consumes `useTickState()` sum.

Layout (card in the `widgets` slot, title "Calculateur de jet"): category buttons row → "Base : X%" → conditional "Compétences : ±X%" → "Bonus/Malus" − / value / + / ↺ row → separator → "Total à atteindre :" with the big colored total → min/max hints row. All French, legacy wording exactly (NFR-004).

Reset `manualMod` (and rely on view-level tick reset) when the character context changes — accept a `contextKey: string` prop and `watch` it.

### T021 — `AdvantageToggles.vue`

**File**: `src/components/vitruve/AdvantageToggles.vue` (new)

Props: `session: CharacterSessionState | null`, `canEdit: boolean`. Emits `set-advantage(boolean)` / `set-disadvantage(boolean)`. Two rows — "Avantage" (green accent) and "Désavantage" (red accent) — with checkbox visuals matching the app's form controls; disabled when `!canEdit`. The **view** wires emits to `setAdvantage`/`setDisadvantage` (small `PlayerView.vue` integration edit — out-of-map, record the rationale line).

### T022 — Wiring + component tests

1. Mount both components in `VitruveSheet`'s `widgets` slot from `PlayerView.vue` (integration edit, recorded): calculator gets the active character's attributes/injuries + `contextKey = characterId`; toggles get participant session + canEdit.
2. `JetCalculator.spec.ts`: category switch changes base; ticked entries (seed `useTickState` in the test) alter total; mod +/− steps and reset; clamp rendering at extremes; **assert no store/repository mock is ever called** (display-only guarantee).
3. `AdvantageToggles.spec.ts`: reflects session values; emits on click; inert when `canEdit` false.
4. Verify tick reset integration: switching `contextKey` zeroes manual mod, and the view's existing character-switch watcher calls `useTickState().reset()` (added in WP03 — confirm it happens, add if missed, note it).

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (→ `main` via PR at mission end). Single-lane; worktree from `lanes.json`. Implement with:

```
spec-kitty agent action implement WP04 --agent claude
```

## Definition of Done

- [ ] `jetFormula.ts` pure (no Vue/Firestore imports); NFR-005 state-space tests green
- [ ] Calculator UI matches legacy structure/wording; total always 5–95; correct tone colors at 34/35/59/60
- [ ] Calculator provably display-only (test asserts zero writes)
- [ ] Toggles persist, sync from session, respect `canEdit`, both can be active
- [ ] Manual mod + ticks reset on context switch
- [ ] `npm run type-check && npm run lint && npm run test:unit` green

## Reviewer Guidance

- Re-derive the 9-combination table independently and check the test fixtures against it — do not trust the implementation's own numbers.
- Clamp order matters: adjust (floor 5 / pin 5) happens **before** summing ticks/mod, and the final clamp happens **after**; a single combined clamp is wrong (e.g. base 5 pinned + mod +20 must give 25, not 5).
- Confirm `JET_CATEGORY_META` is imported by CaracTab or shares the mapping source — two divergent mappings would be a silent cross-WP bug.
- Toggles: check no local optimistic state shadows the session value (they must reflect remote changes).
