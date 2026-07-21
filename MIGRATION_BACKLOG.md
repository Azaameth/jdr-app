# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-21. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- **Vitruve character sheet — interactive layer.** Full interactive gameplay surface (body-zone nav, dice-roll calculator, live PV/Mana, party status, child-character/transformation tabs) shipped via spec-kitty mission `vitruve-character-sheet-01KXSZRT` (merged `984683a`, 2026-07-18). See `src/components/vitruve/` and `PlayerView.vue`.
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)
- **Faction/caste browser** ("classeur" binder UI — `FactionBrowserView.vue`, `/campaigns/:id/castes`). Shipped via spec-kitty mission `faction-caste-browser-01KXBRY3`.
- **Functional dice roller** (`DiceRollerView.vue` + `DiceRoller.vue`, `/campaigns/:id/des`). Shipped via spec-kitty mission `wire-up-the-dice-roller-01KXDN1H`.
- **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers — `CosmologyView.vue` + `CosmologyTierCard.vue`, `/campaigns/:id/cosmology`). Static lore content mirroring the faction browser pattern, backed by a `cosmology` Firestore collection intended to be seeded via `scripts/uploadStaticDataAdmin.mjs` — see the seeding-gap bug below, this script has in practice been easy to forget to (re-)run.
- **Inventory slots & "dons" (gifts) system** — categorized backpack slots (10 fixed categories, each capped, empty slots computed client-side, never stored), typed weapons/armor lists padded to a minimum of 3 slots, and a dons list with a mana-cost/damage-dice/flavor-text detail modal. Typed schema in `src/models/types/Inventory.ts` (`InventoryCategory`, `InventoryItem`, `WeaponArmorItem`, `CharacterInventory`, `BACKPACK_MAX_SLOTS`), lossless legacy-string parser in `src/utils/inventoryText.ts`, store in `src/controllers/useInventoryStore.ts`, repository in `src/models/repositories/InventoryRepository.ts`, UI in `src/components/BackpackGrid.vue`, `WeaponArmorList.vue`, `InventorySlotModal.vue`, `DonList.vue`, `DonDetailModal.vue` (wired into `PlayerView.vue`). Shipped via spec-kitty mission `inventory-slots-dons-01KXRF5M`.

## Bugs (operational, small)

These are not missing application code — the data model and rendering already exist; the live Firestore data behind them was never (fully) pushed. Fix by running the existing scripts, not by writing new features.

1. **Castes/Factions + Cosmology data missing or stale in Firebase.** `scripts/uploadStaticDataAdmin.mjs` already reads `scripts/data/races.json`, `classes.json`, `factions.json`, and `cosmology.json` and pushes all four to Firestore — but unlike `seed:defaultchars:admin` / `seed:all`, it has **no `package.json` script alias**, so it's easy to forget to run and appears to have never been run (or not re-run since content changed) against the live project. Fix: add a `"seed:static:admin": "node scripts/uploadStaticDataAdmin.mjs"` alias to `package.json` (mirroring the existing `seed:*:admin` naming), then run it with a service-account key (`scripts/keys/serviceAccountKey.json`, gitignored — see `CLAUDE.md`'s "Data seeding" section) against the live project.
2. **Furmiaou (Firm's transformation) missing in Firebase and the web view.** The parent/child transformation model is fully implemented (`vitruve-character-sheet-01KXSZRT`: `CharacterProfile.parentCharacterId`, `Participant.childSessions`, `ChildSheetTab.vue`), and `scripts/data/characters.json`/`participants.json` already contain a correct Furmiaou fixture (`id: "furmiaou"`, `parentCharacterId: "firm"`, `childSessions.furmiaou` on Firm's participant doc) consumed by `npm run seed:defaultchars:admin` (`scripts/uploadDefaultCharsAdmin.mjs`). It just hasn't been (re-)run since Furmiaou was added to the fixture. Fix: run `npm run seed:defaultchars:admin` against the live project. **Trap:** `scripts/data/defaultChars.json` — a different, older fixture format consumed by `seed:all`/`seedAll.mjs` — never had a Furmiaou entry (only `azarius`, `dy`, `firm`, `mwassa`, `nindey`). Running `seed:all` alone will not fix this bug and could look like it did; use `seed:defaultchars:admin` specifically, or reconcile the two fixture formats first.
3. **Cosmology has no image field.** `CosmologyTier` (`src/models/types/Cosmology.ts`) has no `img`/URL field at all — unlike `Class`/`Race` (`img`). Needs: an optional `img?: string` field on `CosmologyTier`, image paths added to `scripts/data/cosmology.json`, and rendering added to `CosmologyTierCard.vue`. Small, self-contained; bundle with bug 1 since both touch the same seed script/fixture and both need a re-run to take effect.

## Features (schema-first)

Per `CLAUDE.md`'s high-complexity policy (state + UI + cross-system coupling), these need a locked schema/contract before implementation — do not build in one session.

