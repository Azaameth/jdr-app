---
work_package_id: WP01
title: Two-column character sheet layout
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- NFR-001
- NFR-002
- C-001
- C-002
- C-003
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
agent: ""
assignee: ""
shell_pid: ""
history: []
agent_profile: frontend-freddy
authoritative_surface: src/views/
create_intent:
- src/views/__tests__/PlayerView.spec.ts
- e2e/player-sheet.spec.ts
execution_mode: code_change
model: ''
owned_files:
- src/views/PlayerView.vue
- src/views/__tests__/PlayerView.spec.ts
- e2e/player-sheet.spec.ts
role: implementer
tags: []
---

# Work Package Prompt: WP01 – Two-column character sheet layout

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: (fill from frontmatter `agent` at assignment time)

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

`PlayerView.vue`'s character sheet is currently one long vertical stack of seven `.card`
sections. Reflow it into two columns on desktop, collapsing to one column on mobile at the
existing `800px` breakpoint already used inside the same file.

## Context

Read before starting:
- `spec.md` (Assumptions section — this is a layout-only reflow, not a port of the legacy
  portrait/illustration sidebar)
- `plan.md` Technical Context (explicit column assignment: Identité+Bonus+Attributs left,
  Compétences+Dons+Histoire+Session right)
- `src/views/PlayerView.vue` (full file — template starts line 132, styles start line 282;
  note the existing `@media (max-width: 800px)` block at the bottom that already collapses
  `.grid-2`/`.grid-3`/`.bonus-grid` to one column — reuse this breakpoint value)
- `src/views/TeamView.vue` — not touched by this WP, but shares the same dark theme color
  palette (`#1a1208`/`#5c4a2a`/`#f0c96a`) if you need a reference for any new wrapper styling

### Subtask T001: Two-column grid wrapper

**Purpose**: FR-001 — the actual layout change.

**Steps**:
1. In `PlayerView.vue`'s template, wrap the seven existing `<section class="card">` blocks in
   two new wrapper `<div>`s (e.g. `.player-view-col-left`, `.player-view-col-right`) inside a
   new grid container, without changing anything *inside* each `<section>` — this is a pure
   restructuring of the wrapping elements, section content/conditionals stay byte-for-byte
   identical (NFR-002).
2. Column assignment (per plan.md): left = Identité, Bonus de race et de classe, Attributs.
   Right = Compétences, Dons, Histoire, État de session.
3. Replace `.player-view`'s `display: flex; flex-direction: column` with a two-column CSS grid
   (e.g. `display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start;` —
   `align-items: start` prevents the shorter column from stretching to match the taller one,
   addressing US1 Acceptance Scenario 2). Remove or raise the current `max-width: 860px` cap
   since two columns need more horizontal room (decide a sensible new max-width, e.g. 1400px,
   during implementation — not prescribed further here).
4. Each column wrapper itself stays `display: flex; flex-direction: column; gap: 1rem` (same
   gap the single-column layout already used) so sections within a column keep their existing
   vertical spacing.

**Files**: `src/views/PlayerView.vue` (modified, template ~+10 lines restructuring, styles ~+15 lines)
**Validation**: `npm run type-check` and `npm run lint` pass; manually verified in-browser at a desktop width.

### Subtask T002: Mobile collapse

**Purpose**: FR-002/NFR-001 — don't break mobile.

**Steps**:
1. In the existing `@media (max-width: 800px)` block, add the two-column grid container to the
   selectors that collapse to `grid-template-columns: 1fr` (or simplest: also set
   `display: block` / `flex-direction: column` on the outer container at this breakpoint so
   both column wrappers stack full-width in their original order — left column's sections
   first, then right column's sections, preserving overall top-to-bottom reading order per
   US3).
2. Confirm existing inner grids (`.grid-2`, `.grid-3`, `.bonus-grid`) still collapse correctly
   — this WP must not accidentally remove or duplicate that existing rule.

**Files**: `src/views/PlayerView.vue` (same file, styles ~+5 lines)
**Validation**: Manually verified at ≤800px width — single column, sections in original order, no regression to the existing inner-grid collapse behavior.

### Subtask T003: Tests

**Purpose**: SC-003/SC-004 — guard against content regression on a file with zero prior test coverage.

**Steps**:
1. Create `src/views/__tests__/PlayerView.spec.ts`. Mock `CharacterRepository.getCharacterById`,
   `MembershipRepository.getMembershipByCharacterId`, `RaceRepository.listRacesByCampaign`,
   `ClassRepository.listClassesByCampaign`, and `useAuthStore` (mock a non-`joueur` role so the
   forbidden-access guard doesn't trigger), following the mocking style already used in
   `src/views/__tests__/FactionBrowserView.spec.ts`. Fixture: one fully-populated character
   (all optional fields present — xp, gifts, lore.notesPrivate, session.inventory) so every
   conditional section renders.
2. Assert all seven section headings render (`Identité` has no `<h2>` itself — the character
   name `<h1>` stands in for it; assert the other six `<h2>` texts: "Bonus de race et de
   classe", "Attributs principaux", "Compétences", "Dons", "Histoire", "État de session").
   This is a content-presence smoke test, not a layout/column-placement test (CSS grid
   placement isn't meaningfully assertable via jsdom — don't attempt to assert computed
   styles or bounding boxes).
3. Create `e2e/player-sheet.spec.ts` following `e2e/castes.spec.ts`'s pattern (unauthenticated
   redirect check only — same pre-existing no-auth-fixture limitation, don't attempt to build
   one here).

**Files**: `src/views/__tests__/PlayerView.spec.ts` (new, ~60 lines), `e2e/player-sheet.spec.ts` (new, ~15 lines)
**Validation**: `npm run test:unit` and `CI=1 npx playwright test --project=chromium e2e/player-sheet.spec.ts` both pass.

## Definition of Done

- [ ] Character sheet renders in two columns on desktop (≥1024px), matching the column
      assignment in plan.md
- [ ] Sheet collapses to a single, correctly-ordered column at ≤800px (reusing the existing
      breakpoint, not a new value)
- [ ] No section's content or conditional logic changed — verified by the new unit test and a
      manual before/after comparison
- [ ] No section visually splits across the column boundary
- [ ] New unit + e2e tests pass; `npm run type-check`, `npm run lint`, `npm run test:unit` all pass

## Risks

- **Silent content drift during restructuring**: moving seven `<section>` blocks into new
  wrapper `<div>`s is mechanical but easy to fat-finger (dropped `v-if`, reordered attribute,
  etc.) — diff the template restructuring carefully against the original, section by section.
- **max-width removal side effects**: raising/removing `max-width: 860px` could make the sheet
  look too sparse on very wide monitors if the grid columns don't have their own reasonable cap
  — verify visually at a few widths (1024px, 1440px, 1920px), not just one.

## Reviewer Guidance

- Confirm zero content/conditional changes inside any `<section>` — this WP should be a pure
  wrap-and-restyle; flag anything that touches what's rendered, not just how it's arranged.
- Confirm the 800px breakpoint value matches the one already used elsewhere in this same file
  (not a newly-introduced different value).
- Manually check a character with very sparse data (e.g. no gifts, no `xp`, no
  `notesPrivate`) alongside a fully-populated one — confirm the shorter resulting column
  doesn't look broken (per US1 Acceptance Scenario 2, `align-items: start` should handle this,
  but verify visually).

Implementation command: `spec-kitty agent action implement WP01 --agent <name>`

## Activity Log
