# Migration backlog

Feature-parity gap between `legacy-reference/index.html` (the pre-Vue monolith) and the current app, as of 2026-07-12. Intended to seed spec-kitty missions (`/spec-kitty.specify`) one at a time — not a commitment to build all of this at once.

## Already covered by the current app

- Auth (Google sign-in), campaign list/detail/edit (MJ/admin), role-based access control
- Team roster with live HP/mana/posture (`TeamView.vue` — legacy "État du groupe")
- Character sheet content: identity, attributes, skills, gifts, lore, session inventory (`PlayerView.vue` — legacy "Layout vitruve JDR", content-wise)
- Class/race browsing (`ClassCarouselView.vue`, `RaceCarouselView.vue`)

## Not yet ported

Roughly in suggested priority order — earlier items unblock or are prerequisites for later ones:

1. **Character creation flow.** The class/race carousels look like a first step toward creating a character, but there's no view that lets a player actually create and save one — `CharacterRepository`/`MembershipRepository` have no `create*` functions yet. Worth confirming this gap with the project owner before starting; it may already be handled by an admin seed script for now.
2. **Faction/caste browser** ("classeur" binder UI — La Rose Noire, L'Ordre du Savoir, Téméraires, Paysans, Nobles, Marchands, Fonctionnaires, Religieux). Static lore content in the legacy file; likely the most self-contained item to port.
3. **Cosmology tree** (Déïques / Légendaires / Effroyables / Rares / Communes tiers). Also largely static lore content, but with a nontrivial layout (connector lines between tiers).
4. **Functional dice roller.** `CampaignShell.vue` already has placeholder labels ("Lanceur de dés", "Dés d'Aventure") in the sidebar with no behavior wired up.
5. **Inventory editing.** Session inventory is currently read-only in `PlayerView.vue`; the legacy file has an interactive inventory-slot modal.
6. **Negotiation / balance mechanic.** Visual scale/balance tool from the legacy file — no equivalent yet; needs the underlying game rule clarified before it can be specified.
7. **Theme/design editor.** Legacy sidebar + design-editor modals let a user customize site colors/background/title. Lowest priority — cosmetic, not core gameplay.

## Notes for whoever picks these up

- Read the relevant section of `legacy-reference/index.html` for intended behavior before writing a spec — see `legacy-reference/README.md` for section pointers.
- Follow the store/repository conventions in `CLAUDE.md` (singleton composables, `if (!db)` fallback, `{ id: doc.id, ...doc.data() }` mapping) rather than introducing a new pattern.
