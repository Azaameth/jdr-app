# Implementation Plan: Faction/Caste Browser

**Branch**: `faction-caste-browser-01KXBRY3` | **Date**: 2026-07-12 | **Spec**: `kitty-specs/faction-caste-browser-01KXBRY3/spec.md`
**Input**: Feature specification from `kitty-specs/faction-caste-browser-01KXBRY3/spec.md`

## Summary

Port the 8-faction "classeur" (binder) browser from `legacy-reference/index.html` into a Vue view: a tabbed reference screen showing each faction/caste's title, subtitle, status badge, description, and key-facts grid. Data is Firestore-backed (a new `factions` collection), matching how `RaceCarouselView`/`ClassCarouselView` already source reference content, seeded via an extension of the existing `uploadStaticDataAdmin.mjs` admin script.

## Technical Context

**Language/Version**: TypeScript ~6.0, Vue 3.5 (`<script setup lang="ts">`)
**Primary Dependencies**: Vite 8, vue-router 5, Firebase 12 (Firestore client SDK) — no new dependencies needed
**Storage**: Firestore, new `factions` collection (static reference data, not campaign-scoped)
**Testing**: Vitest + @vue/test-utils for the tab-switching unit test; existing Playwright e2e suite untouched unless a smoke test is added
**Target Platform**: Browser (existing GitHub Pages deployment, no platform changes)
**Project Type**: Single Vue/Vite web app (no backend server — Firestore is the only "backend")
**Performance Goals**: Tab switch <100ms (pure client-side state change once data has loaded) — matches NFR-001
**Constraints**: Responsive down to 360px viewport (NFR-002); no new Firestore security-rule surface beyond what races/classes already expose (read-only public reference data)
**Scale/Scope**: 8 static records, read-only, no pagination or search needed

## Charter Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.kittify/charter/charter.md`:
- **Testing Standards** — plan includes a Vitest unit test for tab-switching (FR-001); type-check and lint are non-negotiable per Quality Gates. ✅
- **Project Directive 3** (follow existing conventions) — repository function follows the `if (!db) return …` graceful-fallback pattern; no new store needed since this is stateless reference data fetched once on mount (no cross-view shared state to justify a singleton composable). ✅
- **Project Directive 4** (legacy-reference is a behavior spec) — spec.md content ported from `legacy-reference/index.html` lines ~1157–1342, not invented. ✅
- **Project Directive 5** (French user-facing strings) — all faction copy stays in French, loading/error strings match existing tone (see `RaceCarouselView.vue`). ✅
- **Branch Strategy** — this mission runs on `dev` via spec-kitty's mission workflow, not a direct commit to `main`. ✅

No violations — Complexity Tracking section not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/faction-caste-browser-01KXBRY3/
├── spec.md               # Feature specification (done)
├── plan.md               # This file
└── tasks/                # Phase 2 output (spec-kitty tasks command)
```

### Source Code (repository root)

This is a single Vue/Vite app with Firestore as its only backend — no frontend/backend split. New/changed files:

```
src/
├── models/
│   ├── types/
│   │   └── Faction.ts                    # NEW — Faction interface (id, icon, title, subtitle, badge, accent, description, facts[])
│   └── repositories/
│       └── FactionRepository.ts          # NEW — listFactions(): Promise<Faction[]>, if (!db) return [] fallback
├── views/
│   └── FactionBrowserView.vue            # NEW — tabbed browser, rendered inside CampaignShell
├── components/layout/
│   └── CampaignShell.vue                 # MODIFIED — add "Castes" sidebar link
└── router/
    └── index.ts                          # MODIFIED — add /campaigns/:id/castes route

scripts/
├── data/
│   └── factions.json                     # NEW — 8 factions ported from legacy-reference/index.html
└── uploadStaticDataAdmin.mjs             # MODIFIED — also upload factions.json to the factions collection
```

**Structure Decision**: Follows the existing single-project layout exactly (`src/models/types`, `src/models/repositories`, `src/views`, `src/router`) — no new top-level directories, no new architectural pattern.

## Implementation Concern Map

Not included — this mission is a single self-contained concern (one collection, one repository, one view, one route, one sidebar entry), not multiple distinct architectural areas. `/spec-kitty.tasks` can decompose it directly into work packages without an intermediate concern map.