4. **Equipment stat effects.** Equipped items should automatically modify computed stats/rolls (e.g. Mwasa's +4 Mana Ring raising max mana). Today `WeaponArmorItem.damageBonus`/`armorRating`/`statNote` (`src/models/types/Inventory.ts`) are display-only text with zero code paths reading them into a computation — `jetFormula.ts`/`JetCalculator.vue` only take a manual modifier stepper. Needs: a structured bonus shape (target stat + amount) on equipped items, wired into whatever computes displayed attributes and roll totals, while keeping `statNote` for flavor-only annotations that aren't mechanical.
5. **Multiple transformations per character, generalized.** The data layer already supports this — `listChildrenOf` returns a list, and `parentCharacterId` isn't Firm-specific — so this is narrower than it sounds. Real scope: (a) verify/extend `ChildSheetTab.vue`/`PlayerView.vue`'s tab UI, currently built around "a" child tab, to handle multiple children cleanly; (b) decide how a transformation gets attached to an arbitrary character, since today the only paths are seed scripts or `RawCharacterEditor.vue`'s raw-JSON MJ editor — no guided UI exists.

## New pages

Legacy pointers and current status for each; the "open question" is what still needs deciding at `/spec-kitty.specify` time.

- **Adventure Dice.** Partially built: `AdventureDiceBox.vue` (shared counters, mj/admin ± only) already lives embedded in `PlayerView.vue`, backed by `useCampaignSessionStore`. Legacy's full dice-pool mechanic (`legacy-reference/index.html:1099-1131`) was explicitly excluded from the vitruve mission. Open question: promote the existing counters to a standalone route, and decide whether the dice-pool mechanic is now in scope.
- **Negotiation.** Not built. Legacy `#s-negociation` (`legacy-reference/index.html:1577-1655`): 3-round haggling vs. a merchant, price drifts by round/outcome, crit rules. The per-campaign singleton contract (`negotiations/{campaignId}`) is already locked in `NEXTSTEPS.md`'s "Locked contracts" section — cite it, don't re-derive. `firestore.rules` needs a matching `match /negotiations/{campaignId}` block, not yet written.
- **Economy.** Not built. Legacy `#s-economie` (`legacy-reference/index.html:1655+`): price-reference tables (food, lodging, etc.), tied into the negotiation pricing model. Open question: static reference content vs. MJ-editable tables.
- **Create a Character.** Not built as an interactive flow. Legacy `#s-creation` (`legacy-reference/index.html:1564`) is a scripted 10-step tutorial walkthrough (`TUTO_STEPS`, ~line 3847), not a form — no character-creation UI exists anywhere in the app today (characters are seeded or raw-edited only). Open question: build a real creation wizard that writes a `CharacterProfile`, or port the onboarding walkthrough as-is.
- **Rules.** Not built. Legacy `#s-regles` (`legacy-reference/index.html:1570`) is the same tutorial-bubble mechanism as Create a Character, a separate step array (~line 3893). Open question: same tutorial-vs-reference-content decision.
- **12 Kingdoms.** Not built. Legacy `#s-royaumes` (`legacy-reference/index.html:1009`): hand-coded SVG circular map, 12 fixed kingdom nodes with ally/hostile/secret/neutral status, detail card on click. No Firestore-backed model exists yet — would need a new `Kingdom` type/collection. Open question: read-only display vs. MJ-editable from day one.
- **History.** Not built as a dedicated page. Legacy `#s-histoire` (`legacy-reference/index.html:1147-1151`, flip-book content loaded into `#book-wrap`) is **world/campaign lore**, distinct from the per-character `histoire` backstory field that already exists and is editable in `PlayerView.vue`/`FicheTab.vue`. Open question: confirm this new page is the world-lore one, not a rework of the existing per-character field.
- **NPCs & Factions.** Not built. Confirmed distinct from the existing `/campaigns/:id/castes` page (which renders `FactionBrowserView.vue`'s `Faction` model — structure/objectif/statut cards, no images, legacy's separate "Castes & Factions du monde" section). Legacy's actual "PNJ & Factions" section (`legacy-reference/index.html:951`) has image-bearing cards (`.faction-img-col img`) for named NPCs/factions — needs a new `Npc`/image-bearing model.

## Suggested sequencing (proposed, not binding)

- **Cluster 0 — operational bug fixes.** No mission needed: add the `seed:static:admin` alias, run both seed scripts against the live project. Fixes bugs 1–3.
- **Cluster 1 — schema-first features.** Equipment stat effects, transformation generalization. Do these before pages that might depend on them (e.g. Create a Character).
- **Cluster 2 — lower-coupling content pages.** 12 Kingdoms, NPCs & Factions, History, Rules — mostly new Firestore collections + read views.
- **Cluster 3 — higher-complexity interactive pages.** Adventure Dice standalone page, Negotiation, Economy, Create a Character.

## Theme/design editor

Legacy sidebar + design-editor modals let a user customize site colors/background/title, plus a nav-editor for reordering/hiding nav items and custom pages. Same global-singleton scoping problem as the negotiation mechanic — migration must key by `campaignId`, not copy legacy's `shared/design-config` anti-pattern. Lowest priority — cosmetic, not core gameplay, and not part of the current request. Plan to split the color/theme half (smaller) from the nav-editor half (bigger scope) if picked up later.

## Non-migration follow-ups tracked separately

- Firestore security rules deployment status, dead-code cleanup, and other tooling items are tracked in README.md's "Known follow-ups" section.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
- `main` is the sole trunk (see `CLAUDE.md`) — use short-lived per-mission branches, not a long-lived second branch.
