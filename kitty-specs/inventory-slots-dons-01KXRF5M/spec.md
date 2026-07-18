# Mission Specification: Inventory Slots & Dons System

**Mission**: `inventory-slots-dons-01KXRF5M`
**Created**: 2026-07-17
**Status**: Draft
**Target branch**: `feat/inventory-slots-dons`

## Intent Summary

- **Primary actor**: a *joueur* (player) viewing and managing their own character, and the *MJ* (game master) managing any character.
- **Trigger**: opening a character page during or between game sessions.
- **Desired outcome**: the character's equipment is presented the way the table already plays it in the legacy app — a backpack organized into fixed, slot-capped categories with visible free space, weapons and armor with readable combat stats, and gifts ("dons") that reveal their full combat data and flavor text on demand — all of it persisted and editable by the right people.
- **Key invariant**: no information from the legacy data may be silently lost during migration; anything that doesn't fit the structured fields is preserved verbatim as a freeform note.
- **Canonical terms**: see Domain Language below.

Discovery was intentionally minimal: scope, contracts, and delivery order were confirmed by the project owner via an approved plan (2026-07-17) built on the pre-locked schema contract in `NEXTSTEPS.md` ("Typed inventory schema") and a behavioral read of `legacy-reference/index.html`.

## User Scenarios & Testing

### Primary scenarios

1. **Consulter le sac à dos** — A player opens their character page and sees their backpack grouped into 10 fixed categories (Nourriture, Munitions, Bivouac, Soins, Potions, Objets de quête, Objets spéciaux, Documents, Gemmes, Butin). Each category shows its filled items (name, quantity when relevant) and its remaining free slots as empty placeholders, so capacity is readable at a glance.
2. **Modifier un emplacement** — The player selects a slot (filled or empty) of their own character, enters/edits the item name and optional quantity, saves, and the change is persisted: it survives a page reload and is visible to the MJ.
3. **Consulter armes et armures** — Weapons and armor appear as distinct sections. Each entry shows its combat stat as a badge (DÉGÂTS for weapons, ARMURE for armor). Both sections always display at least 3 slots, padding with empty placeholders.
4. **Consulter un don** — The player clicks a gift card; a detail view opens showing three stat tiles (MANA, DÉS, BONUS) and the gift's flavor text with its original line breaks. Gifts without combat data (passives) show "—" in the tiles rather than misleading zeros.
5. **Permissions** — A joueur attempting to edit another character's inventory is denied; the MJ (or admin) can edit any character's inventory.

### Edge cases

- A category at full capacity offers no way to add another item (no overflow beyond the cap).
- A legacy stat annotation that doesn't reduce to structured fields (e.g. `(RD2 vs proj. magiques)`, `(vs proj. magiques)`, `(Armure impossible — Oracle)`) is preserved and displayed verbatim — never discarded.
- An item without a quantity displays its name only (no "×1" noise); quantities > 1 display as "×N".
- When the backend is not configured (public demo build), the character page still renders read-only without errors; editing is unavailable but nothing crashes.
- A gift whose mana cost is a formula rather than a number (e.g. "X", "2+(1/5m)", "Tout") displays the formula as-is.

## Domain Language

| Canonical term | Meaning | Avoid |
|---|---|---|
| don | A character gift/spell/passive ability | "sort" alone, "skill" |
| sac à dos | The 10-category slotted backpack | "équipement" (ambiguous with armes/armures) |
| emplacement | One slot within a category, filled or empty | "case" |
| armes / armures | Weapon / armor lists with combat stats, outside the backpack | mixing them into "inventaire" items |
| MJ | Game master role (`mj`), full edit rights | "DM" |
| joueur | Player role, edits only their own character | — |

## Requirements

### Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | The backpack is organized into exactly 10 fixed categories with hard slot caps: nourriture 1, munitions 2, quete 7, speciaux 7, docs 9, gemmes 9, bivouac 15, soins 15, potions 15, butin 16. | Confirmed |
| FR-002 | Each category displays empty-slot placeholders up to its cap; empty slots are computed from cap minus filled count, never stored as records. | Confirmed |
| FR-003 | A slot supports add, edit, and delete of an item (name + optional quantity); changes are persisted and visible to all viewers of the character. | Confirmed |
| FR-004 | Weapons and armor are managed as separate lists (not backpack categories), uncapped, each entry carrying structured combat stats; display pads each list to a minimum of 3 slots and shows a DÉGÂTS badge (weapons) or ARMURE badge (armor). | Confirmed |
| FR-005 | Conversion of legacy stat annotations to structured stats never discards information: what parses becomes structured fields (damage die, damage bonus, armor rating); what doesn't is kept verbatim as a freeform note and displayed. | Confirmed |
| FR-006 | Each don carries, where applicable, a mana cost (numeric or formula), damage dice, damage bonus, and multi-line flavor text; clicking a don opens a detail view with MANA / DÉS / BONUS tiles and the flavor text with preserved line breaks. | Confirmed |
| FR-007 | The legacy per-character gift data (`DONS_DATA`, `legacy-reference/index.html:3305-3348`) is migrated into the persisted character gift data via the seed fixtures — it stops being unpersisted client-side data. | Confirmed |
| FR-008 | Existing seed inventory data (`scripts/data/inventories.json`, gifts in `scripts/data/characters.json`) is migrated to the new typed shapes: backpack items gain a category, weapons/armor move to their own lists, gift strings are split into structured fields. | Confirmed |
| FR-009 | Inventory editing is permitted only to the inventory's owner or to MJ/admin roles — deliberately narrower than legacy, where any signed-in user could edit any slot. | Confirmed |
| FR-010 | Dons without combat data (passives) render without misleading values: stat tiles show "—", and no mana/dice badges appear on the list card. | Confirmed |

