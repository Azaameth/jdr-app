# Tasks: Inventory Slots & Dons System

**Mission**: `inventory-slots-dons-01KXRF5M`
**Branch**: `feat/inventory-slots-dons` (planning base and merge target)
**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/data-layer.md](./contracts/data-layer.md), [research.md](./research.md)

Delivery constraint (spec C-006): **WP01 is the complete data layer and must be independently green before any UI WP starts.** All WPs are sequential (single lane); there is no parallel execution in this mission.

## Subtask Index

| ID | Description | WP | Parallel |
|---|---|---|---|
| T001 | Extend `Inventory.ts` types (category union, max-slot table, WeaponArmorItem, CharacterInventory) | WP01 | — |
| T002 | Enrich `CharacterGift`, retire dead `InventoryItem`/`InventoryItemType` in `Character.ts` | WP01 | — |
| T003 | Pure parser/formatter `src/utils/inventoryText.ts` + corpus unit tests | WP01 | — |
| T004 | `InventoryRepository` write functions + mapper defaults + unit tests | WP01 | — |
| T005 | `useInventoryStore.ts` singleton composable + unit tests | WP01 | — |
| T006 | Fixture migration script + regenerated `inventories.json` / `characters.json` | WP01 | — |
| T007 | Data-layer gate sweep: type-check, lint, unit, losslessness verification | WP01 | — |
| T008 | `BackpackGrid.vue` — 10 categories, filled + computed empty slots | WP02 | — |
| T009 | `WeaponArmorList.vue` — DÉGÂTS/ARMURE badges, pad-to-3 | WP02 | — |
| T010 | Integrate both into `PlayerView.vue` via the store (read-only) | WP02 | — |
| T011 | Component unit tests for BackpackGrid / WeaponArmorList | WP02 | — |
| T012 | No-backend degradation check for the new sections | WP02 | — |
| T013 | Reusable `AppModal.vue` + unit test | WP03 | — |
| T014 | `InventorySlotModal.vue` (name/qty vs stat variants, delete) | WP03 | — |
| T015 | Wire slot clicks + role gating (owner / mj / admin) | WP03 | — |
| T016 | Store-backed save/remove flows with French error surfacing | WP03 | — |
| T017 | Editing-flow unit tests | WP03 | — |
| T018 | `DonList.vue` — gift cards with mana/dice badges | WP04 | — |
| T019 | `DonDetailModal.vue` — MANA/DÉS/BONUS tiles + pre-line flavor text | WP04 | — |
| T020 | Swap PlayerView dons section to `DonList`; passive rendering rules | WP04 | — |
| T021 | Component unit tests for DonList / DonDetailModal | WP04 | — |
| T022 | Playwright e2e smoke for inventory + dons sections | WP05 | — |
| T023 | Update `MIGRATION_BACKLOG.md` + `NEXTSTEPS.md` ledger | WP05 | — |
| T024 | Final gate sweep incl. no-secrets build check | WP05 | — |

## Work Package Phases

### Phase 1 — Foundational (data layer)

## WP01 — Data layer: types, parser, persistence, fixtures

**Prompt**: [tasks/WP01-data-layer.md](./tasks/WP01-data-layer.md) · **Priority**: P1 · **Estimated prompt size**: ~480 lines

