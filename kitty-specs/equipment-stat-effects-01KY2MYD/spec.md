# Mission Specification: Equipment Stat Effects

**Mission**: `equipment-stat-effects-01KY2MYD`
**Created**: 2026-07-21
**Status**: Draft
**Target branch**: `feat/equipment-stat-effects`

## Intent Summary

- **Primary actor**: a *joueur* (player) or *MJ* viewing a character sheet.
- **Trigger**: a character has one or more equipped weapon/armor items that carry a stat bonus (e.g. a Mana Ring granting +4 max mana).
- **Desired outcome**: the character's displayed max HP / max Mana automatically reflects the sum of all currently equipped items' bonuses to that stat — no manual edit of the stored max value is needed when gear changes.
- **Key invariant**: only *equipped* items contribute; unequipped items in the same weapon/armor list never do. Multiple equipped items bonusing the same stat simply sum. `statNote` stays a pure flavor-text field, never parsed for mechanical effect.
- **Canonical terms**: see Domain Language below.

Discovery was a short, targeted interview (2026-07-21) grounded in code research (see Assumptions) rather than a full open-ended discovery, since the backlog entry (`MIGRATION_BACKLOG.md` item 4) and CLAUDE.md's high-complexity policy already framed the problem. Four scoping questions were confirmed with the project owner: bonus scope (max HP/Mana only, not roll totals), item types (WeaponArmorItem only, not backpack items), equip/stacking rule (equipped-only, additive), and mission boundary (schema + compute/display layer only, no guided authoring UI yet).

## User Scenarios & Testing

### Primary scenarios

1. **Voir un bonus d'équipement actif** — A player opens their character sheet with a +4 Mana Ring equipped. The displayed max mana is the character's base max mana plus 4, without anyone having edited the stored max-mana value by hand.
2. **Équiper un objet à bonus** — The MJ (via the existing raw-JSON editor or seed data, since a guided authoring UI is out of scope) marks a weapon/armor item as equipped and gives it a structured bonus. The next time the character sheet is viewed, the bonus is included in the displayed max stat.
3. **Déséquiper un objet à bonus** — An item with a stat bonus is marked as not equipped. The character's displayed max stat drops back to not include that item's bonus.
4. **Cumul de plusieurs bonus** — A character has two equipped items each bonusing max mana (e.g. +4 and +2). The displayed max mana includes both, additively (+6 total).
5. **Objet sans bonus mécanique** — A weapon/armor item has only a `statNote` flavor annotation (e.g. "(RD2 vs proj. magiques)") and no structured bonus. It contributes nothing to computed stats and its note still displays as before.

### Edge cases

- A character with no equipped items carrying a bonus displays exactly their stored base max HP/Mana, unchanged from today's behavior.
- An item's structured bonus and its `statNote` free text can coexist (e.g. a mechanical +2 armor bonus with a note like "(Armure impossible — Oracle)" describing a restriction) — the note is never parsed to derive or override the mechanical amount.
- A transformation/child character (`parentCharacterId`) has its own independent inventory and equipped items; its computed max stats use only its own equipped items' bonuses, not the parent's.
- Current HP/Mana (the live, damage-tracked value) is unaffected by this mission — only the *max* value changes; existing clamping of current value to max continues to apply against the new equipment-adjusted max.

## Domain Language

| Canonical term | Meaning | Avoid |
|---|---|---|
| bonus d'équipement / stat bonus | A structured `{ stat, amount }` effect an equipped `WeaponArmorItem` applies to a computed max stat | "modifier" alone (ambiguous with `JetCalculator`'s manual roll modifier) |
| équipé / equipped | A `WeaponArmorItem` marked as currently worn/wielded, contributing its bonus | "actif" |
| statNote | Free-text flavor/restriction annotation on an item, never mechanically parsed | "description" |
| stat de base / base max | The character's stored `maxHp`/`maxMana` before equipment bonuses are added | "raw stat" |
| stat affichée / effective max | Base max plus the sum of equipped bonuses to that stat — what the sheet displays | "total stat" |

## Requirements

### Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | `WeaponArmorItem` gains an `equipped: boolean` field (mirroring `InventoryItem.equipped`), defaulting to `false` for items that don't set it. | Confirmed |
| FR-002 | `WeaponArmorItem` gains a structured, optional bonus shape describing what stat it affects and by how much, distinct from and additional to the existing `statNote` free-text field. Only `maxHp` and `maxMana` are valid bonus targets in this mission. | Confirmed |
| FR-003 | A character's effective max HP and effective max Mana equal the stored base `maxHp`/`maxMana` (`CharacterSessionState`) plus the sum of the `amount` of every *equipped* weapon/armor item's bonus targeting that stat. | Confirmed |
| FR-004 | The effective max HP/Mana (not the raw stored base) is what renders on the character sheet (`VitruveSheet.vue`) and on a transformation's sheet (`ChildSheetTab.vue`). | Confirmed |
| FR-005 | A child/transformation character's effective max stats are computed from that child's own equipped items only — never the parent character's inventory. | Confirmed |
| FR-006 | Unequipping an item (or an item with no bonus) removes/excludes its contribution from the effective max the next time it's computed — this is a pure derived computation, not a value that needs separate persistence or migration. | Confirmed |
| FR-007 | `statNote` is never read by the bonus-aggregation logic; it continues to render as free text exactly as today. | Confirmed |
| FR-008 | Existing seed/fixture weapon/armor data (`scripts/data/inventories.json`) is updated so at least one real example (the +4 Mana Ring backlog example) exercises the new fields end-to-end. | Confirmed |
| FR-009 | Once this mission ships, `MIGRATION_BACKLOG.md` item 4 and `NEXTSTEPS.md` reflect it, per charter Directive 2 (docs stay synchronized with behavior changes) and CLAUDE.md's high-complexity-spec increment-ledger policy. Added during plan-phase remediation (`/spec-kitty.analyze` finding A2) — plan.md's Charter Check already implied this; this makes it an explicit, tracked requirement. | Confirmed |

