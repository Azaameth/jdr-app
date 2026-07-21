# Implementation Plan: Equipment Stat Effects

**Branch**: `feat/equipment-stat-effects` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/equipment-stat-effects-01KY2MYD/spec.md`

## Summary

Add a structured `statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }` field plus an `equipped: boolean` field to `WeaponArmorItem`, and a new pure aggregation function (mirroring `jetFormula.ts`'s no-Vue/no-Firestore pattern) that sums equipped items' bonuses onto a character's stored base max HP/Mana to produce the *effective* max rendered on the sheet. Delivery is sliced per spec C-006: schema + aggregation-logic work package (types, pure function, unit tests) fully green before the display work package (wiring `VitruveSheet.vue`/`ChildSheetTab.vue` to the computed value) begins. Planning surfaced one gap not visible from the spec alone: `useInventoryStore` is a single-character singleton today, so a child/transformation's own inventory is never loaded — FR-005 (child isolation) requires extending the store to also cache child inventories, not just consume the existing one.

## Technical Context

**Language/Version**: TypeScript ~5.9 (via Vue's bundled toolchain) with Vue 3.5 SFCs (`<script setup lang="ts">`), Node 22.23.1 (pinned via `.node-version`)
**Primary Dependencies**: vue ^3.5.38, vue-router ^5.1, firebase ^12.16 (Auth + Firestore client SDK); vite ^8.0.16; vue-tsc ^3.3.5; vitest ^4.1.9
**Storage**: Firestore — existing `inventories` collection, one doc per character per campaign (`CharacterInventory`, flat top-level, per the locked per-campaign scoping convention in `NEXTSTEPS.md`). `statBonus`/`equipped` are new fields nested inside `weapons[]`/`armor[]` on that same doc — no new collection, no `firestore.rules` change (existing `inventories` rule at `firestore.rules:143-149` already covers the whole doc).
**Testing**: Vitest unit tests co-located in `__tests__/` dirs, same layout as `src/components/vitruve/__tests__/jetFormula.spec.ts` (pure-function tests, zero Vue mounting) and `src/controllers/__tests__/` (store tests with mocked repository). CI runs type-check → lint → unit → e2e. Per the charter's Quality Gates ("`npm run test:e2e` is required for changes touching routing, auth, or a full view"), the existing `e2e/vitruve.spec.ts` suite must be run and stay green as part of WP02's gate sweep, since WP02 modifies `PlayerView.vue` (a full view) — that suite is currently smoke-level only (unauthenticated-redirect checks), so this is a regression check, not a request for new authenticated-flow e2e coverage.
**Target Platform**: Static SPA on GitHub Pages; must degrade to read-only no-op when Firebase env secrets are absent (`if (!db)` guard convention) — the aggregation function itself never touches Firestore, so this mainly constrains the store extension.
**Project Type**: Single web SPA (`src/` with models/controllers/repositories/views/components layers).
**Performance Goals**: Hobby-table scale — instant render for ~5 characters, ≤2 children each, ≤3-6 weapon/armor slots each; no special targets beyond keeping CI gates green.
**Constraints**: French UI strings (NFR-004, none needed unless a "bonus included" indicator is added); schema field name locked via plan-phase decision (`statBonus`, not `bonus` or `effect`) — see `research.md` D1; `statNote` untouched (C-004); only `maxHp`/`maxMana` in scope (C-001); only `WeaponArmorItem` in scope (C-002); no guided authoring UI (C-003).
**Scale/Scope**: 5 seeded characters, 1 campaign table, ≤2 transformations per character (Firm/Furmiaou today), ≤6 weapon/armor slots per inventory.

## Charter Check

*GATE: evaluated against `.kittify/charter/charter.md`.*

- **Conventions (project DIR-003)**: PASS — the new aggregation function follows the existing pure-formula-module pattern (`jetFormula.ts`); the store extension follows `useInventoryStore.ts`'s existing singleton-composable shape (adds a second cache map, doesn't introduce a new store pattern); repository functions keep the `if (!db)` guard + `{ id: doc.id, ...doc.data() }` mapping.
- **Legacy-as-spec (DIR-004)**: N/A — this feature has no legacy monolith precedent (legacy never modeled equipment bonuses mechanically); grounded entirely in current-code research instead.
- **French strings (DIR-005)**: PASS — no new user-facing copy is required by the FRs; if a "bonus included" affordance is added it will be French (NFR-004).
- **Risk boundaries (DIR-001)**: PASS — permission model unchanged (existing `inventories` rule already covers the new nested fields); no relaxation of any check.
- **Docs sync (DIR-002)**: `MIGRATION_BACKLOG.md` item 4 and `NEXTSTEPS.md` gain an increment-ledger entry at mission completion — tracked as its own work package (IC-08/WP03) so it isn't silently dropped (flagged by `/spec-kitty.analyze` finding A2).

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/equipment-stat-effects-01KY2MYD/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── data-layer.md    # Locked TS API surface: types, aggregation fn, store extension
└── tasks.md             # Phase 2 output (/spec-kitty.tasks — not created by this command)
```