- **Goal**: Materialize the locked schema and make the full inventory/dons data path real: typed models, lossless legacy-string parser, repository writes, singleton store, migrated seed fixtures — all unit-tested and green with zero UI changes.
- **Independent test**: `npm run type-check && npm run lint && npm run test:unit` all pass; `node scripts/migrateInventoryFixtures.mjs` is deterministic (re-run produces no diff); no rendering change in the app.
- **Dependencies**: none.
- **Risks**: schema drift vs `contracts/data-layer.md` (cite it, don't improvise); silent data loss in migration (corpus tests are the guard).

Subtasks:
- [x] T001 Extend `Inventory.ts` types (WP01)
- [x] T002 Enrich `CharacterGift`, retire dead types in `Character.ts` (WP01)
- [x] T003 Parser/formatter `inventoryText.ts` + corpus tests (WP01)
- [x] T004 Repository write functions + mapper + tests (WP01)
- [x] T005 `useInventoryStore` + tests (WP01)
- [x] T006 Fixture migration script + regenerated fixtures (WP01)
- [x] T007 Data-layer gate sweep (WP01)

### Phase 2 — Display UI

## WP02 — Backpack & equipment display

**Prompt**: [tasks/WP02-inventory-display.md](./tasks/WP02-inventory-display.md) · **Priority**: P2 · **Estimated prompt size**: ~320 lines

- **Goal**: Read-only rendering of the categorized backpack (capacity at a glance) and armes/armures sections with stat badges inside `PlayerView.vue`, consuming `useInventoryStore`.
- **Independent test**: character page shows 10 categories with correct filled/empty slot counts and badge text for the seeded characters; unit + type gates green; page still renders with no backend.
- **Dependencies**: WP01.

Subtasks:
- [x] T008 `BackpackGrid.vue` (WP02)
- [x] T009 `WeaponArmorList.vue` (WP02)
- [x] T010 PlayerView integration (WP02)
- [x] T011 Component tests (WP02)
- [x] T012 Degradation check (WP02)

### Phase 3 — Editing

## WP03 — Slot editing modals & permissions

**Prompt**: [tasks/WP03-slot-editing.md](./tasks/WP03-slot-editing.md) · **Priority**: P2 · **Estimated prompt size**: ~350 lines

- **Goal**: Per-slot add/edit/delete through a reusable modal, gated to the inventory owner or mj/admin, persisting via the store with French error surfacing.
- **Independent test**: owner edits a slot → survives reload; joueur viewing another character sees no edit affordances; category at cap rejects new items with a French message.
- **Dependencies**: WP02.
- **Note**: wiring click-handlers into `BackpackGrid.vue`/`WeaponArmorList.vue`/`PlayerView.vue` (owned by WP02) is an expected, recorded out-of-map edit — sequential lanes, no collision risk.

Subtasks:
- [x] T013 `AppModal.vue` + test (WP03)
- [x] T014 `InventorySlotModal.vue` (WP03)
- [x] T015 Slot-click wiring + role gating (WP03)
- [x] T016 Save/remove flows + errors (WP03)
- [x] T017 Editing-flow tests (WP03)

### Phase 4 — Dons

## WP04 — Dons cards & detail modal

**Prompt**: [tasks/WP04-dons-modal.md](./tasks/WP04-dons-modal.md) · **Priority**: P2 · **Estimated prompt size**: ~300 lines

- **Goal**: Gift cards showing mana/dice badges when enriched data exists; clicking opens the detail modal (MANA/DÉS/BONUS tiles, multi-line flavor text); passives render "—" with no fake zeros.
- **Independent test**: seeded enriched dons open the modal with correct tiles; a passive don shows "—" tiles; unit gates green.
- **Dependencies**: WP03 (reuses `AppModal.vue`).
- **Note**: swapping the PlayerView dons section to `<DonList>` is a small recorded out-of-map edit (PlayerView owned by WP02).

Subtasks:
- [x] T018 `DonList.vue` (WP04)
- [x] T019 `DonDetailModal.vue` (WP04)
- [x] T020 PlayerView swap + passive rules (WP04)
- [x] T021 Component tests (WP04)

### Phase 5 — Polish

## WP05 — E2E smoke, docs, final gates

**Prompt**: [tasks/WP05-polish-docs.md](./tasks/WP05-polish-docs.md) · **Priority**: P3 · **Estimated prompt size**: ~220 lines

- **Goal**: Playwright smoke coverage of the new sections, backlog/ledger documentation updates, and a final full-gate + no-secrets-build verification.
- **Independent test**: `npm run test:e2e` green; `MIGRATION_BACKLOG.md` item 1 moved to "Already covered"; build without Firebase secrets renders the character page cleanly.
- **Dependencies**: WP04.

Subtasks:
- [ ] T022 E2E smoke (WP05)
- [ ] T023 Docs updates (WP05)
- [ ] T024 Final gate sweep (WP05)

## Dependency Summary

WP01 → WP02 → WP03 → WP04 → WP05 (strictly sequential; single lane). No parallel opportunities by design — spec C-006 plus a single shared view surface make sequencing the safer choice for this hobby-scale codebase.

## MVP Scope

WP01 alone is the merge-worthy MVP of this mission phase: it delivers the typed schema, lossless migration, and persistence surface the Vitruve sheet (backlog item 2) depends on, with zero user-visible risk. **The current session implements WP01 only** (owner decision, 2026-07-17).
