# NEXTSTEPS

Increment ledger for specs that cross CLAUDE.md's high-complexity threshold (~4+ independent acceptance criteria, or spanning state/UI/cross-system coupling). One section per such spec; delete the section once the spec is fully done and merged.

## RPG data-model migration (in progress, started 2026-08-23)

The app is mid-migration from the legacy flat Firestore schema to the nested
per-campaign schema documented in `docs/rpg-data-model.md` /
`docs/architecture-rpg-data-target.md`. See those docs plus
`docs/migration-data-plan.md`, `docs/refacto-plan-rpg-data-model.md`,
`docs/refacto-back-front-plan.md`, and `docs/refacto-acceptance-criteria.md`
for the full target contract and rationale. **The nested model
(`/Campaigns/{campaignId}/...`, PascalCase fields) is the authoritative
target** — this supersedes the "Per-campaign scoping convention" that used
to be locked in this file (see superseded note below).

No live production data needs preserving through this migration —
`scripts/seedAll.mjs`'s fixtures are the source of truth; reseed rather than
migrate real documents.

Work proceeds one **vertical slice** at a time (repository + type + store +
view + rule for one domain), not one horizontal layer across the whole app —
each slice must be shippable/mergeable on its own without leaving `main` in
a broken intermediate state. `/clear` between clusters per CLAUDE.md's
high-complexity policy.

### Cluster ledger

