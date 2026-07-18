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

### Alt-form/transformation data model — superseded, see "Vitruve character sheet" below

**Superseded during `vitruve-character-sheet-01KXSZRT`'s spec phase.** The discovery interview (spec.md, 2026-07-18) confirmed the project owner wanted alt-forms modeled as **full child characters** (`CharacterProfile` with `parentCharacterId`, live vitals in the parent participant's `childSessions[childId]`) rather than the `AltFormDefinition` nested-object scheme originally sketched below — a child needed the *entire* character shape (skills, gifts, languages), not a stripped-down stat block, and the parent/child relationship generalizes better to "multiple children" than a single `altForm` field would. See `kitty-specs/vitruve-character-sheet-01KXSZRT/data-model.md` (I-C1/I-C2/I-C3) for the locked contract actually implemented, and `src/components/vitruve/ChildSheetTab.vue` for the renderer. The original sketch is kept below only as a historical record of the road not taken:

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

## Vitruve character sheet (interactive layer) — spec-kitty mission `vitruve-character-sheet-01KXSZRT`

Status: **WP01–WP06 implemented**, WP06 in review as of 2026-07-18. Branch: `feat/vitruve-character-sheet`; WP code lives on lane branches (`...lane-a` through `...lane-f`) until `spec-kitty accept` + `spec-kitty merge`, then a PR to `main`. Mission artifacts in `kitty-specs/vitruve-character-sheet-01KXSZRT/`. Delete this section once merged (per this file's convention above).

Replaces `PlayerView.vue`'s read-mostly display with the full interactive gameplay surface from legacy's "Layout vitruve JDR" (`legacy-reference/index.html:2361-3350`), plus child-character tabs generalizing legacy's hardcoded "Furmiaou" tab (see the superseded-sketch note above for why the data model changed from the original plan).

**Increments** (resume with `spec-kitty next --agent claude --mission vitruve-character-sheet-01KXSZRT`):

- [x] WP01 — Contract & data access: `CharacterSessionState.injuries/advantage/disadvantage`, `Participant.childSessions`, `CharacterProfile.parentCharacterId`, repository extensions (`updateSessionFields`, `updateChildSession`, `listChildrenOf`), `CampaignSessionRepository`, `firestore.rules` additions.
- [x] WP02 — Two-column layout skeleton: `VitruveSheet.vue` (left sheet: header, PV/Mana pills, portrait) + tabbed right panel host in `PlayerView.vue`, Dons/Inventaire relocated unchanged.
- [x] WP03 — `FicheTab.vue` + `CaracTab.vue`: histoire editor, Physique/Social/Mental category blocks with persisted injury-state squares, posture selector.
- [x] WP04 — `JetCalculator.vue` + `jetFormula.ts` (pure, isolated formula module — category base, ticked-compétences sum, ±5% manual mod, 5–95% clamp) + `AdvantageToggles.vue`.
- [x] WP05 — `PartyStatus.vue` ("État du groupe", live, children excluded per I-C2) + `AdventureDiceBox.vue` (Dés d'Aventure counters, mj/admin ± only) + `useCampaignSessionStore.ts`.
- [x] WP06 — `ChildSheetTab.vue` (child mini-sheet: PV ±, Mana/"Aucune magie", element badges, carac blocks reusing the extracted `CaracCategoryBlock.vue`) + `PlayerView.vue` child-tab integration (calculator context switches attributes+injuries together, FR-016) + `RawCharacterEditor.vue` (MJ-only atomic JSON editor, FR-004) + `e2e/vitruve.spec.ts` smoke + this ledger closure.

**Known follow-ups** (not blockers for merge, but real gaps — see also README.md's "Known follow-ups"):

- `firestore.rules`: the additions this mission needs (`campaignSessions` collection, the tightened `characters` update rule) already exist on this feature branch, but `.github/workflows/deploy.yml` only redeploys rules on push to `main` — so they take effect in production only after this mission merges. Until then, production Firestore is still running the pre-mission ruleset.
- The full "Dés d'Aventure" feature (dice-pool mechanics, a dedicated page) remains unported and out of scope per spec.md's explicit exclusion — this mission only ships the shared counters, their display, and mj/admin ± adjustment (WP05).
- Manual verification: quickstart.md steps 1–6 (live two-client <2s sync for injuries/toggles/child PV; MJ raw-editor smoke against real seeded data) need a live Firebase project and two authenticated browser sessions, which this environment cannot produce — see the WP06 handoff note for the exact list of what's automated vs. what's left for a human pass. Step 7 ("demo build renders read-only") is worth a re-read against current behavior: with no Firebase secrets, the `requiresAuth` route guard redirects to campaign-list rather than rendering PlayerView in a degraded read-only mode — that's pre-existing behavior (not introduced by this mission) confirmed by `e2e/vitruve.spec.ts` and `e2e/inventory.spec.ts`, but it means step 7 as literally written doesn't match what actually happens today.

## (template for the next high-complexity spec)

Copy this section's shape when the next spec crosses the threshold: Status line, schema/contract-to-lock list, increment checklist.
