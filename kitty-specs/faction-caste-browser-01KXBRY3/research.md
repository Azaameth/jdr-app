# Research: Faction/Caste Browser

This mission has no external unknowns — it ports existing content into an established architecture. "Research" here means confirming which existing pattern to reuse and where the source content lives, not investigating new technology.

## Decisions

### D1: Data storage — Firestore collection, not bundled JSON

**Decision**: Store factions in a new Firestore `factions` collection, fetched client-side, matching `RaceCarouselView.vue`/`ClassCarouselView.vue`.

**Rationale**: `RaceCarouselView.vue` and `ClassCarouselView.vue` already establish the pattern for exactly this kind of content (static reference data, not campaign-specific) — querying Firestore directly rather than importing a bundled JSON file. Introducing a second pattern for the same category of content (reference lore) would fragment the codebase for no benefit.

**Alternative considered**: Bundle `factions.json` directly into the frontend (import it as a module, no Firestore round-trip). Rejected — faster for this one feature in isolation, but inconsistent with races/classes, and loses the existing admin-seed workflow (`uploadStaticDataAdmin.mjs`) that already exists for this category of content.

**Evidence**: `src/views/RaceCarouselView.vue` (Firestore query on mount), `scripts/uploadStaticDataAdmin.mjs` (existing seed script for races/classes).

### D2: No new dependencies

**Decision**: No new npm packages. Tabs are plain Vue reactive state (`ref<number>` for the active index) plus conditional rendering — no tab/carousel library needed for 8 static items.

**Rationale**: The existing stack (Vue 3, Firebase client SDK, vue-router) covers everything this feature needs. `RaceCarouselView.vue` already demonstrates hand-rolled carousel/index state without a library.

### D3: Content source of truth

**Decision**: `legacy-reference/index.html` lines 1157–1342 (the `#s-castes` section) is the sole content source. Transcribe faithfully — title, subtitle, badge text, description, and key-facts labels/values — rather than paraphrasing.

**Evidence**: See `research/source-register.csv` and `research/evidence-log.csv` for the exact lines read.

### D4: Real `<button>` tabs instead of legacy `onclick` divs

**Decision**: Implement tabs as real `<button>` elements with click handlers, not the legacy version's `<div onclick="openFiche(...)">`.

**Rationale**: Deliberate accessibility improvement (keyboard focus, screen readers) — the legacy markup predates this app's Vue conventions and isn't something to preserve. Content fidelity (C-003 in spec.md) applies to the lore text, not the legacy DOM structure.

## Open Questions

- **Firestore security rules for the new `factions` collection**: not investigated as part of this mission — flagged as a risk in the WP01 prompt (`tasks/WP01-faction-caste-browser.md`). If reads fail despite seeded data, check rules before assuming a code bug.
- **Deep-linking to a specific tab**: explicitly out of scope for this pass (see spec.md Edge Cases) — noted here as a candidate follow-up mission, not a blocker.
