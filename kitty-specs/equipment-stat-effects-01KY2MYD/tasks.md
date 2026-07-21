# Tasks: Equipment Stat Effects

**Input**: `plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/data-layer.md`
**Branch**: `feat/equipment-stat-effects` (planning base = merge target — single branch, no divergence)

## Subtask Index

| ID | Description | WP | Parallel |
|---|---|---|---|
| T001 | Add `equipped`/`statBonus` fields to `WeaponArmorItem` | WP01 | |
| T002 | Implement `computeEffectiveMaxStat` pure function | WP01 | |
| T003 | Unit tests for `computeEffectiveMaxStat` (NFR-002 combinations) | WP01 | |
| T004 | Update seed fixture with the +4 Mana Ring example (FR-008) | WP01 | [P] |
| T005 | Add `childInventories` cache + `loadChildInventories` to `useInventoryStore` | WP02 | |
| T006 | Unit tests for `loadChildInventories` | WP02 | |
| T007 | Wire `loadChildInventories` into `PlayerView.vue`'s existing load sequence | WP02 | |
| T008 | `VitruveSheet.vue` — render effective max HP/Mana, fix clamping | WP02 | [P] |
| T009 | `ChildSheetTab.vue` — accept child's own inventory, render effective max, fix clamping | WP02 | |
| T010 | `PlayerView.vue` — pass the child's own inventory slice to `ChildSheetTab.vue` | WP02 | |

## Work Package Overview

C-006 (spec.md) mandates a hard two-phase split: the schema + aggregation-logic package must be fully green before any display wiring begins. That maps directly onto two work packages — no artificial extra splitting, no merging across that boundary.

### WP01 — Schema & Aggregation (Priority: P1, foundational)

**Goal**: `WeaponArmorItem` gains the two new fields; a pure, unit-tested function computes the effective max stat from them. Nothing renders yet — this WP is invisible in the UI by design.
**Independent test**: `npm run test:unit -- effectiveStats` passes with all NFR-002 combinations covered; `npm run type-check` passes.
**Estimated size**: 4 subtasks, ~280 lines.
**Requirement refs**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-008.

- [ ] T001 Add `equipped: boolean` and `statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }` to `WeaponArmorItem` (WP01)
- [ ] T002 Implement `computeEffectiveMaxStat(baseValue, items, stat)` in `src/utils/effectiveStats.ts` (WP01)
- [ ] T003 Unit tests in `src/utils/__tests__/effectiveStats.spec.ts` covering every NFR-002 combination (WP01)
- [ ] T004 Add a `statBonus`/`equipped` Mana Ring example to `scripts/data/inventories.json` (WP01)

**Dependencies**: none — this is the foundation.

### WP02 — Display Wiring (Priority: P1, depends on WP01)

**Goal**: The effective max (not the raw stored max) renders on both the parent sheet and every child/transformation sheet, each scoped to its own equipped items only.
**Independent test**: manual verification per `quickstart.md`'s "Validate the UI" section (SC-001, SC-002, SC-004) plus the `loadChildInventories` unit tests.
**Estimated size**: 6 subtasks, ~430 lines.
**Requirement refs**: FR-004, FR-005.

- [ ] T005 Add `childInventories = ref<Record<string, CharacterInventory>>({})` and `loadChildInventories(childIds, campaignId)` to `useInventoryStore.ts` (WP02)
- [ ] T006 Unit tests for `loadChildInventories` (no-db no-op, populates cache, multiple children, missing-inventory child) (WP02)
- [ ] T007 Call `loadChildInventories` from `PlayerView.vue`'s existing character-load sequence, alongside `listChildrenOf` (WP02)
- [ ] T008 `VitruveSheet.vue`: render `computeEffectiveMaxStat` output for max HP/Mana instead of the raw stored value; update the `+`/`-` disabled-state clamping to use the effective max (WP02)
- [ ] T009 `ChildSheetTab.vue`: accept the child's own weapon/armor list as a new prop, render its own effective max, update its clamping the same way (WP02)
- [ ] T010 `PlayerView.vue`: pass `childInventories.value[activeChild.id]`'s weapons+armor down to `ChildSheetTab.vue` as the new prop from T009 (WP02)

**Dependencies**: WP01 (needs the new fields and the aggregation function).

## Notes

- Tests are explicitly required here (NFR-002 names exact combinations) — this is not the "tests optional" default case.
- No `firestore.rules` change, no new Firestore collection, no new route — scope is intentionally narrow (C-001–C-003).
- `statNote`/`damageBonus`/`armorRating` are never read by any new code in either WP (C-004, research.md D4) — reviewers should flag any subtask that touches them.
