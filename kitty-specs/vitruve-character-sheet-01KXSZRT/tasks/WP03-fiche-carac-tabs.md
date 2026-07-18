---
work_package_id: WP03
title: Fiche & Caractéristiques tabs
dependencies:
- WP02
requirement_refs:
- FR-006
- FR-012
- FR-013
- FR-014
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T014
- T015
- T016
- T017
- T018
agent: claude
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/vitruve/
create_intent:
- src/components/vitruve/FicheTab.vue
- src/components/vitruve/CaracTab.vue
- src/components/vitruve/tickState.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/vitruve/FicheTab.vue
- src/components/vitruve/CaracTab.vue
- src/components/vitruve/tickState.ts
- src/components/vitruve/__tests__/FicheTab.spec.ts
- src/components/vitruve/__tests__/CaracTab.spec.ts
- src/components/vitruve/__tests__/tickState.spec.ts
role: implementer
tags: []
---

# WP03 — Fiche & Caractéristiques tabs

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Fill the two placeholder panes from WP02: **Fiche** (identity: race/genre/langues cards, valeurs pills, editable histoire) and **Caractéristiques** (three category blocks with adjusted-percentage bars, clickable persisted injury squares, checkable compétences and bonus/malus de race lists, posture selector, summary cards). Also create the shared **ephemeral tick-state module** that WP04's calculator will consume.

Behavior reference (DIR-004, behavior only): `legacy-reference/index.html` — `vitruveShowPanel` `fiche` branch (~l.2867) and `carac` branch (~l.2881–3065). Formulas and mappings are already extracted; use the mission docs, not the legacy code.

## Context

- Category mapping (spec, locked): Physique → `attributes.primary.force`, subs `puissance`+`finesse`; Social → `primary.social`, subs `aura`+`relation`; Mental → `primary.mental`, subs `instinct`+`savoir`.
- Adjusted % (research D-05): both subs rouge → **5** flat; else `max(5, base − 10×nb_jaune − 20×nb_rouge)`.
- Injury persistence: `usePlayerStore().setInjury(characterId, attr, 'jaune' | 'rouge' | null)` (WP01). Absent = saine. Cycle on click: saine → jaune → rouge → saine.
- Permissions: injury squares and histoire editing enabled for the character's **owner** or `mj`/`admin` — same predicate style as `canEditInventory` in `PlayerView.vue`; read it and mirror it (don't invent a new helper shape).
- Tick values: compétence = `skill.rank × 10` %; race bonus/malus entries carry signed integers. Ticks are **per-viewer, ephemeral, reset on character switch** (research D-04) — never persisted.
- Race bonus/malus data source: inspect `src/models/types/Race.ts` and the seeded race data to find where bonus/malus entries live; render whatever structured form exists (if races carry none, render the section only when data is present).

## Subtasks

### T014 — `FicheTab.vue`

**File**: `src/components/vitruve/FicheTab.vue` (new)

Props: `character: CharacterProfile`, `raceName: string`, `canEdit: boolean`. Render (FR-012):
1. Card grid: **Race** (raceName), **Genre** (`character.gender`), **Langues** (`character.languages.join(', ')` or '—').
2. **Valeurs** pills — the legacy `valeurs` free-text lines; in the new model check whether `CharacterProfile` carries values data; if only `backstory` exists, render the pills section conditionally from whatever field exists (do not invent schema — if nothing maps, omit the section and note it in WP notes).
3. **Histoire** card: `character.backstory` multi-line (`white-space: pre-line`), '—' when empty.

### T015 — Histoire editing

In `FicheTab.vue`: when `canEdit`, show a French "Modifier l'histoire" affordance switching the card to a textarea with Enregistrer/Annuler; save emits `save-histoire(text)`. The **view** (small integration edit in `PlayerView.vue` — out-of-map, record the one-line rationale in your WP notes) handles the emit by calling `updateCharacter(characterId, { backstory })` (WP01) and refreshing local character state. Errors surface via the view's existing error display, French message.

### T016 — `CaracTab.vue` category blocks + injury squares

**File**: `src/components/vitruve/CaracTab.vue` (new)

Props: `character: CharacterProfile`, `session: CharacterSessionState | null`, `canEdit: boolean`. Emits: `set-injury(attr, state)`.

