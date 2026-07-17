# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-16. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- Character sheet content: identity, attributes, skills, gifts, session inventory (`PlayerView.vue` — legacy "Layout vitruve JDR", content-wise only; see item 1 below for the interactive layer that's still missing)
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)
- **Faction/caste browser** ("classeur" binder UI — `FactionBrowserView.vue`, `/campaigns/:id/castes`). Shipped via spec-kitty mission `faction-caste-browser-01KXBRY3`.
- **Functional dice roller** (`DiceRollerView.vue` + `DiceRoller.vue`, `/campaigns/:id/des`). Shipped via spec-kitty mission `wire-up-the-dice-roller-01KXDN1H`.
- **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers — `CosmologyView.vue` + `CosmologyTierCard.vue`, `/campaigns/:id/cosmology`). Static lore content mirroring the faction browser pattern, backed by a new `cosmology` Firestore collection (read-only, seeded via `scripts/uploadStaticDataAdmin.mjs`).
- **Inventory slots & "dons" (gifts) system** — categorized backpack slots (10 fixed categories, each capped, empty slots computed client-side, never stored), typed weapons/armor lists padded to a minimum of 3 slots, and a dons list with a mana-cost/damage-dice/flavor-text detail modal. Typed schema in `src/models/types/Inventory.ts` (`InventoryCategory`, `InventoryItem`, `WeaponArmorItem`, `CharacterInventory`, `BACKPACK_MAX_SLOTS`), lossless legacy-string parser in `src/utils/inventoryText.ts`, store in `src/controllers/useInventoryStore.ts`, repository in `src/models/repositories/InventoryRepository.ts`, UI in `src/components/BackpackGrid.vue`, `WeaponArmorList.vue`, `InventorySlotModal.vue`, `DonList.vue`, `DonDetailModal.vue` (wired into `PlayerView.vue`). Shipped via spec-kitty mission `inventory-slots-dons-01KXRF5M`.

## Not yet ported

Roughly in suggested priority order — earlier items unblock or are prerequisites for later ones.

1. **Vitruve character sheet — interactive layer.** `PlayerView.vue` shows the same underlying data as legacy's "Layout vitruve JDR" but not the interactive gameplay surface: body-zone SVG navigation, the dice-roll calculator (Physique/Social/Mental categories, skill-check bonuses, ±5% modifiers, 5–95% clamp, Avantage/Désavantage), and a live "État du groupe" party status embedded in the sheet itself. Also folds in a **generalized alt-form/transformation sub-sheet** (generalizing legacy's hardcoded, never-persisted "Furmiaou" beast-form tab into a reusable model any character can optionally have). Highest-complexity item in this list — plan to split into independently-validated increments (dice calculator, nav/tab shell, Firestore-synced PV/Mana pills, alt-form tab), tracked in `NEXTSTEPS.md`. Its Inventaire-tab prerequisite is now met: the typed inventory schema shipped as `inventory-slots-dons-01KXRF5M` (see "Already covered" above and `src/models/types/Inventory.ts`) — this item is only the remaining interactive-layer work (nav shell, dice calculator, live PV/Mana, alt-form), not the inventory data itself.
2. **Negotiation / balance mechanic.** Merchant-haggling mini-game (up to 3 rounds, price shifts by outcome, animated SVG balance beam). Legacy stores this as a single global-singleton Firestore doc shared by everyone — the migration must scope it per-campaign, not copy that anti-pattern.
3. **Theme/design editor.** Legacy sidebar + design-editor modals let a user customize site colors/background/title, plus a nav-editor for reordering/hiding nav items and custom pages. Same global-singleton scoping problem as the negotiation mechanic. Lowest priority — cosmetic, not core gameplay. Plan to split the color/theme half (smaller) from the nav-editor half (bigger scope).

## Non-migration follow-ups tracked separately

- Firestore security rules deployment status, dead-code cleanup, and other tooling items are tracked in README.md's "Known follow-ups" section.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
- `main` is the sole trunk (see `CLAUDE.md`) — use short-lived per-mission branches, not a long-lived second branch.
