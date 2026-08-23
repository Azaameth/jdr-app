# NEXTSTEPS

Increment ledger for specs that cross CLAUDE.md's high-complexity threshold (~4+ independent acceptance criteria, or spanning state/UI/cross-system coupling). One section per such spec; delete the section once the spec is fully done and merged.

## Locked contracts (Phase 2.2)

These are locked now, ahead of the features that consume them, per CLAUDE.md's high-complexity-spec policy. Cite from the negotiation and theme specs (not yet started) instead of re-deriving. The inventory schema and the vitruve sheet's alt-form/child-character model, both once sketched here, have since shipped — see their entries below for what's actually implemented.

### Per-campaign scoping convention

- Default shape: a flat top-level collection, one doc per record, `{ campaignId, ...fields }`, queried via `where('campaignId', '==', campaignId)` — this is what `races`, `classes`, `characters`, `participants`, and `inventories` already do. New list-like campaign-scoped collections (e.g. a future `negotiations` history, if ever needed) follow this shape. Do not nest under `campaigns/{campaignId}/...` subcollections — it would be a second, inconsistent access pattern next to every existing repository.
- Exception for true one-per-campaign singletons: when a collection can only ever have exactly one live doc per campaign (negotiation's current state, theme config), key the doc directly by `campaignId` as the doc ID — `doc(db, 'negotiations', campaignId)` / `doc(db, 'themeConfigs', campaignId)` — instead of a `{campaignId}` + where-query. This replaces legacy's global singletons (`characters/_negociation`, `shared/design-config`) which clobbered across campaigns/sessions. One active negotiation per campaign is sufficient for a hobby table; revisit only if concurrent negotiations in one campaign become a real need.
- `firestore.rules` needs new `match /negotiations/{campaignId}` and `match /themeConfigs/{campaignId}` blocks (signed-in read, mj/admin write — same shape as the `campaigns` rule) when Phase 3.4/3.5 implementation lands. Not written yet.

### Typed inventory schema

**Implemented** — see `src/models/types/Inventory.ts` (`InventoryCategory`, `InventoryItem`, `WeaponArmorItem`, `CharacterInventory`, `BACKPACK_MAX_SLOTS`), shipped via spec-kitty mission `inventory-slots-dons-01KXRF5M`. The two pieces once conflated under "inventory" — capped backpack category slots and the uncapped weapons/armor lists with their hybrid structured/freeform stat fields — are both real types there now; the legacy-string parser (including the `WeaponArmorItem.statNote` fallback for annotations like `(RD2 vs proj. magiques)` and `(Armure impossible — Oracle)`) lives in `src/utils/inventoryText.ts`. Cite that code in future specs instead of re-deriving the schema here. The dead `InventoryItem`/`InventoryItemType` that used to duplicate this by name in `src/models/types/Character.ts` has been retired — `Inventory.ts` is the single source now.

### Equipment stat effects

**Implemented** — see `src/models/types/Inventory.ts` (`WeaponArmorItem.equipped`, `WeaponArmorItem.statBonus`), `src/utils/effectiveStats.ts` (`computeEffectiveMaxStat`), and `src/controllers/useInventoryStore.ts` (the `childInventories` cache + `loadChildInventories`), shipped via spec-kitty mission `equipment-stat-effects-01KY2MYD`. Roll-total (`jetTotal`) bonuses remain out of scope (spec.md C-001) — see `MIGRATION_BACKLOG.md` item 4 for the fuller writeup.

### Alt-form/transformation data model — superseded, see "Vitruve character sheet" below

**Superseded during `vitruve-character-sheet-01KXSZRT`'s spec phase.** The discovery interview (spec.md, 2026-07-18) confirmed the project owner wanted alt-forms modeled as **full child characters** (`CharacterProfile` with `parentCharacterId`, live vitals in the parent participant's `childSessions[childId]`) rather than the `AltFormDefinition` nested-object scheme originally sketched below — a child needed the *entire* character shape (skills, gifts, languages), not a stripped-down stat block, and the parent/child relationship generalizes better to "multiple children" than a single `altForm` field would. See `src/models/types/Character.ts` (`CharacterProfile.parentCharacterId`) and `src/models/types/Participant.ts` (`childSessions`) for the locked contract actually implemented, and `src/components/vitruve/ChildSheetTab.vue` for the renderer.

The model is implemented, but the live data behind it is not: Firm's Furmiaou form doesn't currently appear in Firebase or the web view. That's not a model gap — `scripts/data/characters.json`/`participants.json` already contain a correct Furmiaou fixture (`parentCharacterId: "firm"`, `childSessions.furmiaou`), it just hasn't been pushed via `npm run seed:defaultchars:admin`. See `MIGRATION_BACKLOG.md`'s "Bugs (operational, small)" section for the fix and the "multiple transformations" feature entry for the remaining generalization work (multi-child tab UI, a non-seed-script way to attach a transformation to any character).

The original sketch is kept below only as a historical record of the road not taken:

<details>
<summary>Original sketch (not implemented)</summary>

- **Static**, on the character doc: `characters/{characterId}.altForm: AltFormDefinition | null` — a nested object, not a separate collection (1:1 with a character, never queried independently across characters).
  ```ts
  interface AltFormStatCategory {
    basePercent: number
    subs: { label: string; value: number }[]
  }
  interface AltFormDefinition {
    label: string            // e.g. "Forme Bestiale" — generalizes "Furmiaou"
    portraitUrl?: string
    maxHp: number
    maxMana?: number          // legacy's Furmiaou has 0/"Aucune magie" — optional, defaults to 0
    tags?: string[]           // e.g. ["Nature", "Transmutation"]
    statBlock: { physique: AltFormStatCategory; social: AltFormStatCategory; mental: AltFormStatCategory }
    abilities: { name: string; description: string }[]
  }
  ```
- **Live**, on the participant doc: `participants/{id}.session.altForm?: { hp: number; mana?: number }` — updated through the *same* `usePlayerStore.setSessionResource` clamp path already used for hp/mana (extend it to accept an optional alt-form sub-resource), not a parallel update function.
- The per-sub jaune/rouge state cycling (legacy's `_caracStates`, keyed `furm_<cat>_<idx>` vs `<charName>_<cat>_<idx>`) is reused as-is once Phase 3.3(b) introduces it for the main sheet — the alt-form stat block uses the same keying scheme, not a bespoke one.
- Deliberately not modeled (no second data point to generalize from yet): multiple alt-forms per character, a structured mana-cost field per ability (legacy embeds cost in the description text inconsistently — don't force-extract it).

</details>

## (template for the next high-complexity spec)

Copy this section's shape when the next spec crosses the threshold: Status line, schema/contract-to-lock list, increment checklist.
