# NEXTSTEPS

Increment ledger for specs that cross CLAUDE.md's high-complexity threshold (~4+ independent acceptance criteria, or spanning state/UI/cross-system coupling). One section per such spec; delete the section once the spec is fully done and merged.

## Vitruve character sheet (interactive layer)

Status: **not started** — schema/naming contract not yet locked.

Replaces `PlayerView.vue`'s read-mostly display with the full interactive gameplay surface from legacy's "Layout vitruve JDR" (`legacy-reference/index.html:2361-3350`), plus a new generalized alt-form/transformation sub-sheet (generalizing legacy's hardcoded "Furmiaou" tab).

**Schema/contract to lock first** (before any increment below starts):
- Per-campaign scoping convention (shared with negotiation/theme specs — see MIGRATION_BACKLOG.md items 4-5)
- Typed inventory schema (category enum + max-slots lookup, typed weapon/armor stat fields) — prerequisite, tracked as MIGRATION_BACKLOG.md item 2
- Alt-form/transformation data model (minimal shape validated against the one real data point — Furmiaou — before building UI against it)

**Increments** (each merged and green before the next, `/clear` between):

- [ ] (a) Dice-roll calculator as a pure, isolated function — Physique/Social/Mental categories, skill-check bonuses, ±5% modifiers, 5–95% clamp, Avantage/Désavantage. No UI dependency, highest testability — do this first.
- [ ] (b) Body-zone SVG nav + tabbed panel shell (Fiche/Caractéristiques/Dons/Inventaire/alt-form). UI-only, no new Firestore writes. Accessible/keyboard-operable regions (not legacy's click-only zones).
- [ ] (c) Firestore-synced PV/Mana pill buttons + live "État du groupe" party status. Extends `usePlayerStore.ts` / `ParticipantRepository.ts` — needs the Phase 2.1 characterization tests in place first.
- [ ] (d) Alt-form/transformation tab, built against the locked data model from above.

## (template for the next high-complexity spec)

Copy this section's shape when the next spec crosses the threshold: Status line, schema/contract-to-lock list, increment checklist.