### Non-Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-001 | 100% of effective-max-stat computations complete without throwing, including when no backend is configured (public demo build) or inventory data is absent — same no-op-safe posture as the rest of the app. | Confirmed |
| NFR-002 | 100% of the equip/bonus/stacking combinations named in FR-003/FR-005/FR-006 (single bonus, multiple stacked bonuses, unequipped item, no-bonus item, child-vs-parent isolation) are covered by unit tests on the aggregation logic, independent of any Vue component. | Confirmed |
| NFR-003 | All quality gates stay green: type-check, lint, and unit tests pass in CI. | Confirmed |
| NFR-004 | Any new user-facing string (if the sheet ever needs to indicate "bonus included") is French, consistent with the app's existing tone. | Confirmed |

### Constraints

| ID | Constraint | Status |
|---|---|---|
| C-001 | Only `maxHp` and `maxMana` are in scope as bonus targets this mission — not `jetTotal`/roll-total bonuses, not other attributes. Extending to roll totals is explicitly deferred to a follow-up mission. | Locked |
| C-002 | Only `WeaponArmorItem` entries can carry a bonus this mission — backpack `InventoryItem` entries (rings/amulets stored as regular inventory) are out of scope. | Locked |
| C-003 | No guided MJ-facing UI for authoring a bonus is built in this mission. Bonuses are set via seed fixtures or the existing `RawCharacterEditor.vue` raw-JSON editor. A guided editing UI is a candidate follow-up mission. | Locked |
| C-004 | `statNote` is not touched, restructured, or parsed — it remains exactly the free-text fallback field it is today (`src/utils/inventoryText.ts`'s legacy-string parser is unaffected). | Confirmed |
| C-005 | Existing repo conventions apply: typed schema lives in `src/models/types/Inventory.ts`, aggregation logic is a plain composable/util (not embedded ad-hoc in a component), store/repository patterns per `CLAUDE.md` are unchanged. | Confirmed |
| C-006 | Delivery order: the schema + aggregation-logic work package (types, unit-tested computation) is completed and green before the display work package (wiring the computed effective max into `VitruveSheet.vue`/`ChildSheetTab.vue`) begins. | Confirmed |

## Success Criteria

| ID | Criterion |
|---|---|
| SC-001 | A character with an equipped +4 Mana Ring shows a max mana 4 higher than their stored base max mana, with zero manual edits to the stored value. |
| SC-002 | Unequipping that item drops the displayed max mana back to the base value on the next view. |
| SC-003 | Two equipped items each bonusing the same stat produce an additive, not overwritten, effective value (100% of test cases with 2+ stacked bonuses sum correctly). |
| SC-004 | A transformation/child character's displayed max stats never include the parent character's equipment bonuses, and vice versa. |
| SC-005 | An item with only a `statNote` (no structured bonus) contributes exactly 0 to computed stats and its note text is unchanged from current rendering. |

## Key Entities

- **WeaponArmorItem bonus** — an optional, structured `{ stat: 'maxHp' | 'maxMana'; amount: number }` on a `WeaponArmorItem`, plus a new `equipped: boolean` on the same item, both additive to and independent of the existing `statNote` free-text field.
- **Effective max stat** — a derived (not stored) number: a character's or child's base `maxHp`/`maxMana` plus the sum of `amount` across that same character's/child's currently equipped items whose bonus targets that stat.

## Assumptions

- Grounding code research (this session, pre-interview) confirmed: `WeaponArmorItem` (`src/models/types/Inventory.ts:34-41`) has no `equipped` flag and untyped `damageBonus`/`armorRating` numbers with no target-stat concept and zero consumers; `jetFormula.ts`'s `jetTotal()` has no equipment-input slot; `CharacterSessionState.maxHp`/`maxMana` (`src/models/types/Participant.ts`) are raw stored fields with no existing formula to extend, so a new aggregation layer is required rather than a plug-in to one; `CharacterRepository`/`useInventoryStore.ts` have no code today reading `damageBonus`/`armorRating` into any calculation.
- The new bonus field is additive to `damageBonus`/`armorRating` (which describe the item's own combat stat, e.g. weapon damage or armor rating) — it is a distinct concept, not a rename of those fields. Exact interaction (if any) between `armorRating`/`damageBonus` and the new bonus shape is left to the plan phase to resolve against the actual `Inventory.ts` types, since it wasn't raised as an open question in discovery.
- This is a hobby-project single-campaign deployment; no migration tooling beyond updating seed fixtures is needed for existing data (consistent with how `inventory-slots-dons-01KXRF5M` handled its own fixture migration).
- Current (non-max) HP/Mana tracking, clamping, and the `setSessionResource` write path are unaffected by this mission except that the ceiling they clamp against becomes the new effective max instead of the raw stored max.
