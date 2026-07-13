# Implementation Plan: Castes Campaign Scoping

**Branch**: `castes-campaign-scoping-01KXE6PP` | **Date**: 2026-07-13 | **Spec**: `kitty-specs/castes-campaign-scoping-01KXE6PP/spec.md`
**Input**: Feature specification from `kitty-specs/castes-campaign-scoping-01KXE6PP/spec.md`

## Summary

Add `campaignId` to the `Faction` type and Firestore documents, change
`FactionRepository.listFactions()` to `listFactionsByCampaign(campaignId)` matching
`RaceRepository`/`ClassRepository`'s exact query shape, update `FactionBrowserView.vue` to pass
its already-resolved `campaignId` through, and change `uploadStaticDataAdmin.mjs` to stamp
`campaignId` on factions and scope its clear-before-write to that campaign only (not the whole
collection, to avoid one campaign's seed run deleting another's factions).

## Technical Context

**Language/Version**: TypeScript ~6.0, Vue 3.5 (`<script setup lang="ts">`), Node.js (admin script, `firebase-admin`)
**Primary Dependencies**: No new dependencies — reuses `firebase/firestore` client SDK and `firebase-admin/firestore`
**Storage**: Firestore `factions` collection — additive field (`campaignId`), no removal of existing fields (NFR-001)
**Testing**: Vitest — update the existing `FactionBrowserView.spec.ts` mock to assert `listFactionsByCampaign` is called with the resolved `campaignId`; no e2e changes needed (route/auth-guard behavior unchanged, `e2e/castes.spec.ts` already covers that)
**Target Platform**: Browser (client query change) + Node admin script (seed change)
**Project Type**: Single Vue/Vite web app plus its existing admin scripts directory
**Performance Goals**: None beyond charter defaults — same query shape/cost as races/classes already have
**Constraints**: No production data migration script (C-002); Firestore rules unchanged (C-003); existing 8 factions' content unchanged (NFR-001)
**Scale/Scope**: One repository function signature change, one view call-site update, one admin script's faction-handling block — small, contained mission

## Charter Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.kittify/charter/charter.md`:
- **Testing Standards** — existing `FactionBrowserView.spec.ts` updated (not a new file) since the repository call signature it mocks changes; charter's Vitest requirement satisfied by the update. ✅
- **Quality Gates** — type-check/lint/unit non-negotiable; this mission does not touch routing or add a new full view (it modifies an existing shipped view's data-fetch call and a repository), so charter's e2e requirement ("routing, auth, or a full view") is not newly triggered — existing `e2e/castes.spec.ts` coverage stands unchanged. ✅
- **Project Directive 3** (existing conventions) — `listFactionsByCampaign` copies `RaceRepository`/`ClassRepository`'s exact `where('campaignId', '==', campaignId)` pattern verbatim (C-001), no new pattern introduced. ✅
- **Project Directive 4** (legacy-reference as behavior spec) — not applicable here; this mission modifies a prior spec-kitty-authored decision (faction-caste-browser's own data-model.md), not a legacy-porting decision — the reversal and its rationale are documented in spec.md's Assumptions section rather than silently overridden. ✅
- **Branch Strategy** — mission workflow via spec-kitty worktree. ✅

No violations — Complexity Tracking section not needed.

## Project Structure

### Documentation (this mission)

```
kitty-specs/castes-campaign-scoping-01KXE6PP/
├── spec.md               # Feature specification (done)
├── plan.md               # This file
└── tasks/                # Phase 2 output (spec-kitty tasks command)
```

### Source Code (repository root)

```
src/
├── models/
│   ├── types/
│   │   └── Faction.ts                      # MODIFIED — add campaignId: string
│   └── repositories/
│       └── FactionRepository.ts            # MODIFIED — listFactions() -> listFactionsByCampaign(campaignId)
└── views/
    ├── FactionBrowserView.vue              # MODIFIED — pass campaignId.value to the renamed call
    └── __tests__/
        └── FactionBrowserView.spec.ts       # MODIFIED — mock updated to the new call signature

scripts/
└── uploadStaticDataAdmin.mjs               # MODIFIED — stamp campaignId on factions; scope faction clearing to that campaignId instead of clearing the whole collection
```

**Structure Decision**: Follows the existing single-project layout exactly — no new
directories, mirrors the races/classes pattern file-for-file.

## Implementation Concern Map

Not included — this mission touches one collection end-to-end (type → repository → view →
seed script) as a single self-contained concern, same rationale as the two-column-layout
mission's plan.md: `/spec-kitty.tasks` can decompose directly into a single work package.