### Source Code (repository root)

```
src/
├── models/
│   └── types/
│       └── Inventory.ts                 # EXTEND: WeaponArmorItem gains equipped, statBonus
├── utils/
│   ├── effectiveStats.ts                # NEW: pure aggregation fn (base + equipped bonuses)
│   └── __tests__/effectiveStats.spec.ts # NEW
├── controllers/
│   ├── useInventoryStore.ts             # EXTEND: childInventories cache + loadChildInventories
│   └── __tests__/useInventoryStore.spec.ts  # EXTEND
├── components/vitruve/
│   ├── VitruveSheet.vue                 # EXTEND (display WP): render effective max, not raw
│   └── ChildSheetTab.vue                # EXTEND (display WP): render child's own effective max
└── views/
    └── PlayerView.vue                   # EXTEND (display WP): load child inventories, pass down

scripts/
└── data/
    └── inventories.json                 # EXTEND: +4 Mana Ring example (FR-008)
```

**Structure Decision**: no new top-level directory — `src/utils/` already exists (holds `inventoryText.ts`) and is the right home for a second pure, I/O-free helper.

## Implementation Concern Map

> Concerns are not work packages; `/spec-kitty.tasks` translates them. C-006 requires IC-01–IC-03 to land as one independently green schema+aggregation package before IC-04–IC-05 (display) begin.

### IC-01 — Typed schema extension

- **Purpose**: Add `equipped: boolean` and `statBonus?: { stat: 'maxHp' | 'maxMana'; amount: number }` to `WeaponArmorItem`, defaulting `equipped` to `false` for items that don't set it.
- **Relevant requirements**: FR-001, FR-002.
- **Affected surfaces**: `src/models/types/Inventory.ts`.
- **Sequencing/depends-on**: none (everything else consumes it).
- **Risks**: field-name drift vs the locked contract — `contracts/data-layer.md` is the single citation point.

### IC-02 — Pure aggregation function

- **Purpose**: A pure `computeEffectiveMaxStat(baseValue, items, stat)` function summing `statBonus.amount` across every item where `equipped === true` and `statBonus.stat === stat`; ignores `statNote`, `damageBonus`, `armorRating` entirely. No Vue, no Firestore — unit-testable standalone (NFR-002).
- **Relevant requirements**: FR-003, FR-006, FR-007; NFR-001, NFR-002.
- **Affected surfaces**: `src/utils/effectiveStats.ts` + test file.
- **Sequencing/depends-on**: IC-01.
- **Risks**: none notable — pure arithmetic over a typed array; edge cases (empty list, no `statBonus`, unequipped) are exactly what NFR-002 requires tests for.

### IC-03 — Child inventory loading

- **Purpose**: Extend `useInventoryStore` with a `childInventories = ref<Record<string, CharacterInventory>>({})` cache and a `loadChildInventories(childIds: string[], campaignId: string)` method (parallel `getInventoryByCharacterId` calls), so a transformation's own weapons/armor become available without disturbing the existing single-character `inventory` ref used for the parent. Called from `PlayerView.vue` alongside the existing `listChildrenOf` fetch.
- **Relevant requirements**: FR-005.
- **Affected surfaces**: `src/controllers/useInventoryStore.ts`, `src/views/PlayerView.vue` (load-time wiring only — no template changes yet), tests.
- **Sequencing/depends-on**: IC-01 (shares the `CharacterInventory`/`WeaponArmorItem` types).
- **Risks**: this is new store surface, not just new fields — keep the `if (!db)` no-op guarantee; do not touch the existing singleton `inventory` ref's behavior for the parent character (regression risk for the already-shipped backpack/weapons UI).