1. **Campaigns root collection — done (2026-08-23).** Unified on top-level
   `Campaigns` (was split across flat lowercase `campaigns` vs the seed
   script's capitalized `Campaigns` — two different collections). PascalCase
   fields (`DisplayName`, `Description`, `Lore`, `GlobalNote`, `GmId`,
   `Status: 'Recruiting'|'Active'|'Closed'`, `CreatedAt`, `UpdatedAt`).
   `Lore`/`GlobalNote` are a deliberate extension beyond the doc's single
   `Description` field — they're real, actively-edited product content
   (see `CampaignView.vue`), not something to silently collapse.  Dropped
   dead `slug`/`findCampaignBySlug` (zero consumers). Files touched:
   `src/models/types/Campaign.ts`, `src/models/repositories/CampaignRepository.ts`,
   `src/controllers/useCampaignStore.ts`, `CampaignListView.vue`,
   `CampaignView.vue`, `CampaignShell.vue`, `ClassCarouselView.vue`/
   `RaceCarouselView.vue`/`TeamView.vue` (stray `.title` refs),
   `firestore.rules` (`match /Campaigns/{campaignId}`, same `isMjOrAdmin()`
   gate as before — not the docs' per-campaign `isGm(cid)` model, which
   would be a real authorization-scope change, not just a rename),
   `scripts/seedAll.mjs` (added `Lore`/`GlobalNote`, fixed a real bug where
   `Status` was written as the raw French legacy value instead of being
   mapped to `Recruiting`/`Active`/`Closed`).
   **Not yet deployed**: the updated `firestore.rules` still needs an
   explicit go-ahead before `firebase deploy --only firestore:rules` against
   the live project.
2. **Classes & Races — done (2026-08-23).** Dropped the flat-collection
   fallback in `ClassRepository`/`RaceRepository` (nested `Campaigns/{id}/
   Classes|Races` only now). `Class.ts`/`Race.ts` moved off legacy
   abbreviated fields (`n, sub, img, pv, mana, arm, caps, bon, mal`) to
   `DisplayName/Description/PictureUrl/Bonuses/Traits/StatConstraints`.
   `Bonuses`/`StatConstraints` are seeded empty — the source fixtures
   (`scripts/data/classes.json`/`races.json`) don't specify clean numeric
   per-stat values (legacy's `pv/mana/arm` and `bon/mal` are free-text,
   often percentage-based or conditional, e.g. "Agilite +20%", "+2
   degats") — inventing flat integers to fill them would silently change
   game balance, so this is left as a real content-authoring task, not a
   migration mapping task. Preserved the actual content instead as
   extensions beyond the documented contract: `Class.HealthNote/ManaNote/
   ArmorNote` (was `pv/mana/arm`), `Class.Traits` (was `caps`, split
   reliably on the fixtures' consistent "Name : Effect" separator),
   `Race.Strengths/Weaknesses` (was `bon/mal` — the target's `Traits` map
   has no strength/weakness polarity, so this stays a dedicated pair of
   fields rather than being force-fit into `Traits`). Fixed a real data-loss
   bug in `scripts/seedAll.mjs`: it was writing `Bonuses: {}, Traits: {},
   StatConstraints: {}` unconditionally, silently dropping every class's
   `caps` and every race's `bon`/`mal` on seed. Added nested
   `Campaigns/{id}/Classes|Races` blocks to `firestore.rules` (signed-in
   read, no client write — Admin-SDK-seeded only, mirrors the flat legacy
   rule). Touched: `src/models/types/Class.ts`, `Race.ts`,
   `ClassRepository.ts`, `RaceRepository.ts`, `ClassCarouselView.vue`,
   `RaceCarouselView.vue`, `PlayerView.vue`/`CaracTab.vue` (two more legacy
   `.n`/`.bon`/`.mal` consumers found via type-check, outside the carousels),
   `scripts/seedAll.mjs`, `firestore.rules`.
   **Follow-up noted, not actioned**: the flat top-level `races`/`classes`
   collections (and `scripts/uploadStaticDataAdmin.mjs`/`uploadStaticData.mjs`/
   `pullLiveDataAdmin.mjs`, which still read/write them) now have zero
   remaining app consumers — candidates for deletion in a later cleanup
   pass, out of scope here.
3. **Players / character live state — done, split into 3a and 3b given the
   size and gameplay stakes (real, actively-played HP/mana/posture/injuries —
   see CLAUDE.md's high-complexity policy).**

   **3a — bug fixes + doc-keying + rules, done (2026-08-23).** Found and
   fixed a live, currently-shipping bug: `setInjury`/`setAdvantage`/
   `setDisadvantage`/`setChildVitals` (via `ParticipantRepository.
   updateSessionFields`/`updateChildSession`) were writing to a flat
   capital-`Participants` collection that nothing reads — every one of
   those writes was silently discarded; the app always showed stale
   injury/advantage/disadvantage state. Fixed to write the same nested
   `Campaigns/{id}/Players` doc the app reads from. Also fixed
   `Campaigns/{id}/Players/{uid}` to actually be keyed by `uid` as its doc
   ID (per `rpg-data-model.md` §4.6) instead of an auto-generated id found
   by querying `where('uid','==',...)` — `seedAll.mjs` already did this
   correctly; only the repository's read path (`getParticipant`) hadn't
   caught up. `ParticipantStatus` recased to the documented enum
   (`'Pending'|'Approved'|'Denied'`, was `'pending'|'approved'|'rejected'`).
   Added full `firestore.rules` coverage for `Campaigns/{id}/Players`,
   `Characters` (incl. the FR-012 owner-can-only-edit-`backstory` restriction,
   mirrored from the flat legacy rule), `States/Current`, `Equipment/Main`,
   `Items/{itemId}` — all of it was previously falling through to
   default-deny. Touched: `Participant.ts`, `ParticipantRepository.ts`,
   `usePlayerStore.ts`, `firestore.rules`, plus
   `usePlayerStore.spec.ts`/`ParticipantRepository.spec.ts`/
   `PlayerView.spec.ts`/`VitruveSheet.spec.ts`/`TeamView.spec.ts` (status
   casing + new function signatures). **Did not** touch `session`/
   `childSessions` shape, `Posture`/`InjuryState`/`SecondaryAttributeName`,
   or any view — those are unchanged and still work exactly as before,
   just now backed by a correct write path.

   **Found while manually verifying against the Firestore emulator (2026-08-23),
   fixed in the same pass**: `scripts/seedAll.mjs`'s character loop had no
   real per-character owner data to draw from (`defaultChars.json` carries
   no uid/email at all), so `resolveOwnerUid` fell back to one shared
   `'unknown-user'` constant for all 5 characters — every `Campaigns/{id}/
   Players/{ownerUid}` write used the same doc ID and clobbered the
   previous one, leaving only one (arbitrary, last-processed) character
   with a Player doc at all. Worse, the doc it wrote was in the *pure*
   target shape (`Status`/`Email`/`Notes` only) — correct per the docs, but
   `ParticipantRepository`/`usePlayerStore` haven't been migrated to stop
   reading `characterId`/`session` from that doc yet (that's Cluster 3b),
   so every character appeared to have no live state and didn't show up in
   the team roster at all. Fixed by having `seedAll.mjs` read the
   previously-unused `scripts/data/participants.json` (which already has
   real distinct per-character `uid` + `session` values left over from the
   legacy fixture) to give each character its own owner and starting
   hp/mana/posture, and by adding `characterId`/`session` onto the
   `playerDoc` payload as an explicit, commented **bridge** — remove those
   two fields once Cluster 3b ships and the app reads live state from
   `States/Current` instead.

   **3b — retire `session`/`childSessions` onto per-character `States/
   Current` — done (2026-08-23).** Live combat state moved off
   `Participant.session`/`childSessions` onto
   `Campaigns/{id}/Characters/{characterId}/States/Current` — one doc per
   character, including each transformation (already its own `Characters`
   doc via `ParentCharacterId`), which the core architectural
   simplification this cluster hinged on: **a child needs no separate
   "child vitals" API at all** — it's just another `characterId` passed to
   the exact same `setSessionResource`/`setInjury`/`setAdvantage`/
   `setDisadvantage` functions used for the base character.
   `Posture`/`Injuries`/`Advantage`/`Disadvantage` have no equivalent in the
   documented `States/Current` contract (§4.8 only has Health/Mana/Armor/
   Attack/Defense pools) — added as extension fields on
   `CharacterStateDocument`, French posture/injury values kept as-is
   (`OFFENSIF`/`DEFENSIF`/`FOCUS`, `jaune`/`rouge` — no functional benefit to
   recasing to English, just churn). Per docs/rpg-data-model.md §4.6,
   `Players/{uid}` carries no `characterId` either — `Participant.ts`
   dropped that field too (the reverse link is `Character.PlayerId`/
   `ownerUid`, which `usePlayerStore.resolveCharacterId`/`resolveParticipant`
   already used/now uses for the character↔uid join).

   `usePlayerStore.ts`'s `subscribeParty` now attaches one
   `subscribeCharacterState` listener per character in the campaign (base +
   children) alongside the existing `Players` collection listener, exposed
   as `partyCharacterStates` (keyed by characterId); `party` joins
   `Characters` + that map + `Players` (matched by `character.ownerUid ===
   participant.uid`, not a `characterId` field). `ParticipantRepository.ts`
   shrank to just the admission-workflow reads (`listParticipantsByCampaign`,
   `subscribeParticipantsByCampaign`, `getParticipant`) —
   `getParticipantByCharacterId`/`setParticipantSessionByCharacterId`/
   `updateSessionFields`/`updateChildSession`/`resetTeamSessionToMax` are
   gone; `CharacterStateRepository.ts` gained `resetTeamStatesToMax` (batches
   `HealthCurrent`/`ManaCurrent` back to `Health`/`Mana` across the given
   character ids — `TeamView.vue`'s "Faire reposer l'équipe" button, same
   non-child scope as before).

   `PlayerView.vue` now holds `characterState`/`childState` refs (optimistic-
   patch + revert-on-error, same shape as the old `participant` ref) fed by
   `playerStore.partyCharacterStates` with a one-shot `getCharacterState`
   fallback for both the main character AND the active child — the child
   fallback was added specifically because `subscribeParty`'s per-character
   subscription is idempotent per campaignId, so a child that starts existing
   after the initial subscription wouldn't otherwise get a listener attached.
   `VitruveSheet.vue`/`CaracTab.vue`/`ChildSheetTab.vue`/`AdvantageToggles.vue`
   take a `state: CharacterStateDocument | null` prop instead of
   `session`/`childSession`; `PartyStatus.vue`/`TeamView.vue` read
   `state.Health/.HealthCurrent/.Mana/.ManaCurrent/.Posture` instead of
   `session.maxHp/.hp/.maxMana/.mana/.posture`. `scripts/seedAll.mjs`'s
   `playerDoc` dropped the `characterId`/`session` bridge fields entirely
   (`Players/{uid}` is now exactly `{Status, Email, Notes, CreatedAt,
   UpdatedAt}`); `stateDoc` gained `Posture`/`Injuries` sourced from
   `participants.json`'s fixture. No `firestore.rules` change needed —
   `States/Current`'s existing owner-or-mj/admin, whole-doc write rule
   (Cluster 3a) already covers the new fields.

   Verified: type-check/lint/473 unit tests green; re-seeded the emulator
   from a fully cleared Firestore (merge-write semantics would otherwise
   have left the old `session`/`characterId` fields dangling on `Players`
   docs from the pre-3b seed) and confirmed via direct REST calls with a
   real Auth-emulator token that an owner can write `Posture`/`Injuries` on
   their own character's `States/Current` doc, and that `Players/{uid}`
   comes back in the exact documented shape.
4. **Equipment / inventory unification — queued.** `Equipment/Main` is
   currently written by two incompatible schemas: legacy `InventoryRepository`/
   `useInventoryStore` (camelCase, actively used by `PlayerView.vue`/
   `ChildSheetTab.vue`) and target-shaped `EquipmentRepository`/
   `useEquipmentStore` (PascalCase, currently unused by any view). Needs a
   product decision first: the target's terse `GearEntry` schema doesn't
   model the already-shipped categorized-backpack/dons feature
   (`BackpackGrid.vue`, `DonList.vue`, `src/utils/inventoryText.ts`) —
   extend the target schema to cover it, or scale back the feature.
5. **`firestore.rules` full coverage — mostly done.** `Campaigns` root
   (Cluster 1), nested `Classes`/`Races` (Cluster 2), and nested `Players`/
   `Characters`/`States/Current`/`Equipment/Main`/`Items` (Cluster 3a) are
   covered. Still falling through to the default-deny rule: `CampaignRules`
   (write path is a stub anyway, see Cluster 6), `Roster` (mj/admin-or-none,
   trivial once Cluster 7 lands), `Notes`. Land the rest once those
   collections are stable.
6. **`CampaignRules` write path — queued.** `CampaignRulesRepository.setCampaignRules`
   is currently a deliberate no-op stub (read-only). Needs a real write path
   + an editing UI once a store/view actually needs to mutate it.
7. **`Roster/Summary` materialization — queued.** Currently only ever
   written by the seed script — no live materialization exists. Needs an
   explicit decision: real Cloud Functions (no Functions infra exists in
   this repo today) vs. a client-side recompute convention, appropriate for
   this hobby-scale project.
8. **`CharacterRepository` cleanup — partially done.** `PlayerView.vue`'s
   only live call to `getCharacterById` (the flat, never-seeded `Characters`
   singleton) has been replaced with `getCharacterByCampaign` (the correct
   nested lookup) — found because it was blocking every character sheet
   from loading at all under real `firestore.rules` enforcement (confirmed
   against the emulator: `PERMISSION_DENIED` — "false for 'get' @ L213",
   the default-deny catch-all — since that flat collection has zero rule
   coverage and zero seeded data). `getCharacterById` itself is still
   defined in `CharacterRepository.ts` (no other call sites) — remove it
   and the camelCase/PascalCase dual-alias mapping in `mapCharacter` once
   every producer/consumer is nested + PascalCase, still queued.

### Superseded: old "Per-campaign scoping convention" lock

The following was locked in an earlier phase and is now **superseded** by
the nested-model decision above — kept here only so old citations don't
dangle:

> Default shape: a flat top-level collection, one doc per record,
> `{ campaignId, ...fields }`, queried via `where('campaignId', '==',
> campaignId)` [...] Do not nest under `campaigns/{campaignId}/...`
> subcollections — it would be a second, inconsistent access pattern next
> to every existing repository.

Any future `negotiations`/`themeConfigs`-style singleton should instead
follow the nested model: `Campaigns/{campaignId}/Negotiations/Current` /
`Campaigns/{campaignId}/ThemeConfig/Main`, matching the rest of the target
collection map — not the flat `doc(db, 'negotiations', campaignId)` shape
this section used to prescribe.

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
