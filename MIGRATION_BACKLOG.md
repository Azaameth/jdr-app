# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-12. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- Character sheet content: identity, attributes, skills, gifts, lore, session inventory (`PlayerView.vue` — legacy "Layout vitruve JDR", content-wise)
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)
- **Faction/caste browser** ("classeur" binder UI — `FactionBrowserView.vue`, `/campaigns/:id/castes`). Shipped 2026-07-12 via spec-kitty mission `faction-caste-browser-01KXBRY3` — the first mission run end-to-end on this project; see README.md's "Working with spec-kitty" for the workflow and gotchas that surfaced doing it.

## Not yet ported

Roughly in suggested priority order — earlier items unblock or are prerequisites for later ones:

1. **Character creation flow.** The class/race carousels look like a first step toward creating a character, but there's no view that lets a player actually create and save one — `CharacterRepository`/`ParticipantRepository` have no `create*` functions yet. Worth confirming this gap with the project owner before starting; it may already be handled by an admin seed script for now.
2. **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers). Largely static lore content like the faction browser, but with a nontrivial layout (connector lines between tiers).
3. **Functional dice roller.** `CampaignShell.vue` already has placeholder labels ("Lanceur de dés", "Dés d'Aventure") in the sidebar with no behavior wired up.
4. **Inventory editing.** Session inventory is currently read-only in `PlayerView.vue`; the legacy file has an interactive inventory-slot modal.
5. **Negotiation / balance mechanic.** Visual scale/balance tool from the legacy file — no equivalent yet; needs the underlying game rule clarified before it can be specified.
6. **Theme/design editor.** Legacy sidebar + design-editor modals let a user customize site colors/background/title. Lowest priority — cosmetic, not core gameplay.

Non-migration follow-ups (security, dead code, tooling) are tracked in README.md's "Known follow-ups" section instead of here, to keep this file scoped to legacy feature parity.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