### IC-04 — Parent sheet display wiring

- **Purpose**: `VitruveSheet.vue` renders `computeEffectiveMaxStat(session.maxHp, weapons+armor, 'maxHp')` (and the Mana equivalent) instead of the raw `session.maxHp`/`maxMana`, sourcing the weapon/armor list from the already-loaded `useInventoryStore().inventory`.
- **Relevant requirements**: FR-004; SC-001, SC-002, SC-003, SC-005.
- **Affected surfaces**: `src/components/vitruve/VitruveSheet.vue`.
- **Sequencing/depends-on**: IC-02 (needs the function); C-006 gate (schema+aggregation package green first).
- **Risks**: existing clamping (`hp <= -maxHp`, `hp >= maxHp` disabled-state checks at `VitruveSheet.vue:44,49,59`) must clamp against the new *effective* max, not the raw stored one, or +/- buttons will disable at the wrong threshold.

### IC-05 — Child sheet display wiring

- **Purpose**: `ChildSheetTab.vue` renders its own effective max using the IC-03 child-inventory cache (keyed by the child's own `characterId`), never the parent's inventory.
- **Relevant requirements**: FR-004, FR-005; SC-004.
- **Affected surfaces**: `src/components/vitruve/ChildSheetTab.vue`, `src/views/PlayerView.vue` (pass the right slice of `childInventories` down as a prop).
- **Sequencing/depends-on**: IC-02, IC-03; C-006 gate.
- **Risks**: same clamping risk as IC-04, at `ChildSheetTab.vue:104-105`; also the isolation invariant (SC-004) — a wiring mistake that accidentally reads the parent's `inventory` ref instead of `childInventories[child.id]` would silently violate FR-005 without any type error, since both are `CharacterInventory | null`.

### IC-06 — Seed fixture update

- **Purpose**: Populate the existing (already-present, currently mechanic-less) `Anneau de Mana` item on `mwassa`'s armor list (`scripts/data/inventories.json`, `itemId: "inv-9-anneau-de-mana"` — the backlog's "Mwasa" is a spelling variant of "Mwassa Mekhsitt") with `statBonus: { stat: 'maxMana', amount: 4 }, equipped: true`, exercising the full path end-to-end after a reseed.
- **Relevant requirements**: FR-008.
- **Affected surfaces**: `scripts/data/inventories.json`.
- **Sequencing/depends-on**: IC-01.
- **Risks**: none — additive fixture data only.

### IC-07 — Child-isolation regression test

- **Purpose**: Close a coverage gap flagged by `/spec-kitty.analyze` (finding A3): the pure aggregation function and the store-cache tests (IC-02, IC-03) both stop short of testing the actual line most likely to break SC-004 — `PlayerView.vue`'s `activeChildEquipment` computed, which must read `childInventories[child.id]` and never the parent's `inventory` ref. Add a targeted test at that layer.
- **Relevant requirements**: FR-005; NFR-002 (the "child-vs-parent isolation" combination).
- **Affected surfaces**: `src/views/PlayerView.vue` (test only — no new production code beyond IC-05's existing wiring).
- **Sequencing/depends-on**: IC-03, IC-05.
- **Risks**: `PlayerView.vue` has no existing component-test file — this may be the first one, so keep the test narrowly scoped to the one computed rather than a full component mount if that's simpler to set up.

### IC-08 — Documentation sync

- **Purpose**: Close a coverage gap flagged by `/spec-kitty.analyze` (finding A2): charter DIR-002 and CLAUDE.md's high-complexity-spec increment-ledger policy both require `MIGRATION_BACKLOG.md`/`NEXTSTEPS.md` to reflect this mission once it lands — plan.md promised this but no task previously implemented it.
- **Relevant requirements**: none (governance/docs, not a spec FR).
- **Affected surfaces**: `MIGRATION_BACKLOG.md`, `NEXTSTEPS.md`.
- **Sequencing/depends-on**: IC-04, IC-05, IC-06 (describes what actually shipped, so it must go last).
- **Risks**: none — pure documentation, no code surface.
