# Tasks: Equipment Stat Effects

**Input**: `plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/data-layer.md`
**Branch**: `feat/equipment-stat-effects` (planning base = merge target — single branch, no divergence)

## Subtask Index

| ID | Description | WP | Parallel |
|---|---|---|---|
| T001 | Add `equipped`/`statBonus` fields to `WeaponArmorItem` | WP01 | |
| T002 | Implement `computeEffectiveMaxStat` pure function | WP01 | |
| T003 | Unit tests for `computeEffectiveMaxStat` (NFR-002 combinations) | WP01 | |
| T004 | Populate the existing `mwassa` / `inv-9-anneau-de-mana` seed item (FR-008) | WP01 | [P] |
| T005 | Add `childInventories` cache + `loadChildInventories` to `useInventoryStore` | WP02 | |
| T006 | Unit tests for `loadChildInventories` | WP02 | |
| T007 | Wire `loadChildInventories` into `PlayerView.vue`'s existing load sequence | WP02 | |
| T008 | `VitruveSheet.vue` — render effective max HP/Mana, fix clamping | WP02 | [P] |
| T009 | `ChildSheetTab.vue` — accept child's own inventory, render effective max, fix clamping | WP02 | |
| T010 | `PlayerView.vue` — pass the child's own inventory slice to `ChildSheetTab.vue` | WP02 | |
| T011 | Isolation regression test for `activeChildEquipment` (closes analyze finding A3) | WP02 | |
| T012 | Update `MIGRATION_BACKLOG.md`/`NEXTSTEPS.md` (closes analyze finding A2) | WP03 | |

## Work Package Overview

C-006 (spec.md) mandates a hard two-phase split: the schema + aggregation-logic package must be fully green before any display wiring begins. That maps directly onto two work packages — no artificial extra splitting, no merging across that boundary.

### WP01 — Schema & Aggregation (Priority: P1, foundational)

**Goal**: `WeaponArmorItem` gains the two new fields; a pure, unit-tested function computes the effective max stat from them. Nothing renders yet — this WP is invisible in the UI by design.
**Independent test**: `npm run test:unit -- effectiveStats` passes with all NFR-002 combinations covered; `npm run type-check` passes.
**Estimated size**: 4 subtasks, ~280 lines.
**Requirement refs**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-008.

- [x] T001 Add `equipped: boolean` and `statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }` to `WeaponArmorItem` (WP01)
- [x] T002 Implement `computeEffectiveMaxStat(baseValue, items, stat)` in `src/utils/effectiveStats.ts` (WP01)
- [x] T003 Unit tests in `src/utils/__tests__/effectiveStats.spec.ts` covering every NFR-002 combination (WP01)
- [x] T004 Add `statBonus`/`equipped` to the existing `mwassa` / `inv-9-anneau-de-mana` (`Anneau de Mana`) entry in `scripts/data/inventories.json` (WP01)

**Dependencies**: none — this is the foundation.

### WP02 — Display Wiring (Priority: P1, depends on WP01)

**Goal**: The effective max (not the raw stored max) renders on both the parent sheet and every child/transformation sheet, each scoped to its own equipped items only.
**Independent test**: manual verification per `quickstart.md`'s "Validate the UI" section (SC-001, SC-002) plus the `loadChildInventories` unit tests plus the T011 isolation test (SC-004 — automated, not manual-only, per analyze finding A3) plus `npm run test:e2e` staying green (charter Quality Gates — WP02 touches `PlayerView.vue`, a full view, per analyze finding A1).
**Estimated size**: 7 subtasks, ~500 lines.
**Requirement refs**: FR-004, FR-005.

- [ ] T005 Add `childInventories = ref<Record<string, CharacterInventory>>({})` and `loadChildInventories(childIds, campaignId)` to `useInventoryStore.ts` (WP02)
- [ ] T006 Unit tests for `loadChildInventories` (no-db no-op, populates cache, multiple children, missing-inventory child) (WP02)
- [ ] T007 Call `loadChildInventories` from `PlayerView.vue`'s existing character-load sequence, alongside `listChildrenOf` (WP02)
- [ ] T008 `VitruveSheet.vue`: render `computeEffectiveMaxStat` output for max HP/Mana instead of the raw stored value; update the `+`/`-` disabled-state clamping to use the effective max (WP02)
- [ ] T009 `ChildSheetTab.vue`: accept the child's own weapon/armor list as a new prop, render its own effective max, update its clamping the same way (WP02)
- [ ] T010 `PlayerView.vue`: pass `childInventories.value[activeChild.id]`'s weapons+armor down to `ChildSheetTab.vue` as the new prop from T009 (WP02)
- [ ] T011 Add an automated isolation regression test asserting `activeChildEquipment` reads only from `childInventories[child.id]`, never from `inventory` (closes analyze finding A3 — SC-004/NFR-002 previously had manual-only coverage) (WP02)

**Dependencies**: WP01 (needs the new fields and the aggregation function).

### WP03 — Documentation Sync (Priority: P2, depends on WP02)

**Goal**: `MIGRATION_BACKLOG.md` item 4 and `NEXTSTEPS.md` reflect that this mission shipped, per charter DIR-002 and CLAUDE.md's high-complexity-spec increment-ledger policy. Closes analyze finding A2 (plan.md promised this sync but no task previously implemented it).
**Independent test**: diff review — both docs describe what WP01/WP02 actually built, not what was originally planned (in case anything shifted during implementation).
**Estimated size**: 1 subtask, ~60 lines.
**Requirement refs**: FR-009 (added during remediation to make this task's coverage explicit and traceable — see spec.md FR-009's note).

- [ ] T012 Update `MIGRATION_BACKLOG.md` item 4 to "done" (mirroring how Cluster 0's items were closed out) and add this mission's entry to `NEXTSTEPS.md`'s increment ledger (WP03)

**Dependencies**: WP02 (describes what actually shipped).

## Notes

- Tests are explicitly required here (NFR-002 names exact combinations) — this is not the "tests optional" default case.
- No `firestore.rules` change, no new Firestore collection, no new route — scope is intentionally narrow (C-001–C-003).
- `statNote`/`damageBonus`/`armorRating` are never read by any new code in either WP (C-004, research.md D4) — reviewers should flag any subtask that touches them.
- `npm run test:e2e` must stay green as part of WP02's gate sweep (charter Quality Gates: full-view changes) — the existing `e2e/vitruve.spec.ts` is smoke-level only, so this is a regression check, not new e2e authoring.
