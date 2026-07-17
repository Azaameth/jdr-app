# NEXTSTEPS

Increment ledger for specs that cross CLAUDE.md's high-complexity threshold (~4+ independent acceptance criteria, or spanning state/UI/cross-system coupling). One section per such spec; delete the section once the spec is fully done and merged.

## Locked contracts (Phase 2.2)

These are locked now, ahead of the features that consume them, per CLAUDE.md's high-complexity-spec policy. Cite from the Vitruve sheet, inventory, negotiation, and theme specs below instead of re-deriving.

### Per-campaign scoping convention

- Default shape: a flat top-level collection, one doc per record, `{ campaignId, ...fields }`, queried via `where('campaignId', '==', campaignId)` — this is what `races`, `classes`, `characters`, `participants`, and `inventories` already do. New list-like campaign-scoped collections (e.g. a future `negotiations` history, if ever needed) follow this shape. Do not nest under `campaigns/{campaignId}/...` subcollections — it would be a second, inconsistent access pattern next to every existing repository.
- Exception for true one-per-campaign singletons: when a collection can only ever have exactly one live doc per campaign (negotiation's current state, theme config), key the doc directly by `campaignId` as the doc ID — `doc(db, 'negotiations', campaignId)` / `doc(db, 'themeConfigs', campaignId)` — instead of a `{campaignId}` + where-query. This replaces legacy's global singletons (`characters/_negociation`, `shared/design-config`) which clobbered across campaigns/sessions. One active negotiation per campaign is sufficient for a hobby table; revisit only if concurrent negotiations in one campaign become a real need.
- `firestore.rules` needs new `match /negotiations/{campaignId}` and `match /themeConfigs/{campaignId}` blocks (signed-in read, mj/admin write — same shape as the `campaigns` rule) when Phase 3.4/3.5 implementation lands. Not written yet.

### Typed inventory schema

Two distinct pieces currently conflated under "inventory" — model them separately:

1. **Backpack category slots** (`nourriture`, `munitions`, `bivouac`, `soins`, `potions`, `quete`, `speciaux`, `docs`, `gemmes`, `butin`) — simple name+quantity items, hard slot-capped per category. `category` enum + a code-level max-slots lookup table (not per-doc placeholder documents; empty slots computed client-side as `maxSlots - filledCount`):
   ```
   nourriture: 1, munitions: 2, quete: 7, speciaux: 7, docs: 9, gemmes: 9,
   bivouac: 15, soins: 15, potions: 15, butin: 16
   ```
   (Verified against `legacy-reference/index.html:3176-3186` — the plan's original count omitted `soins: 15`.)
2. **Weapons/armor** (`armes`/`armures`) — NOT slot-capped in legacy (list grows freely; UI just pads to a minimum of 3 empty slots). Legacy's `(...)` stat annotation is **not** a clean parseable DSL — real character data (`legacy-reference/index.html:1912-1916`) includes entries like `(RD2 vs proj. magiques)`, `(vs proj. magiques)` with no number at all, and `(Armure impossible — Oracle)` as a whole placeholder. A strict `damageDie` enum + numeric `armorRating` would silently drop these. Use a hybrid: structured optional fields for the common case, plus a freeform fallback:
   ```ts
   interface WeaponArmorItem {
     name: string
     damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
     damageBonus?: number   // the "+4"/"−1" part
     armorRating?: number   // the "RD2" part
     statNote?: string      // anything that doesn't reduce to the above,
                             // e.g. "vs proj. magiques", "Armure impossible — Oracle"
   }
   ```
   A parser attempts the structured fields first and falls back to `statNote` — never throws away data.
- Cleanup while implementing this: `src/models/types/Character.ts` already declares an `InventoryItem`/`InventoryItemType` that's unused anywhere in `src/` (confirmed via grep) and duplicates-by-name the real, wired `InventoryItem` in `src/models/types/Inventory.ts` (the one `InventoryRepository.ts` actually uses). Retire the dead one so there's a single `InventoryItem` type.

### Alt-form/transformation data model

Generalizes legacy's hardcoded "Furmiaou" tab (`legacy-reference/index.html:3494-3616`, the one real data point). Split static definition from live session state, mirroring how the base character sheet already splits `characters` (static) from `participants.session` (live hp/mana) — this is the actual fix for legacy's bug, where the alt-form's HP (`_furmPV`) was a page-load-only JS variable, never persisted:

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

## Inventory slots & dons system (spec-kitty mission `inventory-slots-dons-01KXRF5M`)

Status: **WP03 approved** (2026-07-17) — WP04/WP05 pending. Branch: `feat/inventory-slots-dons`; WP code lives on lane branches (`...lane-a`/`-b`/`-c` for WP01/02/03) until `spec-kitty merge` after WP05. Mission artifacts (spec/plan/contracts/tasks/analysis) in `kitty-specs/inventory-slots-dons-01KXRF5M/`.

The "Typed inventory schema" contract below is now **implemented** in WP01 (`src/models/types/Inventory.ts`, plus `src/utils/inventoryText.ts` parser, `InventoryRepository` writes, `useInventoryStore`, migrated fixtures) — future specs cite the code, not the prose. Two contract addenda from implementation: `CharacterInventory.id` (Firestore doc id, analysis finding U1) and `WeaponArmorItem.itemId` were added; `equipped` is vestigial and omitted from regenerated fixtures (U2). WP02 adds read-only display (`src/components/BackpackGrid.vue`, `src/components/WeaponArmorList.vue`, `PlayerView.vue` integration) — the old "équipé" badge is gone per U2.

**Increments** (resume with `spec-kitty next --agent claude --mission inventory-slots-dons-01KXRF5M`):

- [x] WP01 — Data layer: types, parser, repository writes, store, fixture migration (approved cycle 1, 120 unit tests)
- [x] WP02 — Backpack & equipment display (approved cycle 1, 139 unit tests)
- [x] WP03 — Slot editing modals & permissions (approved cycle 2 — cycle 1 rejected for missing save/delete integration tests, fixed; 172 unit tests). `AppModal.vue` is now the reusable modal base (generic, a11y: role=dialog/Escape/backdrop); WP04's DonDetailModal must reuse it unmodified.
- [ ] WP04 — Dons cards & detail modal
- [ ] WP05 — E2E smoke, docs updates, final gates → then `spec-kitty accept` + `spec-kitty merge`, PR to `main`

## Vitruve character sheet (interactive layer)

Status: **not started** — schema/naming contract locked above.

Replaces `PlayerView.vue`'s read-mostly display with the full interactive gameplay surface from legacy's "Layout vitruve JDR" (`legacy-reference/index.html:2361-3350`), plus the generalized alt-form/transformation sub-sheet above (generalizing legacy's hardcoded "Furmiaou" tab).

**Increments** (each merged and green before the next, `/clear` between):

- [ ] (a) Dice-roll calculator as a pure, isolated function — Physique/Social/Mental categories, skill-check bonuses, ±5% modifiers, 5–95% clamp, Avantage/Désavantage. No UI dependency, highest testability — do this first.
- [ ] (b) Body-zone SVG nav + tabbed panel shell (Fiche/Caractéristiques/Dons/Inventaire/alt-form). UI-only, no new Firestore writes. Accessible/keyboard-operable regions (not legacy's click-only zones).
- [ ] (c) Firestore-synced PV/Mana pill buttons + live "État du groupe" party status. Extends `usePlayerStore.ts` / `ParticipantRepository.ts` — needs the Phase 2.1 characterization tests in place first.
- [ ] (d) Alt-form/transformation tab, built against the locked data model from above.

## (template for the next high-complexity spec)

Copy this section's shape when the next spec crosses the threshold: Status line, schema/contract-to-lock list, increment checklist.
