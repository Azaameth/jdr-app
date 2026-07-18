# Implementation Plan: Inventory Slots & Dons System

**Branch**: `feat/inventory-slots-dons` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/inventory-slots-dons-01KXRF5M/spec.md`

## Summary

Port the legacy categorized inventory (10 slot-capped backpack categories, typed weapons/armor with a lossless stat parser) and enriched dons (persisted mana/dice/bonus/flavor data + detail modal) into the Vue 3 + Firestore app. The schema contract is pre-locked in `NEXTSTEPS.md` § "Typed inventory schema". Delivery is sliced so the entire data layer (types, parser, repository writes, store, seed-fixture migration, unit tests) is one independently green work package before any UI work begins (spec C-006).

## Technical Context

**Language/Version**: TypeScript ~6.0 with Vue 3.5 SFCs (`<script setup lang="ts">`), Node 22.23.1 (pinned via `.node-version`)
**Primary Dependencies**: vue ^3.5, vue-router ^5.1, firebase ^12.16 (Auth + Firestore client SDK); firebase-admin ^14.1 for seed scripts; vite ^8, vue-tsc ^3.3
**Storage**: Firestore — existing `inventories` collection (one doc per character per campaign, flat top-level per the locked per-campaign scoping convention); gifts embedded on `characters/{id}` docs. Seed fixtures in `scripts/data/*.json` driven by `scripts/seedAll.mjs` / `scripts/uploadDefaultCharsAdmin.mjs`.
**Testing**: Vitest unit tests co-located in `__tests__/` dirs (repository pattern: no-db / db-present branches per `src/models/repositories/__tests__/CharacterRepository.spec.ts`); Playwright e2e in `e2e/`; CI runs type-check → lint → unit → e2e.
**Target Platform**: Static SPA on GitHub Pages; must degrade to read-only no-op when Firebase env secrets are absent (`if (!db)` guard convention).
**Project Type**: Single web SPA (`src/` with models/controllers/views/components layers).
**Performance Goals**: Hobby-table scale — instant render for ~5 characters; no special targets beyond keeping CI gates green.
**Constraints**: French UI strings; locked schema contract in `NEXTSTEPS.md` (do not re-derive); no `firestore.rules` change (existing `inventories` rule at `firestore.rules:119-127` already expresses the permission model); lossless migration of legacy strings (NFR-002).
**Scale/Scope**: 5 seeded characters, 1 campaign table, ~10 backpack categories × ≤16 slots; ~40 enriched dons across characters.

## Charter Check

*GATE: evaluated against `.kittify/charter/charter.md`.*

- **Architectural Integrity (DIRECTIVE_001)**: PASS — layering follows the committed pattern: pure parser util (no I/O) → repository (Firestore only) → singleton-composable store → views/components. No new architectural pattern introduced.
- **Conventions (project DIR-003)**: PASS — new store follows `usePlayerStore.ts` shape (module-scope refs, factory, French error fallbacks); repository functions keep `if (!db)` guard + `{ id: doc.id, ...doc.data() }` mapping.
- **Risk boundaries (DIR-001)**: PASS — permission model is *narrower* than legacy (owner or mj/admin instead of any-user), reusing already-deployed rules; no relaxation.
- **Docs sync (DIR-002)**: `NEXTSTEPS.md` gains this mission's increment ledger; `MIGRATION_BACKLOG.md` item 1 updated at mission completion.
- **Decision documentation (DIRECTIVE_003)**: material decisions recorded in `research.md`.

No violations → Complexity Tracking not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/inventory-slots-dons-01KXRF5M/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── data-layer.md    # Locked TS/repository/store API surface
└── tasks.md             # Phase 2 output (/spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── models/
│   ├── types/
│   │   ├── Inventory.ts          # EXTEND: category enum, max-slot table, WeaponArmorItem
│   │   └── Character.ts          # EXTEND CharacterGift; RETIRE dead InventoryItem/InventoryItemType
│   └── repositories/
│       ├── InventoryRepository.ts            # EXTEND: write paths
│       └── __tests__/InventoryRepository.spec.ts   # NEW
├── utils/
│   ├── inventoryText.ts          # NEW: pure lossless parser/formatter (legacy "(...)" / "×N" strings)
│   └── __tests__/inventoryText.spec.ts        # NEW
├── controllers/
│   ├── useInventoryStore.ts      # NEW: singleton composable
│   └── __tests__/useInventoryStore.spec.ts    # NEW
├── components/
│   ├── AppModal.vue              # NEW (UI phase): reusable overlay extracted from CampaignListView pattern
│   ├── BackpackGrid.vue          # NEW (UI phase)
│   ├── WeaponArmorList.vue       # NEW (UI phase)
│   ├── InventorySlotModal.vue    # NEW (UI phase)
│   └── DonDetailModal.vue        # NEW (UI phase)
└── views/
    └── PlayerView.vue            # EXTEND (UI phase): swap flat list for new sections

scripts/
├── data/
│   ├── inventories.json          # MIGRATE to typed shape
│   └── characters.json           # MIGRATE gifts to enriched shape (port legacy DONS_DATA)
└── migrateInventoryFixtures.mjs  # NEW (one-shot, or hand-migrated JSON — see research.md D6)
```

**Structure Decision**: single-SPA layout already in place; the only structural addition is `src/utils/` as the home for pure, I/O-free helpers (the parser now; the dice-roll calculator planned in `NEXTSTEPS.md` Vitruve increment (a) later).

## Implementation Concern Map

> Concerns are not work packages; `/spec-kitty.tasks` translates them. C-006 requires IC-01…IC-04 to land as one independently green data-layer package before UI concerns.

### IC-01 — Typed schema & dead-type retirement

- **Purpose**: Materialize the locked schema — backpack category enum + code-level max-slot table, `WeaponArmorItem`, `CharacterInventory` extension, `CharacterGift` enrichment — and delete the unused duplicate types.
- **Relevant requirements**: FR-001, FR-004, FR-006; C-001–C-004.
- **Affected surfaces**: `src/models/types/Inventory.ts`, `src/models/types/Character.ts`.
- **Sequencing/depends-on**: none (everything else consumes it).
- **Risks**: shape drift vs `NEXTSTEPS.md` — the contract file `contracts/data-layer.md` is the single citation point.

### IC-02 — Lossless legacy-string parser

- **Purpose**: Pure functions converting legacy annotations (`(D10/+4)`, `(RD2 vs proj. magiques)`, `Kit médical ×4`, gift strings `Nom — 2 mana / 1D10+2`) into structured fields with freeform fallback, plus formatters back to display strings; never discards data.
- **Relevant requirements**: FR-005, NFR-002.
- **Affected surfaces**: `src/utils/inventoryText.ts` + spec file.
- **Sequencing/depends-on**: IC-01.
- **Risks**: the messy corpus (no-die annotations, placeholder-only entries) — unit tests must cover every known real string.

### IC-03 — Repository writes & inventory store

- **Purpose**: Add persistence paths (backpack slot upsert/delete, weapons/armor list update) to `InventoryRepository.ts` and a `useInventoryStore.ts` singleton composable exposing load + mutations with cap clamping.
- **Relevant requirements**: FR-002, FR-003, FR-009; NFR-001, NFR-004.
- **Affected surfaces**: `src/models/repositories/InventoryRepository.ts`, `src/controllers/useInventoryStore.ts`, tests.
- **Sequencing/depends-on**: IC-01, IC-02.
- **Risks**: keep `if (!db)` no-op guarantee on every new function; enforce caps in the store (rules can't count array slots).

### IC-04 — Seed fixture migration

- **Purpose**: Regenerate `scripts/data/inventories.json` (categorized items + weapons/armor arrays) and `scripts/data/characters.json` gifts (enriched from legacy `DONS_DATA`, `legacy-reference/index.html:3305-3348`), losslessly.
- **Relevant requirements**: FR-007, FR-008; NFR-002; SC-003.
- **Affected surfaces**: `scripts/data/*.json`, optionally a one-shot `scripts/migrateInventoryFixtures.mjs`.
- **Sequencing/depends-on**: IC-01, IC-02 (uses the parser).
- **Risks**: category assignment for existing items requires judgment (legacy fixture items aren't categorized) — map against the legacy `inv_*` fields where present, else best-fit with review.

### IC-05 — Backpack slot-grid UI

- **Purpose**: Render the 10 categories with filled items and computed empty placeholders (capacity at a glance) in the character page.
- **Relevant requirements**: FR-001, FR-002; SC-001.
- **Affected surfaces**: `src/components/BackpackGrid.vue`, `src/views/PlayerView.vue`.
- **Sequencing/depends-on**: IC-01–IC-04 green (C-006).
- **Risks**: layout fidelity vs legacy grid (cols per category) — informational fidelity is contractual, exact styling is not (spec Assumptions).

### IC-06 — Slot editing & permissions surface

- **Purpose**: Reusable modal + per-slot add/edit/delete flow wired to the store; edit affordances only for owner/mj/admin.
- **Relevant requirements**: FR-003, FR-009; SC-002, SC-005.
- **Affected surfaces**: `src/components/AppModal.vue`, `src/components/InventorySlotModal.vue`, `PlayerView.vue`.
- **Sequencing/depends-on**: IC-05.
- **Risks**: first reusable modal in the codebase — keep it minimal (overlay + slot content), pattern base `src/views/CampaignListView.vue:178,449-456`.

### IC-07 — Weapons/armor display

- **Purpose**: Distinct armes/armures sections with DÉGÂTS/ARMURE badges from structured stats (or verbatim note), padded to ≥3 slots.
- **Relevant requirements**: FR-004, FR-005.
- **Affected surfaces**: `src/components/WeaponArmorList.vue`, `PlayerView.vue`.
- **Sequencing/depends-on**: IC-05 (shares slot styling), IC-06 for editing.
- **Risks**: none notable beyond badge rendering of freeform notes.

### IC-08 — Dons display & detail modal

- **Purpose**: Gift cards with mana/dice badges where data exists; click opens detail modal (MANA/DÉS/BONUS tiles + multi-line flavor text; passives show "—").
- **Relevant requirements**: FR-006, FR-010; SC-004.
- **Affected surfaces**: `src/components/DonDetailModal.vue`, `PlayerView.vue`.
- **Sequencing/depends-on**: IC-06 (reuses `AppModal.vue`); data from IC-04.
- **Risks**: mana formulas are freeform strings — display as-is, no evaluation.
