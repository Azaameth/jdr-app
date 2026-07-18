# Research — Inventory Slots & Dons System

Phase 0 output. No `[NEEDS CLARIFICATION]` markers remained in the spec; this records the material decisions and their rationale (DIRECTIVE_003), most of which were pre-locked in `NEXTSTEPS.md` § "Typed inventory schema" and confirmed via the owner-approved plan of 2026-07-17.

## D1 — Hybrid weapon/armor stats instead of a strict DSL

- **Decision**: `WeaponArmorItem` with optional structured fields (`damageDie`, `damageBonus`, `armorRating`) plus a freeform `statNote` fallback; the parser fills structured fields when the annotation matches and stores the remainder verbatim.
- **Rationale**: real legacy data (`legacy-reference/index.html:1912-1916`) contains `(RD2 vs proj. magiques)`, `(vs proj. magiques)` (no number), and `(Armure impossible — Oracle)` (placeholder-only). A strict enum+number schema would silently drop these, violating NFR-002.
- **Alternatives considered**: strict parseable DSL (rejected — lossy); keeping raw strings only (rejected — blocks the future dice calculator and badge rendering from using structured stats).

## D2 — Backpack caps as a code-level lookup, empty slots computed

- **Decision**: `InventoryCategory` union + `BACKPACK_MAX_SLOTS` constant table (`nourriture:1, munitions:2, quete:7, speciaux:7, docs:9, gemmes:9, bivouac:15, soins:15, potions:15, butin:16`, verified against `legacy-reference/index.html:3176-3186`); empty slots are `max - filledCount` client-side.
- **Rationale**: caps are fixed game rules; storing placeholder docs would bloat every inventory doc and create write races for "empty" state.
- **Alternatives considered**: per-doc placeholder entries (rejected — locked contract explicitly forbids it).

## D3 — Weapons/armor as separate arrays on the same inventory doc

- **Decision**: extend `CharacterInventory` with `weapons: WeaponArmorItem[]` and `armor: WeaponArmorItem[]`; backpack `items[]` gains required `category`. One doc per character per campaign, unchanged collection.
- **Rationale**: mirrors legacy's separation (`armes`/`armures` fields vs `inv_*` fields); keeps a single read for the whole inventory; no rules change needed.
- **Alternatives considered**: separate `weapons` collection (rejected — over-scoped for 1:1 data, second access pattern); a `type` discriminator inside `items[]` (rejected — weapons are uncapped and carry different fields; conflating re-creates legacy's mess the locked contract splits).

## D4 — Gift enrichment lives on the character doc

- **Decision**: extend `CharacterGift` with `damageDice?: string`, `damageBonus?: number`, `manaNote?: string` (alongside existing `manaCost?: number`); `description` becomes real multi-line flavor text. Legacy `DONS_DATA` (`legacy-reference/index.html:3305-3348`) is merged into the seed fixtures.
- **Rationale**: gifts are already embedded on `characters/{id}` (`Character.ts:34-41`); legacy's client-side constant was the bug (unpersisted, unmergeable). `damageDice` stays freeform because real values include `1D6+1D8`; `manaNote` absorbs formulas (`X`, `2+(1/5m)`, `Tout`) that don't reduce to a number.
- **Alternatives considered**: a separate `gifts` collection (rejected — 1:1 with character, never queried across characters); numeric-only mana (rejected — lossy).

## D5 — Permission model: owner or mj/admin

- **Decision**: per-slot editing allowed for the inventory's `uid` owner and mj/admin; enforced by the existing deployed rule (`firestore.rules:119-127`) server-side and by role checks in the UI.
- **Rationale**: legacy allowed any signed-in user to edit any slot — an accident of the prototype, not a desired behavior; the current app's role model already expresses the intended gating with zero new rules surface.
- **Alternatives considered**: copying legacy's open editing (rejected — spec FR-009 explicitly narrows it).

## D6 — Fixture migration via one-shot script, committed JSON output

- **Decision**: write `scripts/migrateInventoryFixtures.mjs` that reads the current fixtures + a small embedded port of legacy `DONS_DATA`, emits the new-shape `inventories.json` / `characters.json`, and commit the *outputs*. The script stays in the repo as documentation of the mapping.
- **Rationale**: 5 characters × dozens of strings is too error-prone to hand-edit but too small to need runtime migration tooling; the table re-seeds via existing `seedAll.mjs` / admin scripts.
- **Alternatives considered**: hand-editing JSON (rejected — silent-loss risk against NFR-002's 100% target); in-app lazy migration of live docs (rejected — hobby deployment re-seeds; complexity unjustified).

## D7 — `src/utils/` as the home for pure helpers

- **Decision**: create `src/utils/` for the parser/formatter module (`inventoryText.ts`).
- **Rationale**: no existing home for I/O-free logic (`src/models/` is types+repositories, `src/controllers/` is stores); `NEXTSTEPS.md` Vitruve increment (a) already plans a pure dice-roll calculator that will need the same home.
- **Alternatives considered**: `src/models/inventoryText.ts` (rejected — blurs the models=data-shapes convention); embedding parsing in the store (rejected — untestable in isolation, violates separation).

## D8 — Reusable `AppModal.vue` (UI phase)

- **Decision**: extract one minimal overlay component (backdrop, ✕/backdrop-click close, slot content) from the `CampaignListView.vue:178,449-456` inline pattern; both `InventorySlotModal` and `DonDetailModal` compose it.
- **Rationale**: two modals in this mission plus more coming (Vitruve sheet); duplicating the inline overlay twice would be immediate tech debt.
- **Alternatives considered**: a dialog library (rejected — dependency for a trivial need); two bespoke inline overlays (rejected — duplication).
