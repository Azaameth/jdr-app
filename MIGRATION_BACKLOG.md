# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-16. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- Character sheet content: identity, attributes, skills, gifts, session inventory (`PlayerView.vue` — legacy "Layout vitruve JDR", content-wise only; see item 1 below for the interactive layer that's still missing)
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)
- **Faction/caste browser** ("classeur" binder UI — `FactionBrowserView.vue`, `/campaigns/:id/castes`). Shipped via spec-kitty mission `faction-caste-browser-01KXBRY3`.
- **Functional dice roller** (`DiceRollerView.vue` + `DiceRoller.vue`, `/campaigns/:id/des`). Shipped via spec-kitty mission `wire-up-the-dice-roller-01KXDN1H`.

## Not yet ported

Roughly in suggested priority order — earlier items unblock or are prerequisites for later ones.

1. **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers). Static lore content like the faction browser, with a nontrivial layout (connector lines between tiers). No data model — lowest-risk item here, good first pick once the schema-lock groundwork below is done.
2. **Inventory slots & "dons" (gifts) system.** Session inventory in `PlayerView.vue` is currently a simple list; legacy has a categorized slot system (10 fixed categories, each with a max-slot count, empty-slot placeholders) plus typed weapon/armor stats and a flavor-text/mana-cost/damage-die modal for gifts. Needs a typed schema (not legacy's string-DSL) locked before building the UI.
3. **Vitruve character sheet — interactive layer.** `PlayerView.vue` shows the same underlying data as legacy's "Layout vitruve JDR" but not the interactive gameplay surface: body-zone SVG navigation, the dice-roll calculator (Physique/Social/Mental categories, skill-check bonuses, ±5% modifiers, 5–95% clamp, Avantage/Désavantage), and a live "État du groupe" party status embedded in the sheet itself. Also folds in a **generalized alt-form/transformation sub-sheet** (generalizing legacy's hardcoded, never-persisted "Furmiaou" beast-form tab into a reusable model any character can optionally have). Highest-complexity item in this list — plan to split into independently-validated increments (dice calculator, nav/tab shell, Firestore-synced PV/Mana pills, alt-form tab), tracked in `NEXTSTEPS.md`. Depends on item 2's typed inventory schema (the sheet's Inventaire tab is that system).
4. **Negotiation / balance mechanic.** Merchant-haggling mini-game (up to 3 rounds, price shifts by outcome, animated SVG balance beam). Legacy stores this as a single global-singleton Firestore doc shared by everyone — the migration must scope it per-campaign, not copy that anti-pattern.
5. **Theme/design editor.** Legacy sidebar + design-editor modals let a user customize site colors/background/title, plus a nav-editor for reordering/hiding nav items and custom pages. Same global-singleton scoping problem as the negotiation mechanic. Lowest priority — cosmetic, not core gameplay. Plan to split the color/theme half (smaller) from the nav-editor half (bigger scope).

## Non-migration follow-ups tracked separately

- Firestore security rules deployment status, dead-code cleanup, and other tooling items are tracked in README.md's "Known follow-ups" section.
- The `participant.personalNote` field-level-privacy gap (currently readable by the whole campaign) is tracked there too — it needs a subcollection split, treated as its own small mission rather than bundled into any item above.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
- `main` is the sole trunk (see `CLAUDE.md`) — use short-lived per-mission branches, not a long-lived second branch.
