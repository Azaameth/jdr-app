# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-13. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

New multi-campaign *architecture* work (not legacy feature parity) is tracked separately in
[MULTI_CAMPAIGN_ROADMAP.md](MULTI_CAMPAIGN_ROADMAP.md) — read that alongside this file if
you're looking for what's next; the two lists are complementary.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- Character sheet content: identity, attributes, skills, gifts, lore, session inventory (`PlayerView.vue` — legacy "Layout vitruve JDR", content-wise; the *layout* — legacy's two-column vitruve grid vs. the current single long column — is queued as the `characters-view-two-column-layout` mission, see below)
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)
- **Faction/caste browser** ("classeur" binder UI — `FactionBrowserView.vue`, `/campaigns/:id/castes`). Shipped 2026-07-12 via spec-kitty mission `faction-caste-browser-01KXBRY3` — the first mission run end-to-end on this project; see README.md's "Working with spec-kitty" for the workflow and gotchas that surfaced doing it. Content is global/not campaign-scoped today — closing that gap is the `castes-campaign-scoping` mission (see below).
- **Functional dice roller.** Shipped via spec-kitty mission `wire-up-the-dice-roller-01KXDN1H` (`DiceRollerView.vue`, `DiceRoller.vue`) — the second mission run on this project, and the first implemented by an agent other than Claude (GitHub Copilot), reviewed by the project owner directly.

## Scaffolded, not yet implemented

These three missions have a full spec → plan → tasks → analyze pass already recorded under
`kitty-specs/`, deliberately stopped short of implementation (`spec-kitty agent action
implement`) pending a go-ahead — see each mission's `spec.md` for full requirements and
`analysis-report.md` for the recorded verdict:

- **`character-data-dashboard-integration`** — closes the `CharacterRepository`/
  `MembershipRepository` CRUD gap (create/update, not just list/get — see former backlog item 1
  below) and fixes `TeamView.vue` to resolve race/class names instead of showing raw IDs.
- **`characters-view-two-column-layout`** — reflows `PlayerView.vue`'s seven stacked sections
  into two columns on desktop (collapsing to one on mobile), addressing the "long one" gap
  noted above. Deliberately does not port the legacy portrait/illustration sidebar.
- **`castes-campaign-scoping`** — adds `campaignId` to factions/castes, matching how
  races/classes are already scoped, so different campaigns can eventually have different lore
  instead of one global set.

## Not yet ported

Roughly in suggested priority order — earlier items unblock or are prerequisites for later ones:

1. **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers). Largely static lore content like the faction browser, but with a nontrivial layout (connector lines between tiers).
2. **Inventory editing.** Session inventory is currently read-only in `PlayerView.vue`; the legacy file has an interactive inventory-slot modal.
3. **Negotiation / balance mechanic.** Visual scale/balance tool from the legacy file — no equivalent yet; needs the underlying game rule clarified before it can be specified.
4. **Theme/design editor.** Legacy sidebar + design-editor modals let a user customize site colors/background/title. Lowest priority — cosmetic, not core gameplay.

Non-migration follow-ups (security, dead code, tooling) are tracked in README.md's "Known follow-ups" section instead of here, to keep this file scoped to legacy feature parity.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