For each of the three categories (FR-013):
1. Header row: category label, horizontal bar filled to adjusted %, big adjusted-% figure. Both-rouge pin state renders the % in an alert color (legacy used red + heavy border).
2. Two sub-rows (the category's sous-caractéristiques): name, rank/value from `attributes.secondary`, and an **injury square**: outlined when saine, filled jaune (`#D4A843`-family per app palette) when jaune, filled red when rouge. Click (only when `canEdit`) cycles and emits `set-injury` with the *next* state (`null` after rouge).
3. Compute adjusted % in a small exported helper inside `CaracTab.vue`? **No** — import it from WP04's `jetFormula.ts`? Also no (WP04 not merged yet). Put `adjustedCategoryPct(base, states: InjuryState[])` in **`tickState.ts`** (T017's module, this WP) so WP04 can import it; keep it pure.

### T017 — Checkbox lists + `tickState.ts`

**File**: `src/components/vitruve/tickState.ts` (new) + list sections in `CaracTab.vue`

1. `tickState.ts` exports:
   ```ts
   export interface TickEntry { key: string; label: string; value: number } // value in %, signed
   export function useTickState() // singleton-composable: ticked entries map, toggle(entry), sum computed, reset()
   export function adjustedCategoryPct(base: number, states: Array<InjuryState | null>): number
   ```
   Module-scope refs (matches the app's composable pattern); `reset()` clears all ticks — the view calls it on character switch **and** on child-tab context switch (WP06).
2. In `CaracTab.vue`, below the category blocks (FR-006):
   - **Compétences** section: `character.skills` entries that are *not* one of the six secondary-attribute names (case-insensitive match — legacy excluded `savoir (xxx)` variants with a prefix test; replicate with `name.toLowerCase().startsWith(attr)` exclusion). Each row: name, `rank × 10` %, checkbox bound to tick state. Empty ⇒ "Aucune compétence spéciale."
   - **Bonus & malus de race** section: entries from race data with signed values, checkbox per entry. Omit section when no data.

### T018 — Summary cards, posture, tests

1. Top of `CaracTab.vue`: four summary cards — PV / max, Mana / max, Niveau, and the **posture selector** (three options Focus/Offensif/Défensif). Posture uses the existing persisted mechanism in `PlayerView.vue` — move/reuse the existing posture UI or emit `set-posture` to the view; do **not** re-implement persistence. Include the per-posture effects tooltip content from legacy (`POSTURE_FX` lines, French, ~l.2895) as a hover/expand detail.
2. Unit tests:
   - `tickState.spec.ts`: toggle/sum/reset; `adjustedCategoryPct` — the 9 combinations of two subs × {saine, jaune, rouge}: expected `base`, `base−10`, `base−20`, `base−20`(2j), `base−30`, `5`(2r pin), with `max(5, …)` floor cases (e.g. base 20, 2×jaune → 5? No: 20−20=0→floor 5 — assert exactly that).
   - `CaracTab.spec.ts`: renders three categories from a fixture character; injury click emits the correct next state; squares read-only when `canEdit` false.
   - `FicheTab.spec.ts`: renders cards; edit affordance hidden when `canEdit` false; save emits trimmed text.

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (→ `main` via PR at mission end). Single-lane; worktree from `lanes.json`. Implement with:

```
spec-kitty agent action implement WP03 --agent claude
```

## Definition of Done

- [ ] Fiche and Carac panes replace WP02 placeholders (small `PlayerView.vue` integration edit recorded with rationale)
- [ ] Injury cycle persists via `setInjury`, survives reload, gated by owner/MJ predicate
- [ ] Adjusted % matches the formula incl. pin-at-5 (unit-tested, all 9 combos)
- [ ] Ticks ephemeral: reset on character switch, never written to Firestore
- [ ] All strings French; legacy wording for section titles ("Compétences", "Bonus & malus de race", "Histoire")
- [ ] `npm run type-check && npm run lint && npm run test:unit` green; existing e2e untouched and green

## Reviewer Guidance

- Verify the six-name exclusion for the compétences list against a seeded character (skills named exactly like secondary attributes must not appear as checkable extras).
- Check `set-injury` emits the *next* state, not the current one (classic off-by-one in cycle UIs).
- `tickState` is a singleton: confirm reset is wired in the view on character change, or ticks will leak between characters.
- Histoire save path: owner (non-MJ) must succeed — this exercises the new owner backstory-only Firestore rule from WP01; flag if the client sends fields beyond `backstory`.