### Non-Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-001 | With no backend configured (public demo build), the character page renders read-only with zero runtime errors; 100% of new data operations degrade to safe no-ops. | Confirmed |
| NFR-002 | Migration is lossless: 100% of the known legacy strings round-trip without information loss, verified against the real corpus including `(D4/−1)`, `(D10/+4)`, `(RD2)`, `(RD2 vs proj. magiques)`, `(vs proj. magiques)`, `(Armure impossible — Oracle)`, `Kit médical ×4`. | Confirmed |
| NFR-003 | All quality gates stay green at each delivery increment: type-check, lint, and unit tests pass in CI with new logic covered by unit tests. | Confirmed |
| NFR-004 | All user-facing strings are French, consistent in tone with the existing app's messages. | Confirmed |

### Constraints

| ID | Constraint | Status |
|---|---|---|
| C-001 | The schema contract is already locked in `NEXTSTEPS.md` § "Typed inventory schema" (category set + code-level max-slot lookup; hybrid weapon/armor item with structured optional fields plus freeform fallback). Cite it; do not re-derive or alter it. | Locked |
| C-002 | The character inventory record extends the existing shape: backpack items gain a required category; weapons and armor become two new lists of hybrid weapon/armor items on the same record. | Locked |
| C-003 | The character gift shape is enriched with optional damage dice (freeform string — legacy values like "1D6+1D8" fit no enum), numeric damage bonus, and a freeform mana note alongside the existing numeric mana cost; the description field becomes real flavor text. | Locked |
| C-004 | The dead duplicate inventory types in `src/models/types/Character.ts` (unused `InventoryItem`/`InventoryItemType`) are retired as part of this mission. | Confirmed |
| C-005 | Existing repo conventions apply (singleton-composable stores, repository no-backend guard, doc mapping, French error fallbacks). The existing `inventories` access rules already express FR-009; no rules change. | Confirmed |
| C-006 | Delivery order: the data layer (types, parser, repository writes, store, fixture migration, unit tests) is one independently green work package (WP1) completed and validated before any UI work package begins. | Confirmed |
| C-007 | Out of scope: the Vitruve interactive sheet shell (tabs, body-zone navigation), the alt-form/transformation tab (Phase 3.3 per `NEXTSTEPS.md`), and the legacy dead `equip` field (superseded by the slot data, not migrated). | Confirmed |

## Success Criteria

| ID | Criterion |
|---|---|
| SC-001 | A player sees their entire backpack organized in the 10 categories with remaining capacity visible at a glance (empty placeholders), matching the legacy layout's information content. |
| SC-002 | A player edits a slot of their own character and the change survives a page reload and is visible from another account viewing the same character. |
| SC-003 | 100% of the existing seeded characters' inventory and gift information appears in the new format with no lost data (spot-checkable string by string against the legacy fixtures). |
| SC-004 | Clicking any don that has combat data opens its detail view showing mana, dice, bonus, and flavor text; passives open with "—" tiles. |
| SC-005 | A joueur's attempt to edit another character's inventory is refused; the MJ can edit any inventory. |

## Key Entities

- **Character inventory** — one record per character per campaign; holds categorized backpack items plus separate weapon and armor lists. Owned by a user; readable by all signed-in campaign members.
- **Backpack item** — name + optional quantity, belonging to exactly one of the 10 categories.
- **Weapon/armor item** — name + structured combat stats (damage die/bonus or armor rating) with a freeform note fallback.
- **Don (gift)** — lives on the character record; name, source, flavor text, optional mana cost (numeric or formula), damage dice, damage bonus.

## Assumptions

- Slot caps and category labels come from the legacy reference (`legacy-reference/index.html:3168-3186`) and were verified against it; they are fixed game rules, not user-configurable.
- Data migration happens through the seed fixtures and seeding scripts (the table re-seeds); no in-place production data migration tooling is needed for this hobby deployment.
- The permission model relies on the already-deployed access rules for the `inventories` collection; gifts live on the character record and follow the existing character write rules.
- Icon/color styling details from legacy are desirable but not contractual; the UI work packages may adapt them to the app's existing visual language.
