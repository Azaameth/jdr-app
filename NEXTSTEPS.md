# NEXTSTEPS

Increment ledger for specs that cross CLAUDE.md's high-complexity threshold (~4+ independent acceptance criteria, or spanning state/UI/cross-system coupling). One section per such spec; delete the section once the spec is fully done and merged.

## Locked contracts (Phase 2.2)

These are locked now, ahead of the features that consume them, per CLAUDE.md's high-complexity-spec policy. Cite from the Vitruve sheet, negotiation, and theme specs below instead of re-deriving (the inventory schema itself shipped as `inventory-slots-dons-01KXRF5M` — see its entry below).

### Per-campaign scoping convention

- Default shape: a flat top-level collection, one doc per record, `{ campaignId, ...fields }`, queried via `where('campaignId', '==', campaignId)` — this is what `races`, `classes`, `characters`, `participants`, and `inventories` already do. New list-like campaign-scoped collections (e.g. a future `negotiations` history, if ever needed) follow this shape. Do not nest under `campaigns/{campaignId}/...` subcollections — it would be a second, inconsistent access pattern next to every existing repository.
- Exception for true one-per-campaign singletons: when a collection can only ever have exactly one live doc per campaign (negotiation's current state, theme config), key the doc directly by `campaignId` as the doc ID — `doc(db, 'negotiations', campaignId)` / `doc(db, 'themeConfigs', campaignId)` — instead of a `{campaignId}` + where-query. This replaces legacy's global singletons (`characters/_negociation`, `shared/design-config`) which clobbered across campaigns/sessions. One active negotiation per campaign is sufficient for a hobby table; revisit only if concurrent negotiations in one campaign become a real need.
- `firestore.rules` needs new `match /negotiations/{campaignId}` and `match /themeConfigs/{campaignId}` blocks (signed-in read, mj/admin write — same shape as the `campaigns` rule) when Phase 3.4/3.5 implementation lands. Not written yet.

### Typed inventory schema

**Implemented** — see `src/models/types/Inventory.ts` (`InventoryCategory`, `InventoryItem`, `WeaponArmorItem`, `CharacterInventory`, `BACKPACK_MAX_SLOTS`), shipped via spec-kitty mission `inventory-slots-dons-01KXRF5M`. The two pieces once conflated under "inventory" — capped backpack category slots and the uncapped weapons/armor lists with their hybrid structured/freeform stat fields — are both real types there now; the legacy-string parser (including the `WeaponArmorItem.statNote` fallback for annotations like `(RD2 vs proj. magiques)` and `(Armure impossible — Oracle)`) lives in `src/utils/inventoryText.ts`. Cite that code in future specs instead of re-deriving the schema here. The dead `InventoryItem`/`InventoryItemType` that used to duplicate this by name in `src/models/types/Character.ts` has been retired — `Inventory.ts` is the single source now.

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
