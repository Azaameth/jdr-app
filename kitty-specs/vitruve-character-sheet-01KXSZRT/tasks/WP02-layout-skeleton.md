---
work_package_id: WP02
title: Vitruve layout skeleton & tab host
dependencies:
- WP01
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-011
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T009
- T010
- T011
- T012
- T013
agent: "claude:sonnet:reviewer-renata:reviewer"
shell_pid: "35158"
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/views/
create_intent:
- src/components/vitruve/VitruveSheet.vue
- src/components/vitruve/__tests__/VitruveSheet.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/views/PlayerView.vue
- src/views/__tests__/**
- src/components/vitruve/VitruveSheet.vue
- src/components/vitruve/__tests__/VitruveSheet.spec.ts
role: implementer
tags: []
---

# WP02 — Vitruve layout skeleton & tab host

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Restructure `src/views/PlayerView.vue` into the legacy "vitruve" two-column layout — left sheet column + right tabbed panel — **relocating the existing Dons and Inventaire features into tabs completely unchanged**. Fiche and Caractéristiques tabs render placeholder panes (filled by WP03). This WP is the mission's biggest non-regression risk (spec C-005): the existing inventory/dons behavior, permissions, and read-only fallback must survive byte-for-byte behaviorally.

## Context

- `PlayerView.vue` (~917 lines) already hosts: character/participant/inventory loading, PV/Mana/posture session controls with `sessionLoading` state, `canEditInventory` permission logic, `InventorySlotModal`, `DonDetailModal`, `BackpackGrid`, `WeaponArmorList`, `DonList`. **Read the whole file before touching it.**
- Legacy layout reference (behavior only, DIR-004): `legacy-reference/index.html` — `.vitruve-layout` is `grid-template-columns:300px 1fr;gap:20px`, left `.vitruve-sheet` card, right `.vpanel` with `.pchar-tabs`. Reproduce the *structure and information hierarchy*, restyle idiomatically with the app's existing CSS conventions (scoped styles; look at how other views style cards).
- Tab labels (French, legacy wording — NFR-004): `Fiche`, `Caractéristiques`, `Dons`, `Inventaire`. Icons optional; if the app has an icon convention, follow it, otherwise text-only is fine.
- Types/stores from WP01 are available but mostly unused here; this WP is structural.

## Subtasks

### T009 — `VitruveSheet.vue` left-column shell

**File**: `src/components/vitruve/VitruveSheet.vue` (new)

Props: `character: CharacterProfile`, `participant: Participant | null`, `raceName?: string`, `className?: string`, `canEditSession: boolean`, `sessionLoading` passthrough as needed. Emits: `adjust-hp(delta)`, `adjust-mana(delta)` (parent keeps the existing update logic — do not duplicate it).

Render, top to bottom (FR-002, FR-003):
1. Header: character name; subtitle `«race» · «classe» · Niv.«level» · «éléments joined with · »` — resolve race/class display names the way the current view already does.
2. Vitals strip: PV pill and Mana pill, each with big current value, `«label» / «max»`, and − / + buttons (disabled when `!canEditSession` or while that stat is loading — mirror the existing view's disabling logic exactly).
3. Portrait block: `character.img` as `object-fit: cover` image, else a class-icon/placeholder fallback (see how `PlayerListView`/`TeamView` render portraits and reuse that approach).
4. A named slot `widgets` below the portrait — WP04/WP05 mount the calculator, toggles, party status and dice box there; WP06 mounts the raw-editor trigger. Render nothing in it for now.

### T010 — Restructure `PlayerView.vue` into two-column + tab host

1. Template: wrap in a `vitruve-layout` grid — left `VitruveSheet`, right panel with tab bar + active pane. Desktop: `grid-template-columns: 300px 1fr; gap: 20px; align-items: start`.
2. Tab state: `const activeTab = ref<'fiche' | 'carac' | 'dons' | 'inv' | string>('fiche')` — `string` widening because WP06 adds per-child tabs keyed by child characterId. Reset to `'fiche'` when `characterId` changes (`watch`).
3. Tab bar: the four tabs in order Fiche · Caractéristiques · Dons · Inventaire; active styling consistent with existing app tabs if any (check `FactionBrowserView.vue` for an existing tab idiom before inventing one).
4. Fiche/Carac panes: minimal placeholder (`<p>` with a French "à venir" note) — WP03 replaces them. Keep the panes as separate `v-if`/`v-show` blocks so WP03 can swap components in cleanly.
5. Preserve all existing loading / error / forbidden states at the view level (they currently guard the whole page — keep that).

### T011 — Relocate Dons & Inventaire unchanged

Move the existing dons markup into the `dons` pane and the inventory markup (backpack + weapons/armor + modals) into the `inv` pane **without altering logic**: same components, same props, same `canEditInventory` gating, same modal flows. The `InventorySlotModal`/`DonDetailModal` must remain mounted at view level (not inside a `v-if` tab pane) if their current behavior depends on staying alive — check how they're mounted today and preserve open-state behavior across tab switches.

**Do not** rename any existing data-testid / class the e2e suite touches — grep `e2e/inventory.spec.ts` for every selector it uses **before** moving markup, and keep those selectors valid.

### T012 — Responsive stacking + labels

1. `@media (max-width: 767px)`: single column (`grid-template-columns: 1fr`), left sheet above panel; no horizontal scrolling at 375px width (NFR-002 floor is 768px usable, stacked below).
2. All new user-facing strings French, tone-consistent (NFR-004).
3. `min-width: 0` on grid children (legacy does this for a reason — long content must not blow out the grid).

### T013 — Tests + e2e green

1. Component test for `VitruveSheet` (`src/components/vitruve/__tests__/VitruveSheet.spec.ts`): renders name/subtitle/vitals from props; emits `adjust-hp`/`adjust-mana`; hides steppers when `canEditSession` is false.
2. Update `src/views/__tests__/` PlayerView tests for the new structure (tab switching shows dons/inv content; default tab is fiche).
3. Run `npm run test:e2e` locally — `e2e/inventory.spec.ts` and the rest must pass. If a selector legitimately must change, update the e2e spec **and say so in the WP notes** (reviewer will scrutinize every e2e diff).

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (→ `main` via PR at mission end). Single-lane mission; worktree comes from `lanes.json`. Implement with:

```
spec-kitty agent action implement WP02 --agent claude
```

## Definition of Done

- [ ] Two-column layout at ≥768px, stacked below, no horizontal scroll
- [ ] Four tabs render; Dons/Inventaire panes behaviorally identical to pre-restructure (permissions, modals, quantities, read-only fallback)
- [ ] Default tab Fiche; tab resets on character change
- [ ] `VitruveSheet` slot `widgets` exists and is empty
- [ ] `npm run type-check && npm run lint && npm run test:unit && npm run test:e2e` all green
- [ ] No logic changes to inventory/dons code paths (diff shows moves, not edits)

## Reviewer Guidance

- Review the diff as a *move*: any behavioral edit inside relocated dons/inventory markup is a red flag (C-005).
- Manually check the demo-build path: with no Firebase config, the page must render read-only with zero console errors (NFR-003) — the restructure must not introduce accesses to undefined participant/session data.
- Check `activeTab` reset on character switch and that modal open-state survives tab switches per current behavior.
- Out-of-map edits: this WP owns `PlayerView.vue`; later WPs will make small integration edits to it with recorded rationales — but *this* WP must not touch files outside its list.

## Activity Log

- 2026-07-18T11:16:28Z – claude:sonnet:frontend-freddy:implementer – shell_pid=30945 – Assigned agent via action command
- 2026-07-18T11:31:07Z – claude:sonnet:frontend-freddy:implementer – shell_pid=30945 – Ready for review: two-column vitruve layout (VitruveSheet.vue new + PlayerView.vue restructured) with Fiche/Caracteristiques/Dons/Inventaire tab host. Dons/Inventaire relocated unchanged (same components/props/canEditInventory gating/modal mounting). Fiche/Carac are French 'a venir' placeholders for WP03. activeTab resets to fiche on characterId change. Responsive stack <768px with min-width:0. Validation: type-check clean, lint clean (oxlint+eslint --fix, no unexpected diffs), unit 245/245 passed (incl. new VitruveSheet.spec.ts + updated PlayerView.spec.ts tab-switch/reset coverage), e2e 3/3 passed on chromium (CI=true, after npm run build to produce dist/ for preview server - initial e2e run failed on ALL specs incl. unrelated ones due to missing dist/, not a regression). No e2e selectors changed - e2e/inventory.spec.ts only exercises the unauthenticated redirect guard, no PlayerView DOM assertions. Deviation: kept changePosture/postureOptions in PlayerView unrendered (eslint-disabled unused-vars) since WP03 T018 explicitly reuses this persistence logic rather than re-implementing it.
- 2026-07-18T11:31:41Z – claude:sonnet:reviewer-renata:reviewer – shell_pid=35158 – Started review via action command
- 2026-07-18T11:35:37Z – user – shell_pid=35158 – Review passed: move-only relocation of Dons/Inventaire verified identical (props/canEditInventory/modals unchanged); modals mounted at view root, survive tab switches; activeTab defaults 'fiche', widened type, resets on characterId change (tested); VitruveSheet emits-based vitals, steppers hidden when !canEditSession, portrait fallback with ti-user icon convention, empty widgets slot; demo-build null-safety traced through participant/session optional chains; responsive grid 300px/1fr with min-width:0, 767px breakpoint to 1fr; French legacy tab wording confirmed against legacy-reference/index.html. Validation: type-check clean, lint clean, unit 245/245, build succeeds, e2e chromium 3/3. Isolated WP02 commit 0d72e1d touches only its 4 owned files.
